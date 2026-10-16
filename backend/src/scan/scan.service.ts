import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

import {
  ScanResponseDto,
  ExtractedPackagingDto,
  VerificationCheckDto,
  MultilingualExplanationsDto,
} from './dto/scan-response.dto';
import { SupportedLanguage } from './dto/scan-request.dto';


@Injectable()
export class ScanService {
  private readonly logger = new Logger(ScanService.name);
  private readonly mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';

  constructor(private readonly prisma: PrismaService) {}

  async processScan(
    cartonImage: Express.Multer.File,
    blisterImage?: Express.Multer.File,
    lang: SupportedLanguage = 'en',
  ): Promise<ScanResponseDto> {
    const startTime = Date.now();
    const scanId = `sc_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const imageHash = crypto.createHash('sha256').update(cartonImage.buffer).digest('hex');

    // 1. Call ML vision extractor microservice
    let mlExtraction: {
      extracted: ExtractedPackagingDto;
      blister_extracted?: ExtractedPackagingDto | null;
    } = await this.callMlService(cartonImage, blisterImage);

    const extracted = mlExtraction.extracted;
    const blisterExtracted = mlExtraction.blister_extracted;

    // 2. Normalize extracted identifiers
    const rawReg = extracted.reg_no.value?.trim() || '';
    const normalizedReg = this.normalizeRegNo(rawReg);
    const rawProdName = extracted.product_name.value?.trim() || '';
    const rawBatch = extracted.batch_no.value?.trim() || '';
    const normalizedBatch = this.normalizeBatchNo(rawBatch);

    // 3. Database lookup in NAFDAC Greenbook registry
    let registeredProduct: any = null;
    if (normalizedReg && extracted.reg_no.confidence >= 0.6) {
      registeredProduct = await this.prisma.product.findUnique({
        where: { regNo: normalizedReg },
      });

      // Secondary fallback search if exact formatted match missed (e.g. spacing differences)
      if (!registeredProduct) {
        const altReg = normalizedReg.replace(/[^A-Z0-9]/g, '');
        const candidate = await this.prisma.product.findFirst({
          where: {
            regNo: {
              contains: altReg.slice(-6),
            },
          },
        });
        if (candidate && this.normalizeRegNo(candidate.regNo) === normalizedReg) {
          registeredProduct = candidate;
        }
      }
    }

    // 4. Batch risk query
    let batchRecord: any = null;
    if (normalizedBatch) {
      batchRecord = await this.prisma.batch.findUnique({
        where: { batchNo: normalizedBatch },
      });
    }

    // 5. Verification Checks Execution
    const checks: VerificationCheckDto[] = [];

    // Check 1: reg_exists
    if (!normalizedReg || extracted.reg_no.confidence < 0.6) {
      checks.push({
        id: 'reg_exists',
        pass: null,
        detail: 'Registration number unreadable or missing from photo',
      });
    } else if (registeredProduct) {
      checks.push({
        id: 'reg_exists',
        pass: true,
        detail: `Found in NAFDAC registry: ${registeredProduct.regNo}`,
      });
    } else {
      checks.push({
        id: 'reg_exists',
        pass: false,
        detail: `Registration number ${rawReg} not found in NAFDAC Greenbook`,
      });
    }

    // Check 2: reg_matches_prod (The cloned-number detector)
    if (!registeredProduct) {
      checks.push({
        id: 'reg_matches_prod',
        pass: null,
        detail: 'Cannot match product name without verified registration record',
      });
    } else if (!rawProdName || extracted.product_name.confidence < 0.6) {
      checks.push({
        id: 'reg_matches_prod',
        pass: null,
        detail: `Registered to: ${registeredProduct.name} (packaging product name unclear)`,
      });
    } else {
      const matchScore = this.computeStringMatch(rawProdName, registeredProduct.name);
      if (matchScore >= 0.5) {
        checks.push({
          id: 'reg_matches_prod',
          pass: true,
          detail: `Registration matches: ${registeredProduct.name}`,
        });
      } else {
        // Cloned registration alert!
        checks.push({
          id: 'reg_matches_prod',
          pass: false,
          detail: `Number belongs to ${registeredProduct.name}, but pack says ${rawProdName}`,
        });
      }
    }

    // Check 3: dates_valid
    const expiryVal = extracted.expiry.value;
    if (!expiryVal || extracted.expiry.confidence < 0.6) {
      checks.push({
        id: 'dates_valid',
        pass: null,
        detail: 'Expiry date missing or unreadable',
      });
    } else {
      const isExpired = this.isDateExpired(expiryVal);
      if (isExpired === true) {
        checks.push({
          id: 'dates_valid',
          pass: false,
          detail: `Product expired (${expiryVal})`,
        });
      } else if (isExpired === false) {
        checks.push({
          id: 'dates_valid',
          pass: true,
          detail: `Expiry in the future (${expiryVal})`,
        });
      } else {
        checks.push({
          id: 'dates_valid',
          pass: null,
          detail: `Could not parse date format: ${expiryVal}`,
        });
      }
    }

    // Check 4: carton_vs_blister
    if (!blisterImage || !blisterExtracted) {
      checks.push({
        id: 'carton_vs_blister',
        pass: null,
        detail: 'No blister photo supplied',
      });
    } else {
      const blisterBatch = blisterExtracted.batch_no?.value?.trim();
      const blisterExpiry = blisterExtracted.expiry?.value?.trim();
      let match = true;
      let mismatchDetail = '';

      if (rawBatch && blisterBatch && this.normalizeBatchNo(rawBatch) !== this.normalizeBatchNo(blisterBatch)) {
        match = false;
        mismatchDetail = `Carton batch (${rawBatch}) does not match blister strip (${blisterBatch})`;
      } else if (expiryVal && blisterExpiry && expiryVal !== blisterExpiry) {
        match = false;
        mismatchDetail = `Carton expiry (${expiryVal}) differs from blister strip (${blisterExpiry})`;
      }

      if (!match) {
        checks.push({
          id: 'carton_vs_blister',
          pass: false,
          detail: mismatchDetail,
        });
      } else {
        checks.push({
          id: 'carton_vs_blister',
          pass: true,
          detail: 'Carton packaging matches inner blister strip details',
        });
      }
    }

    // Check 5: batch_reports
    const reportCount = batchRecord ? batchRecord.reportCount : 0;
    const batchScore = batchRecord ? batchRecord.score : 0.1;
    if (reportCount === 0) {
      checks.push({
        id: 'batch_reports',
        pass: true,
        detail: '0 reports on this batch',
      });
    } else if (reportCount < 3 && batchScore < 0.7) {
      checks.push({
        id: 'batch_reports',
        pass: null,
        detail: `${reportCount} community report(s) noted for this batch (monitoring)`,
      });
    } else {
      checks.push({
        id: 'batch_reports',
        pass: false,
        detail: `${reportCount} crowd reports on this batch — Elevated risk flag`,
      });
    }

    // 6. Calculate 3-Tier Verdict
    let verdict: 'green' | 'amber' | 'red' = 'green';

    const regMatchCheck = checks.find((c) => c.id === 'reg_matches_prod');
    const batchCheck = checks.find((c) => c.id === 'batch_reports');
    const dateCheck = checks.find((c) => c.id === 'dates_valid');
    const blisterCheck = checks.find((c) => c.id === 'carton_vs_blister');
    const regExistsCheck = checks.find((c) => c.id === 'reg_exists');

    if (
      regMatchCheck?.pass === false ||
      batchCheck?.pass === false ||
      dateCheck?.pass === false ||
      blisterCheck?.pass === false
    ) {
      verdict = 'red';
    } else if (
      regExistsCheck?.pass === false ||
      regExistsCheck?.pass === null ||
      regMatchCheck?.pass === null ||
      extracted.reg_no.confidence < 0.7 ||
      batchCheck?.pass === null
    ) {
      verdict = 'amber';
    } else {
      verdict = 'green';
    }

    // 7. Explanations in 5 Nigerian Languages (zero-latency UI switching)
    const explanations = this.generateMultilingualExplanations(
      verdict,
      checks,
      rawProdName,
      registeredProduct?.name,
      rawBatch,
    );
    const activeExplanation = explanations[lang as keyof typeof explanations] || explanations.en;

    // Next step guidance
    let nextStep = 'Verify MAS scratch code if available on packaging.';
    if (verdict === 'red') {
      nextStep = 'Do not consume. Show this pack to a licensed pharmacist or report to NAFDAC immediately.';
    } else if (verdict === 'amber') {
      nextStep = 'Consult a certified pharmacist to verify packaging security markings and batch legitimacy.';
    }

    const elapsedMs = Date.now() - startTime;

    // 8. Persist scan in database
    try {
      await this.prisma.scan.create({
        data: {
          id: scanId,
          imageHash,
          extracted: JSON.stringify(extracted),
          checks: JSON.stringify(checks),
          verdict,
          lang,
          latencyMs: elapsedMs,
        },
      });
    } catch (dbErr) {
      this.logger.warn(`Failed to log scan to DB: ${dbErr}`);
    }

    return {
      scan_id: scanId,
      extracted,
      checks,
      verdict,
      explanation: activeExplanation,
      explanations,
      next_step: nextStep,
      batch_risk: {
        batch_no: rawBatch || 'UNKNOWN',
        reports: reportCount,
        score: batchScore,
      },
    };
  }

  private async callMlService(
    cartonImage: Express.Multer.File,
    blisterImage?: Express.Multer.File,
  ): Promise<{
    extracted: ExtractedPackagingDto;
    blister_extracted?: ExtractedPackagingDto | null;
  }> {
    try {
      const formData = new FormData();
      const cartonBlob = new Blob([new Uint8Array(cartonImage.buffer)], {
        type: cartonImage.mimetype || 'image/jpeg',
      });
      formData.append('image', cartonBlob, cartonImage.originalname || 'carton.jpg');

      if (blisterImage) {
        const blisterBlob = new Blob([new Uint8Array(blisterImage.buffer)], {
          type: blisterImage.mimetype || 'image/jpeg',
        });
        formData.append('blister', blisterBlob, blisterImage.originalname || 'blister.jpg');
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12-second budget

      const response = await fetch(`${this.mlServiceUrl}/extract`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`ML service responded with HTTP ${response.status}`);
      }

      const data = await response.json();
      return {
        extracted: data.extracted || this.emptyExtraction(),
        blister_extracted: data.blister_extracted || null,
      };
    } catch (err) {
      this.logger.error(`Error calling ML vision service at ${this.mlServiceUrl}: ${err}`);
      return {
        extracted: this.emptyExtraction(),
        blister_extracted: null,
      };
    }
  }

  private emptyExtraction(): ExtractedPackagingDto {
    return {
      reg_no: { value: null, confidence: 0.0 },
      product_name: { value: null, confidence: 0.0 },
      manufacturer: { value: null, confidence: 0.0 },
      batch_no: { value: null, confidence: 0.0 },
      expiry: { value: null, confidence: 0.0 },
    };
  }

  private normalizeRegNo(reg: string): string {
    return reg
      .toUpperCase()
      .replace(/\s+/g, '')
      .replace(/–|—/g, '-');
  }

  private normalizeBatchNo(batch: string): string {
    return batch
      .toUpperCase()
      .replace(/\s+/g, '')
      .replace(/[^A-Z0-9]/g, '');
  }

  private computeStringMatch(a: string, b: string): number {
    const cleanA = a.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
    const cleanB = b.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();

    if (cleanA === cleanB) return 1.0;
    if (cleanA.includes(cleanB) || cleanB.includes(cleanA)) return 0.85;

    const wordsA = new Set(cleanA.split(/\s+/).filter((w) => w.length > 2));
    const wordsB = new Set(cleanB.split(/\s+/).filter((w) => w.length > 2));

    if (wordsA.size === 0 || wordsB.size === 0) return 0.0;

    let matches = 0;
    for (const w of wordsA) {
      if (wordsB.has(w)) matches++;
    }

    return matches / Math.max(wordsA.size, wordsB.size);
  }

  private isDateExpired(dateStr: string): boolean | null {
    try {
      let year: number | null = null;
      let month: number | null = null;

      // Match YYYY-MM or YYYY/MM
      const yFirst = dateStr.match(/(\d{4})[-/.](\d{1,2})/);
      if (yFirst) {
        year = parseInt(yFirst[1], 10);
        month = parseInt(yFirst[2], 10);
      } else {
        // Match MM-YYYY or MM/YYYY
        const mFirst = dateStr.match(/(\d{1,2})[-/.](\d{4})/);
        if (mFirst) {
          month = parseInt(mFirst[1], 10);
          year = parseInt(mFirst[2], 10);
        }
      }

      if (!year) return null;

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      if (year < currentYear) return true;
      if (year === currentYear && month !== null && month < currentMonth) return true;
      return false;
    } catch {
      return null;
    }
  }

  private generateMultilingualExplanations(
    verdict: 'green' | 'amber' | 'red',
    checks: VerificationCheckDto[],
    productName: string,
    registeredName?: string,
    batchNo?: string,
  ): MultilingualExplanationsDto {
    const regMatchCheck = checks.find((c) => c.id === 'reg_matches_prod');
    const batchCheck = checks.find((c) => c.id === 'batch_reports');
    const dateCheck = checks.find((c) => c.id === 'dates_valid');
    const blisterCheck = checks.find((c) => c.id === 'carton_vs_blister');

    if (verdict === 'red') {
      if (regMatchCheck?.pass === false) {
        return {
          en: `Critical Alert: The registration number printed on this packaging belongs to ${registeredName || 'another drug'} in the NAFDAC Greenbook, but the pack says ${productName || 'a different product'}. Suspected cloned registration.`,
          yo: `Ìkìlọ̀ Pàjáwìrì: Nọ́mbà ìforúkọsílẹ̀ lórí àpótí yìí jẹ́ ti ${registeredName || 'oògùn mìíràn'} nínú àkọsílẹ̀ NAFDAC, ṣùgbọ́n àpótí sọ pé ${productName || 'oògùn ọ̀tọ̀'}. Ìfura wà pé wọ́n jí nọ́mbà náà lò.`,
          ha: `Gargadi Mai Karfi: Wannan lambar rajista ta ${registeredName || 'wani magani daban'} ce a cikin bayanan NAFDAC, amma an rubuta ${productName || 'wani magani'} a jikin kwalin. Ana zargin an kwaikwayi lambar ne.`,
          ig: `Ịdọ aka ná ntị dị mkpa: Nọmba ndebanye aha a bụ nke ${registeredName || 'ọgwụ ọzọ'} na ndekọ NAFDAC, mana ngwugwu na-ekwu ${productName || 'ọgwụ dị iche'}. Enwere enyo na e ji aka mere ya.`,
          pcm: `Danger Alert: Dis registration number na for ${registeredName || 'different medicine'} inside NAFDAC Greenbook, but the pack write ${productName || 'another thing'}. Person don duplicate legit number put for fake pack.`,
        };
      }

      if (batchCheck?.pass === false) {
        return {
          en: `Alert: Batch ${batchNo || ''} has multiple adverse reports filed by verified community members and pharmacies. Elevated risk detected.`,
          yo: `Ìkìlọ̀: Àwọn ará ìlú àti àwọn oníṣègùn ti fi ẹ̀sùn púpọ̀ kan ìpín oògùn (batch ${batchNo || ''}) yìí pé kò dára. Ewu wà nínú rẹ̀.`,
          ha: `Gargadi: Wannan rukuni (batch ${batchNo || ''}) yana da rahotannin rashin inganci da dama daga al'umma da masu harhada magunguna.`,
          ig: `Ịdọ aka ná ntị: Ngwugwu a (batch ${batchNo || ''}) nwere ọtụtụ akụkọ na ọ dịghị mma site n'aka ndị obodo na ndị na-ere ọgwụ.`,
          pcm: `Wahala Alert: Dis batch ${batchNo || ''} get plenty bad reports from people and pharmacy say something seriously wrong with am.`,
        };
      }

      if (dateCheck?.pass === false) {
        return {
          en: 'Warning: This product has passed its declared expiration date. Expired medicines lose potency and may cause toxicity.',
          yo: 'Ìkìlọ̀: Ọjọ́ orí oògùn yìí ti kọjá (ó ti bàjẹ́). Oògùn tí ó ti bàjẹ́ kò ní agbára mọ́ ó sì lè pani lára.',
          ha: 'Gargadi: Wannan maganin ya wuce ranar karewar amfaninsa. Maganin da ya dade ba shi da aiki kuma zai iya zama guba.',
          ig: 'Ịdọ aka ná ntị: Ọgwụ a agafeela ụbọchị mmebi ya. Ọgwụ mebiri emebi adịghị arụ ọrụ nke ọma ma nwee ike imerụ ahụ.',
          pcm: 'Warning: Dis medicine don expire. Expired medicine no dey work and e fit give person sickness or poison.',
        };
      }

      if (blisterCheck?.pass === false) {
        return {
          en: 'Packaging Mismatch: Batch number or expiry date on the outer carton contradicts the inner blister strip.',
          yo: 'Àpótí Kò Bá Nǹkan Inú Mu: Nọ́mbà batch tàbí ọjọ́ orí lórí àpótí kò bá ti inú blister mu.',
          ha: 'Kuskure a Marufi: Lambar rukuni ko ranar karewa a kwalin waje ba ta zo daya da ta ciki ba.',
          ig: 'Ihe ngwugwu adabaghị: Nọmba ngwugwu ma ọ bụ ụbọchị mmebi na igbe dị iche na nke dị n\'ime blister.',
          pcm: 'Packaging No Match: The batch number or expiry date on top carton no match wetin dey inside the blister strip.',
        };
      }

      return {
        en: 'Warning: Verification failed. The details on this packaging contradict verified records.',
        yo: 'Ìkìlọ̀: Ìmúdájú kùnà. Àwọn kókó ọ̀rọ̀ lórí àpótí yìí tako àkọsílẹ̀.',
        ha: 'Gargadi: Binciken ya nuna kuskure. Bayanan da ke jikin marufin sun saba wa bayanan hukuma.',
        ig: 'Ịdọ aka ná ntị: Nnyocha adaala. Ihe ndị dị na ngwugwu a emegidela ndekọ ndị a ma ama.',
        pcm: 'Warning: Check fail. Wetin dey this pack contradict the official records.',
      };
    }

    if (verdict === 'amber') {
      return {
        en: 'Unverified: Registration details could not be matched with certainty in the current NAFDAC snapshot. Confirm with a licensed pharmacist.',
        yo: 'Kò tíì fọwọ́ sí: A kò tíì rí ẹ̀rí dájú nínú àkọsílẹ̀ NAFDAC fún àpótí yìí. Fọ̀rọ̀ wá oníṣègùn lẹ́nu wò.',
        ha: 'Ba a tantance ba: Ba a sami tabbacin bayanan rajista a cikin bayanan NAFDAC ba. Tuntubi kwararren mai magani.',
        ig: 'A kwadoghị ya: Enweghị ike ijide n\'aka na ndekọ NAFDAC maka ngwugwu a. Gwa onye na-ere ọgwụ nwere ikikere ka o lelee ya.',
        pcm: 'We never verify am: We no fit confirm this registration number full-full inside current NAFDAC record. Abeg ask real pharmacist make dem look am.',
      };
    }

    // Default green: No red flags found (never claim chemical purity)
    return {
      en: 'No red flags found. Registration number matches NAFDAC Greenbook records and packaging dates are valid.',
      yo: 'Kò sí àmì ewu kankan tí a rí. Nọ́mbà ìforúkọsílẹ̀ bá àkọsílẹ̀ NAFDAC mu, ọjọ́ orí àpótí sì péye.',
      ha: 'Babu wata alamar hadari da aka samu. Lambar rajista ta yi daidai da bayanan NAFDAC kuma kwanan wata yana da kyau.',
      ig: 'Enweghị ihe egwu ọ bụla ahụrụ. Nọmba ndebanye aha dabara na ndekọ NAFDAC, ụbọchị ngwugwu dịkwa mma.',
      pcm: 'No red flag dey at all. The registration number match NAFDAC Greenbook record well-well and the expiry date still good.',
    };
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { VerificationCheckDto, ExtractedPackagingDto } from './dto/scan-response.dto';

export interface ExplanationResult {
  explanation: string;
  next_step: string;
}

@Injectable()
export class ExplainerService {
  private readonly logger = new Logger(ExplainerService.name);
  private readonly apiKey = process.env.GEMINI_API_KEY_2 || process.env.GEMINI_API_KEY;
  private readonly models = [
    process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    'gemini-3.5-flash-lite',
  ];

  async explain(
    verdict: 'green' | 'amber' | 'red',
    checks: VerificationCheckDto[],
    extracted: ExtractedPackagingDto,
    registeredProduct?: { name: string; manufacturer?: string | null; regNo: string } | null,
  ): Promise<ExplanationResult> {
    if (!this.apiKey) {
      this.logger.warn('GEMINI_API_KEY_2 not configured. Using deterministic fallback explanation.');
      return this.fallbackExplanation(verdict, checks, extracted, registeredProduct);
    }

    const prompt = this.buildPrompt(verdict, checks, extracted, registeredProduct);

    for (const model of this.models) {
      try {
        const result = await this.callGemini(model, prompt);
        if (result && result.explanation && result.next_step) {
          return result;
        }
      } catch (err) {
        this.logger.warn(`Model ${model} failed for explanation: ${err}`);
      }
    }

    this.logger.warn('All Gemini models exhausted for explanation. Falling back to default.');
    return this.fallbackExplanation(verdict, checks, extracted, registeredProduct);
  }

  private buildPrompt(
    verdict: 'green' | 'amber' | 'red',
    checks: VerificationCheckDto[],
    extracted: ExtractedPackagingDto,
    registeredProduct?: { name: string; manufacturer?: string | null; regNo: string } | null,
  ): string {
    return `You are Genium's medication and consumer food verification AI agent in Nigeria.
Your job is to explain the verification findings to a consumer in clear, empathetic, plain English that is easy to understand.

FINDINGS:
- Overall Verdict: ${verdict.toUpperCase()} (green = no red flags found; amber = unverified or suspicious; red = failed critical check)
- Extracted Packaging Details:
  * Product Name: ${extracted.product_name?.value || 'Unclear'} (confidence: ${extracted.product_name?.confidence})
  * Registration Number: ${extracted.reg_no?.value || 'Unclear'} (confidence: ${extracted.reg_no?.confidence})
  * Manufacturer: ${extracted.manufacturer?.value || 'Unclear'}
  * Batch Number: ${extracted.batch_no?.value || 'Unclear'}
  * Expiry Date: ${extracted.expiry?.value || 'Unclear'}
- Official NAFDAC Registry Record: ${
      registeredProduct
        ? `Found: "${registeredProduct.name}" by "${registeredProduct.manufacturer || 'Unknown'}" (Reg: ${registeredProduct.regNo})`
        : 'Not found in registry'
    }
- Deterministic Checks:
${checks.map((c) => `  * [${c.id}] pass=${c.pass} detail="${c.detail}"`).join('\n')}

GUIDELINES:
1. Explain what these findings mean in 2 to 3 clear, simple sentences.
2. Ground yourself STRICTLY in the checks above. Never invent facts, make up chemical test results, or diagnose medical conditions.
3. Language policy:
   - For RED: If the registration belongs to another drug (e.g. Paracetamol number on an antibiotic or different brand), clearly explain that the NAFDAC number is registered to a completely different product, indicating a stolen or cloned registration.
   - For AMBER: If not in the registry, explain that this number could not be confirmed in the current NAFDAC snapshot and requires pharmacist confirmation.
   - For GREEN: State that no red flags were found and records match, but NEVER claim 100% chemical purity. Remind them to check seals.
4. Next Step: Provide one actionable, practical next step for the consumer.
5. Return ONLY a valid JSON object matching this structure:
{
  "explanation": "string",
  "next_step": "string"
}`;
  }

  private async callGemini(model: string, prompt: string): Promise<ExplanationResult> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8-second budget

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error('Empty response from model');
      }

      const parsed = JSON.parse(rawText.trim());
      return {
        explanation: String(parsed.explanation || '').trim(),
        next_step: String(parsed.next_step || '').trim(),
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  private fallbackExplanation(
    verdict: 'green' | 'amber' | 'red',
    checks: VerificationCheckDto[],
    extracted: ExtractedPackagingDto,
    registeredProduct?: { name: string; manufacturer?: string | null; regNo: string } | null,
  ): ExplanationResult {
    const regMatchCheck = checks.find((c) => c.id === 'reg_matches_prod');
    const batchCheck = checks.find((c) => c.id === 'batch_reports');
    const dateCheck = checks.find((c) => c.id === 'dates_valid');
    const blisterCheck = checks.find((c) => c.id === 'carton_vs_blister');

    if (verdict === 'red') {
      if (regMatchCheck?.pass === false) {
        return {
          explanation: `Critical Alert: The registration number printed on this packaging belongs to ${registeredProduct?.name || 'another registered product'} in the NAFDAC Greenbook, but the pack says ${extracted.product_name?.value || 'a different product'}. This indicates a cloned or fraudulent registration.`,
          next_step: 'Do not consume this product. Show this pack to a licensed pharmacist or report it to NAFDAC immediately.',
        };
      }
      if (batchCheck?.pass === false) {
        return {
          explanation: `Quality Alert: Batch ${extracted.batch_no?.value || ''} has multiple adverse reports filed by verified community members and pharmacies. Elevated risk detected.`,
          next_step: 'Do not consume this product. Consult a licensed pharmacist or file a report with NAFDAC.',
        };
      }
      if (dateCheck?.pass === false) {
        return {
          explanation: 'Warning: This product has passed its declared expiration date. Expired medicines and foods lose potency and can cause toxicity.',
          next_step: 'Dispose of this pack safely or return it to the point of purchase.',
        };
      }
      if (blisterCheck?.pass === false) {
        return {
          explanation: 'Packaging Mismatch: Batch number or expiry date on the outer box contradicts the inner blister strip, indicating tampering.',
          next_step: 'Do not use this pack. Take it to a licensed pharmacist for inspection.',
        };
      }
      return {
        explanation: 'Warning: Verification failed. The details on this packaging contradict official records.',
        next_step: 'Do not consume. Seek advice from a licensed pharmacist or contact NAFDAC.',
      };
    }

    if (verdict === 'amber') {
      return {
        explanation: `Unverified: The registration number ${extracted.reg_no?.value || ''} could not be confirmed in the current NAFDAC snapshot.`,
        next_step: 'Confirm with a licensed pharmacist before use to verify packaging security markings and batch legitimacy.',
      };
    }

    // Green
    return {
      explanation: 'No red flags found. The registration number matches official NAFDAC records and packaging dates are valid.',
      next_step: 'Verify the NAFDAC MAS scratch code if available on the packaging to complete verification.',
    };
  }
}

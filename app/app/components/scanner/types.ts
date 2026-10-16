export type LanguageKey = "en" | "yo" | "ha" | "ig" | "pcm";

export interface ExtractedField {
  value: string | null;
  confidence: number;
}

export interface VerificationCheck {
  id: string;
  pass: boolean | null;
  detail: string;
}

export interface BackendScanResponse {
  scan_id: string;
  extracted: {
    reg_no: ExtractedField;
    product_name: ExtractedField;
    manufacturer: ExtractedField;
    batch_no: ExtractedField;
    expiry: ExtractedField;
  };
  checks: VerificationCheck[];
  verdict: "green" | "amber" | "red";
  explanation: string;
  next_step: string;
  batch_risk: {
    batch_no: string;
    reports: number;
    score: number;
  };
}

export interface ScanResult {
  scan_id: string;
  pack_name: string;
  verdict: "green" | "amber" | "red";
  confidence: number;
  extracted: {
    reg_no: string | ExtractedField;
    product_name: string | ExtractedField;
    manufacturer: string | ExtractedField;
    batch_no: string | ExtractedField;
    expiry: string | ExtractedField;
  };
  checks:
    | {
        reg_exists: boolean;
        reg_matches_prod: boolean;
        registered_as?: string;
        dates_valid: boolean;
        carton_vs_blister: boolean | null;
        batch_reports_count: number;
      }
    | VerificationCheck[];
  explanation?: string;
  explanations?: Partial<Record<LanguageKey, string>>;
  next_step: string;
  batch_risk: {
    batch_no: string;
    score: number;
    level?: "low" | "medium" | "high";
    reports?: number;
  };
}

export function normalizeBackendScanResponse(res: BackendScanResponse): ScanResult {
  const regNo = res.extracted.reg_no.value || "Unidentified";
  const prodName = res.extracted.product_name.value;
  const packName = prodName ? `${prodName} (${regNo})` : `Packaging (${regNo})`;

  const confValues = [
    res.extracted.reg_no.confidence,
    res.extracted.product_name.confidence,
    res.extracted.batch_no.confidence,
    res.extracted.expiry.confidence,
  ].filter((c) => typeof c === "number" && c > 0);

  const avgConfidence = confValues.length > 0
    ? confValues.reduce((a, b) => a + b, 0) / confValues.length
    : res.extracted.reg_no.confidence || 0.85;

  const riskScore = res.batch_risk.score;
  const level: "low" | "medium" | "high" =
    riskScore >= 0.7 ? "high" : riskScore >= 0.4 ? "medium" : "low";

  return {
    scan_id: res.scan_id,
    pack_name: packName,
    verdict: res.verdict,
    confidence: avgConfidence,
    extracted: res.extracted,
    checks: res.checks,
    explanation: res.explanation,
    next_step: res.next_step,
    batch_risk: {
      batch_no: res.batch_risk.batch_no,
      score: res.batch_risk.score,
      reports: res.batch_risk.reports,
      level,
    },
  };
}

export const LANGUAGE_LABELS: Record<LanguageKey, string> = {
  en: "English",
  yo: "Yorùbá",
  ha: "Hausa",
  ig: "Igbo",
  pcm: "Pidgin",
};

export const DEMO_PRESETS: Record<string, ScanResult> = {
  augmentin_clone: {
    scan_id: "sc_aug_fake",
    pack_name: "Augmentin 625mg (Cloned Reg No)",
    verdict: "red",
    confidence: 0.97,
    extracted: {
      reg_no: "A4-100137",
      product_name: "Augmentin 625mg",
      manufacturer: "GlaxoSmithKline (Purported)",
      batch_no: "B24091",
      expiry: "2027-08",
    },
    checks: {
      reg_exists: true,
      reg_matches_prod: false,
      registered_as: "Emzor Paracetamol 500mg (Emzor Pharma)",
      dates_valid: true,
      carton_vs_blister: null,
      batch_reports_count: 0,
    },
    explanations: {
      en: "Registration number A4-100137 is registered in the NAFDAC Greenbook, but belongs to Emzor Paracetamol 500mg, NOT Augmentin. This is a stolen registration on a counterfeit pack.",
      yo: "Nọmba iforukọsilẹ A4-100137 wa ninu NAFDAC Greenbook, ṣugbọn ti Emzor Paracetamol ni, kii ṣe ti Augmentin. Wọn ji nọmba naa lẹ mọ oogun ayederu yi.",
      ha: "Lambar rijista A4-100137 tana cikin kundin NAFDAC, amma ta Emzor Paracetamol ce, ba Augmentin ba. An sace lambar an manna a jikin maganin jabu.",
      ig: "Nọmba ndebanye aha A4-100137 dị na NAFDAC Greenbook, mana ọ bụ nke Emzor Paracetamol, ọ bụghị Augmentin. Emere nnomi nọmba a na ọgwụ adịgboroja.",
      pcm: "Dis NAFDAC number A4-100137 dey inside Greenbook, but na Emzor Paracetamol get am, no be Augmentin. Person don steal paracetamol number put for fake medicine.",
    },
    next_step:
      "Do not consume. Hand over pack to nearest licensed pharmacist or report to NAFDAC.",
    batch_risk: {
      batch_no: "B24091",
      score: 0.88,
      level: "high",
    },
  },
  coartem_genuine: {
    scan_id: "sc_coa_gen",
    pack_name: "Coartem 80/480mg (Genuine)",
    verdict: "green",
    confidence: 0.98,
    extracted: {
      reg_no: "04-0348",
      product_name: "Coartem 80/480mg",
      manufacturer: "Novartis Pharma AG",
      batch_no: "X1042",
      expiry: "2027-11",
    },
    checks: {
      reg_exists: true,
      reg_matches_prod: true,
      dates_valid: true,
      carton_vs_blister: true,
      batch_reports_count: 0,
    },
    explanations: {
      en: "All deterministic checks passed. Registration number 04-0348 matches Coartem by Novartis Pharma in the Greenbook, packaging is consistent, and batch X1042 has zero crowd anomaly reports.",
      yo: "Gbogbo ayẹwo ti tọ. Nọmba 04-0348 ba Coartem ti Novartis Pharma mu ninu akọsilẹ NAFDAC, ko si iroyin aburu kankan lori ipele ogun yii.",
      ha: "Dukkan bincike ya nuna daidai ne. Lambar 04-0348 ta dace da Coartem na Novartis Pharma a kundin NAFDAC, kuma babu wani korafi a kan wannan rukunin maganin.",
      ig: "Nnyocha niile zuru oke. Nọmba 04-0348 dabara na Coartem nke Novartis Pharma n'akwụkwọ NAFDAC, ọ nweghịkwa akụkọ mkpesa ọ bụla na ya.",
      pcm: "Everything check out correctly. Di NAFDAC number 04-0348 match Coartem by Novartis for Greenbook, di carton match blister, and nobody don report dis batch.",
    },
    next_step: "No red flags found. Store below 30°C in a dry place.",
    batch_risk: {
      batch_no: "X1042",
      score: 0.05,
      level: "low",
    },
  },
  amatem_amber: {
    scan_id: "sc_amat_alert",
    pack_name: "Amatem Softgel (Batch Alert)",
    verdict: "amber",
    confidence: 0.94,
    extracted: {
      reg_no: "04-2195",
      product_name: "Amatem Softgel",
      manufacturer: "Elbe Pharma Nigeria Ltd",
      batch_no: "AM2308",
      expiry: "2026-12",
    },
    checks: {
      reg_exists: true,
      reg_matches_prod: true,
      dates_valid: true,
      carton_vs_blister: true,
      batch_reports_count: 4,
    },
    explanations: {
      en: "The NAFDAC registration is valid and matches the product, BUT batch AM2308 has 4 recent crowd reports of capsule leakage and dissolution issues in Lagos and Ogun.",
      yo: "Iforukọsilẹ NAFDAC tọ, ṣugbọn awọn eniyan 4 ti fi ẹsun le batch AM2308 ni Eko ati Ogun pe oogun inu rẹ ti n bajẹ ti o si n yo.",
      ha: "Rijistar NAFDAC tana nan da kyau, amma an sami korafe-korafe guda 4 daga jama'a kan wannan batch AM2308 cewa maganin yana fashewa a jihar Legas da Ogun.",
      ig: "Ndebanye aha NAFDAC ziri ezi, mana mmadụ anọ akọpụtala na batch AM2308 na-agbaze ma na-emebi n'ime ngwugwu ya na Lagos na Ogun.",
      pcm: "Di NAFDAC number correct, but 4 people don report say dis batch AM2308 capsules dey leak and spoil inside pack for Lagos and Ogun.",
    },
    next_step:
      "Caution advised. Check with your pharmacist before taking this specific batch.",
    batch_risk: {
      batch_no: "AM2308",
      score: 0.76,
      level: "medium",
    },
  },
};

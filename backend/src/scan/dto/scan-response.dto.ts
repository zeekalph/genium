export class ExtractedFieldDto {
  value: string | null;
  confidence: number;
}

export class ExtractedPackagingDto {
  reg_no: ExtractedFieldDto;
  product_name: ExtractedFieldDto;
  manufacturer: ExtractedFieldDto;
  batch_no: ExtractedFieldDto;
  expiry: ExtractedFieldDto;
}

export class VerificationCheckDto {
  id: string;
  pass: boolean | null;
  detail: string;
}

export class MultilingualExplanationsDto {
  en: string;
  yo: string;
  ha: string;
  ig: string;
  pcm: string;
}

export class BatchRiskDto {
  batch_no: string;
  reports: number;
  score: number;
}

export class ScanResponseDto {
  scan_id: string;
  extracted: ExtractedPackagingDto;
  checks: VerificationCheckDto[];
  verdict: 'green' | 'amber' | 'red';
  explanation: string;
  explanations: MultilingualExplanationsDto;
  next_step: string;
  batch_risk: BatchRiskDto;
}

export type SupportedLanguage = 'en' | 'yo' | 'ha' | 'ig' | 'pcm';

export class ScanRequestDto {
  lang?: SupportedLanguage;
}

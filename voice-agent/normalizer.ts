const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

const replaceLocalizedDigits = (value: string) =>
  value
    .replace(/[٠-٩]/g, digit => String(ARABIC_DIGITS.indexOf(digit)))
    .replace(/[۰-۹]/g, digit => String(PERSIAN_DIGITS.indexOf(digit)));

/**
 * Normalizes one token without removing meaningful Arabic prefixes.
 * Prefix stripping in the previous version changed words such as "الطلاب"
 * and "الحضور" and reduced matching accuracy.
 */
export const normalizeWord = (word: string) =>
  replaceLocalizedDigits(String(word || ''))
    .normalize('NFKC')
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[“”„«»]/g, '"')
    .replace(/[’‘]/g, "'")
    .replace(/[^\u0600-\u06FFa-zA-Z0-9/_+.-]/g, '')
    .toLowerCase()
    .trim();

export const normalizeText = (text: string) =>
  replaceLocalizedDigits(String(text || ''))
    .normalize('NFKC')
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[“”„«»]/g, '"')
    .replace(/[’‘]/g, "'")
    .replace(/[^\u0600-\u06FFa-zA-Z0-9\s/_+.-]/g, ' ')
    .toLowerCase()
    .split(/\s+/)
    .map(normalizeWord)
    .filter(Boolean)
    .join(' ')
    .trim();

export const tokenizeNormalizedText = (text: string) =>
  normalizeText(text).split(/\s+/).filter(Boolean);

export const normalizeForComparison = (text: string) =>
  normalizeText(text).replace(/\s+/g, ' ').trim();

export const hasAny = (text: string, pattern: RegExp) => {
  pattern.lastIndex = 0;
  return pattern.test(normalizeText(text));
};

export const includesNormalized = (text: string, phrase: string) => {
  const normalizedText = normalizeForComparison(text);
  const normalizedPhrase = normalizeForComparison(phrase);
  return Boolean(normalizedPhrase) && normalizedText.includes(normalizedPhrase);
};

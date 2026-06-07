export const normalizeWord = (word: string) => {
  return word
    .replace(/[\u064B-\u065F\u0640]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, '')
    .toLowerCase()
    .trim()
    .replace(/^(ال|ل|ب|ك|ف)/, '');
};

export const normalizeText = (text: string) => {
  return text
    .split(/\s+/)
    .map(normalizeWord)
    .filter(Boolean)
    .join(' ');
};

export const hasAny = (text: string, pattern: RegExp) => {
  return pattern.test(normalizeText(text));
};
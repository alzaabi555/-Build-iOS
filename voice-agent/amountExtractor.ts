import { normalizeText } from './normalizer';

export const extractAmount = (text: string): number => {
  const normalized = normalizeText(text);
  const numericMatch = normalized.match(/\b([0-9]{1,2})\b/);

  if (numericMatch) {
    const value = Number(numericMatch[1]);
    if (!Number.isNaN(value) && value > 0) return value;
  }

  const patterns: Array<[RegExp, number]> = [
    [/(نقطتين|درجتين|نجمتين|علامتين|اثنين|مرتين)/, 2],
    [/(ثلاث|ثلاثه)/, 3],
    [/(اربع|اربعه)/, 4],
    [/(خمس|خمسه)/, 5],
    [/(ست|سته)/, 6],
    [/(سبع|سبعه)/, 7],
    [/(ثمان|ثمانيه)/, 8],
    [/(تسع|تسعه)/, 9],
    [/(عشر|عشره)/, 10]
  ];

  for (const [pattern, amount] of patterns) {
    if (pattern.test(normalized)) return amount;
  }

  return 1;
};
``
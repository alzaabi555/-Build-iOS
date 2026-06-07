import { DomIndexItem } from './types';
import { normalizeText } from './normalizer';

export const buildDomIndex = (): DomIndexItem[] => {
  if (typeof document === 'undefined') return [];

  const selector = [
    'button',
    'a',
    'input',
    'textarea',
    'select',
    '[role="button"]',
    '[role="tab"]',
    '[role="menuitem"]',
    '[role="dialog"]',
    'dialog'
  ].join(',');

  return Array.from(document.querySelectorAll(selector))
    .filter((element) => {
      const htmlElement = element as HTMLElement;
      const style = window.getComputedStyle(htmlElement);

      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        htmlElement.getAttribute('aria-hidden') !== 'true'
      );
    })
    .map((element) => {
      const htmlElement = element as HTMLElement;
      const inputElement = element as HTMLInputElement;

      const item: DomIndexItem = {
        element: htmlElement,
        tag: htmlElement.tagName.toLowerCase(),
        role: htmlElement.getAttribute('role') || '',
        text: normalizeText(htmlElement.textContent || ''),
        placeholder: normalizeText(inputElement.placeholder || ''),
        ariaLabel: normalizeText(htmlElement.getAttribute('aria-label') || ''),
        name: normalizeText(inputElement.name || ''),
        id: normalizeText(htmlElement.id || ''),
        value: normalizeText(inputElement.value || ''),
        scoreText: ''
      };

      item.scoreText = [
        item.text,
        item.placeholder,
        item.ariaLabel,
        item.name,
        item.id,
        item.value,
        item.role,
        item.tag
      ]
        .filter(Boolean)
        .join(' ');

      return item;
    });
};

export const findInputByMeaning = (
  keyword: string
): HTMLInputElement | HTMLTextAreaElement | undefined => {
  const normalizedKeyword = normalizeText(keyword);
  const domIndex = buildDomIndex();

  const candidates = domIndex
    .filter((item) => item.tag === 'input' || item.tag === 'textarea')
    .map((item) => {
      let score = 0;

      if (item.placeholder.includes(normalizedKeyword)) score += 6;
      if (item.ariaLabel.includes(normalizedKeyword)) score += 6;
      if (item.name.includes(normalizedKeyword)) score += 4;
      if (item.id.includes(normalizedKeyword)) score += 4;
      if (item.scoreText.includes(normalizedKeyword)) score += 2;

      return {
        element: item.element as HTMLInputElement | HTMLTextAreaElement,
        score
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return candidates[0]?.element;
};

export const writeToField = (fieldKeyword: string, value: string) => {
  const input = findInputByMeaning(fieldKeyword);

  if (!input) return false;

  input.focus();

  const prototype =
    input instanceof HTMLTextAreaElement
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;

  const nativeSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
  nativeSetter?.call(input, value);

  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));

  return true;
};

export const scanAndClick = (commandText: string): boolean => {
  const text = normalizeText(commandText);
  const domIndex = buildDomIndex();

  const candidates = domIndex
    .filter(
      (item) =>
        ['button', 'a'].includes(item.tag) ||
        ['button', 'tab', 'menuitem'].includes(item.role)
    )
    .map((item) => {
      let score = 0;
      const tokens = text.split(/\s+/).filter((token) => token.length >= 2);

      for (const token of tokens) {
        if (item.scoreText.includes(token)) {
          score += token.length;
        }
      }

      if (item.text && text.includes(item.text)) score += 20;
      if (item.ariaLabel && text.includes(item.ariaLabel)) score += 15;

      return { ...item, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  const bestMatch = candidates[0];

  if (!bestMatch) return false;

  bestMatch.element.style.boxShadow = '0 0 0 4px rgba(99, 102, 241, 0.5)';

  setTimeout(() => {
    bestMatch.element.style.boxShadow = '';
  }, 300);

  bestMatch.element.click();
  return true;
};
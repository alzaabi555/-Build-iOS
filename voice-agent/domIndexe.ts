import type { DomIndexItem } from './types';
import { normalizeText, tokenizeNormalizedText } from './normalizer';

const INTERACTIVE_SELECTOR = [
  'button', 'a', 'input', 'textarea', 'select',
  '[contenteditable="true"]', '[role="button"]', '[role="tab"]',
  '[role="menuitem"]', '[role="option"]', '[role="checkbox"]',
  '[role="radio"]', '[role="switch"]', '[role="combobox"]',
  '[role="textbox"]', '[tabindex]', '[data-voice-command]',
  '[data-voice-field]', '[data-action]', '[onclick]'
].join(',');

const DANGEROUS_PATTERN = /حذف|مسح|ازاله|تصفير|تهيئه|اعاده ضبط|استعاده|استرجاع|delete|remove|clear|reset|restore|wipe/;
const EXPLICIT_DANGER_PATTERN = /حذف|مسح|ازاله|صفر|تصفير|تهيئه|اعاده ضبط|استعاده|استرجاع|delete|remove|clear|reset|restore|wipe/;
const MIN_CLICK_SCORE = 14;
const MIN_INPUT_SCORE = 10;
const MIN_SCORE_MARGIN = 3;

const isElementVisible = (element: HTMLElement) => {
  if (typeof window === 'undefined') return false;
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    Number(style.opacity || 1) > 0 &&
    element.getAttribute('aria-hidden') !== 'true' &&
    !element.hidden && rect.width > 0 && rect.height > 0;
};

const isElementDisabled = (element: HTMLElement) => {
  const control = element as HTMLButtonElement | HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  return Boolean(control.disabled || element.getAttribute('aria-disabled') === 'true' || element.hasAttribute('inert'));
};

const getAssociatedLabelText = (element: HTMLElement) => {
  if (typeof document === 'undefined') return '';
  const texts: string[] = [];
  if (element.id) {
    const escapedId = typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
      ? CSS.escape(element.id)
      : element.id.replace(/["\\]/g, '\\$&');
    document.querySelectorAll(`label[for="${escapedId}"]`).forEach(label => {
      if (label.textContent) texts.push(label.textContent);
    });
  }
  const closestLabel = element.closest('label');
  if (closestLabel?.textContent) texts.push(closestLabel.textContent);
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    labelledBy.split(/\s+/).forEach(id => {
      const labelElement = document.getElementById(id);
      if (labelElement?.textContent) texts.push(labelElement.textContent);
    });
  }
  return [...new Set(texts)].join(' ');
};

const getNearbyText = (element: HTMLElement) => {
  const texts: string[] = [];
  const previous = element.previousElementSibling as HTMLElement | null;
  const next = element.nextElementSibling as HTMLElement | null;
  if (previous?.textContent) texts.push(previous.textContent);
  if (next?.textContent) texts.push(next.textContent);
  const container = element.closest('fieldset, section, article, form, [role="dialog"], [role="tabpanel"]');
  if (container?.textContent) texts.push(container.textContent.slice(0, 800));
  return [...new Set(texts)].join(' ');
};

const getElementValue = (element: HTMLElement) => {
  const input = element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  return 'value' in input && typeof input.value === 'string' ? input.value : '';
};

const getVoiceAttributes = (element: HTMLElement) => [
  element.getAttribute('data-voice-command') || '',
  element.getAttribute('data-voice-field') || '',
  element.getAttribute('data-action') || '',
  element.getAttribute('data-testid') || '',
  element.getAttribute('aria-label') || '',
  element.getAttribute('title') || '',
  element.getAttribute('name') || '',
  element.getAttribute('id') || ''
].join(' ');

const calculateDomScore = (query: string, item: DomIndexItem) => {
  const text = normalizeText(query);
  const tokens = tokenizeNormalizedText(text).filter(token => token.length >= 2);
  if (!text || tokens.length === 0) return 0;

  const strongFields = [item.voiceCommand, item.voiceField, item.ariaLabel, item.title, item.placeholder, item.labelText, item.name, item.id].filter(Boolean);
  const weakFields = [item.text, item.nearbyText, item.parentText, item.value, item.role, item.tag].filter(Boolean);
  let score = 0;

  strongFields.forEach(field => {
    if (field === text) score += 80;
    else if (field.includes(text) || text.includes(field)) score += 35;
  });
  weakFields.forEach(field => {
    if (field === text) score += 35;
    else if (field.includes(text) || text.includes(field)) score += 15;
  });

  tokens.forEach(token => {
    if (strongFields.some(field => field.split(/\s+/).includes(token))) score += token.length + 8;
    else if (strongFields.some(field => field.includes(token))) score += token.length + 5;
    if (weakFields.some(field => field.split(/\s+/).includes(token))) score += token.length + 2;
  });

  if (item.disabled || item.hidden) score -= 100;
  return score;
};

export const buildDomIndex = (): DomIndexItem[] => {
  if (typeof document === 'undefined') return [];
  const seen = new Set<HTMLElement>();
  return Array.from(document.querySelectorAll(INTERACTIVE_SELECTOR))
    .map(element => element as HTMLElement)
    .filter(element => {
      if (seen.has(element)) return false;
      seen.add(element);
      return isElementVisible(element);
    })
    .map(element => {
      const input = element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      const item: DomIndexItem = {
        element,
        tag: element.tagName.toLowerCase(),
        role: normalizeText(element.getAttribute('role') || ''),
        text: normalizeText(element.textContent || ''),
        placeholder: normalizeText('placeholder' in input ? input.placeholder || '' : ''),
        ariaLabel: normalizeText(element.getAttribute('aria-label') || ''),
        name: normalizeText(input.name || ''),
        id: normalizeText(element.id || ''),
        value: normalizeText(getElementValue(element)),
        title: normalizeText(element.getAttribute('title') || ''),
        voiceCommand: normalizeText(element.getAttribute('data-voice-command') || ''),
        voiceField: normalizeText(element.getAttribute('data-voice-field') || ''),
        labelText: normalizeText(getAssociatedLabelText(element)),
        nearbyText: normalizeText(getNearbyText(element)),
        parentText: normalizeText(element.parentElement?.textContent?.slice(0, 600) || ''),
        scoreText: '',
        disabled: isElementDisabled(element),
        hidden: !isElementVisible(element),
        dangerous: false,
        requiresConfirmation: element.getAttribute('data-voice-confirm') === 'true'
      };
      item.scoreText = [item.text, item.placeholder, item.ariaLabel, item.name, item.id, item.value, item.title, item.voiceCommand, item.voiceField, item.labelText, item.nearbyText, item.parentText, normalizeText(getVoiceAttributes(element)), item.role, item.tag].filter(Boolean).join(' ');
      item.dangerous = element.getAttribute('data-voice-dangerous') === 'true' || DANGEROUS_PATTERN.test(item.scoreText);
      return item;
    });
};

const getReliableBestMatch = <T extends { score: number }>(candidates: T[], minimumScore: number) => {
  const best = candidates[0];
  if (!best || best.score < minimumScore) return undefined;
  const second = candidates[1];
  if (second && best.score - second.score < MIN_SCORE_MARGIN && best.score < minimumScore + 20) return undefined;
  return best;
};

export const findInputByMeaning = (keyword: string): HTMLInputElement | HTMLTextAreaElement | undefined => {
  const candidates = buildDomIndex()
    .filter(item => !item.disabled && !item.hidden && (item.tag === 'input' || item.tag === 'textarea' || item.role === 'textbox' || item.element.getAttribute('contenteditable') === 'true'))
    .map(item => ({ element: item.element as HTMLInputElement | HTMLTextAreaElement, score: calculateDomScore(keyword, item) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);
  return getReliableBestMatch(candidates, MIN_INPUT_SCORE)?.element;
};

export const writeToField = (fieldKeyword: string, value: string) => {
  const input = findInputByMeaning(fieldKeyword);
  if (!input || isElementDisabled(input)) return false;
  input.focus({ preventScroll: false });
  if (input.getAttribute('contenteditable') === 'true') {
    input.textContent = value;
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }
  const prototype = input instanceof HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  const nativeSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
  if (nativeSetter) nativeSetter.call(input, value);
  else input.value = value;
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
};

const isClickableItem = (item: DomIndexItem) =>
  !item.disabled && !item.hidden && (
    ['button', 'a', 'select'].includes(item.tag) ||
    ['button', 'tab', 'menuitem', 'option', 'checkbox', 'radio', 'switch'].includes(item.role) ||
    item.element.hasAttribute('data-voice-command') || item.element.hasAttribute('data-action') ||
    item.element.hasAttribute('onclick') || item.element.getAttribute('tabindex') !== null
  );

export const scanAndClick = (commandText: string): boolean => {
  const text = normalizeText(commandText);
  if (!text) return false;
  const explicitlyRequestsDanger = EXPLICIT_DANGER_PATTERN.test(text);
  const candidates = buildDomIndex()
    .filter(isClickableItem)
    .map(item => {
      let score = calculateDomScore(text, item);
      if (/افتح|فتح|اضغط|اختر|اعرض|انتقل|open|click|select|show/.test(text)) score += 3;
      if (item.dangerous && !explicitlyRequestsDanger) score -= 100;
      if (item.requiresConfirmation) score -= 4;
      return { ...item, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);

  const bestMatch = getReliableBestMatch(candidates, MIN_CLICK_SCORE);
  if (!bestMatch || bestMatch.dangerous) return false;

  bestMatch.element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
  const previousOutline = bestMatch.element.style.outline;
  const previousOutlineOffset = bestMatch.element.style.outlineOffset;
  bestMatch.element.style.outline = '4px solid rgba(99, 102, 241, 0.55)';
  bestMatch.element.style.outlineOffset = '2px';
  setTimeout(() => {
    bestMatch.element.style.outline = previousOutline;
    bestMatch.element.style.outlineOffset = previousOutlineOffset;
  }, 650);
  bestMatch.element.click();
  return true;
};

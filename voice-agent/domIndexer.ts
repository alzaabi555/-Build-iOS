import { DomIndexItem } from './types';
import { normalizeText } from './normalizer';

const INTERACTIVE_SELECTOR = [
  'button',
  'a',
  'input',
  'textarea',
  'select',
  '[role="button"]',
  '[role="tab"]',
  '[role="menuitem"]',
  '[role="option"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="switch"]',
  '[role="combobox"]',
  '[role="textbox"]',
  '[tabindex]',
  '[data-voice-command]',
  '[data-voice-field]',
  '[data-action]',
  '[onclick]'
].join(',');

const isElementVisible = (element: HTMLElement) => {
  if (typeof window === 'undefined') return false;

  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();

  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0' &&
    element.getAttribute('aria-hidden') !== 'true' &&
    rect.width > 0 &&
    rect.height > 0
  );
};

const getAssociatedLabelText = (element: HTMLElement) => {
  if (typeof document === 'undefined') return '';

  const input = element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  const id = input.id;

  const texts: string[] = [];

  if (id) {
    const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
    if (label?.textContent) {
      texts.push(label.textContent);
    }
  }

  const closestLabel = element.closest('label');
  if (closestLabel?.textContent) {
    texts.push(closestLabel.textContent);
  }

  return texts.join(' ');
};

const getNearbyText = (element: HTMLElement) => {
  const texts: string[] = [];

  const parent = element.parentElement;
  const grandParent = parent?.parentElement;

  if (parent?.textContent) {
    texts.push(parent.textContent);
  }

  if (grandParent?.textContent) {
    texts.push(grandParent.textContent);
  }

  const previous = element.previousElementSibling as HTMLElement | null;
  const next = element.nextElementSibling as HTMLElement | null;

  if (previous?.textContent) {
    texts.push(previous.textContent);
  }

  if (next?.textContent) {
    texts.push(next.textContent);
  }

  return texts.join(' ');
};

const getElementValue = (element: HTMLElement) => {
  const input = element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

  if ('value' in input && typeof input.value === 'string') {
    return input.value;
  }

  return '';
};

const getVoiceAttributes = (element: HTMLElement) => {
  return [
    element.getAttribute('data-voice-command') || '',
    element.getAttribute('data-voice-field') || '',
    element.getAttribute('data-action') || '',
    element.getAttribute('data-testid') || '',
    element.getAttribute('aria-label') || '',
    element.getAttribute('title') || '',
    element.getAttribute('name') || '',
    element.getAttribute('id') || ''
  ].join(' ');
};

const calculateDomScore = (query: string, item: DomIndexItem) => {
  const text = normalizeText(query);
  const tokens = text.split(/\s+/).filter((token) => token.length >= 2);

  let score = 0;

  const strongText = [
    item.ariaLabel,
    item.title,
    item.voiceCommand,
    item.voiceField,
    item.placeholder,
    item.labelText,
    item.name,
    item.id
  ]
    .filter(Boolean)
    .join(' ');

  const weakText = [
    item.text,
    item.nearbyText,
    item.parentText,
    item.value,
    item.role,
    item.tag
  ]
    .filter(Boolean)
    .join(' ');

  for (const token of tokens) {
    if (strongText.includes(token)) score += token.length + 8;
    if (weakText.includes(token)) score += token.length + 2;
  }

  if (item.voiceCommand && text.includes(item.voiceCommand)) score += 50;
  if (item.voiceField && text.includes(item.voiceField)) score += 50;
  if (item.ariaLabel && text.includes(item.ariaLabel)) score += 35;
  if (item.title && text.includes(item.title)) score += 25;
  if (item.placeholder && text.includes(item.placeholder)) score += 25;
  if (item.labelText && text.includes(item.labelText)) score += 25;
  if (item.text && text.includes(item.text)) score += 20;

  return score;
};

export const buildDomIndex = (): DomIndexItem[] => {
  if (typeof document === 'undefined') return [];

  const elements = Array.from(document.querySelectorAll(INTERACTIVE_SELECTOR));

  return elements
    .map((element) => element as HTMLElement)
    .filter(isElementVisible)
    .map((element) => {
      const inputElement = element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

      const voiceCommand = normalizeText(element.getAttribute('data-voice-command') || '');
      const voiceField = normalizeText(element.getAttribute('data-voice-field') || '');
      const title = normalizeText(element.getAttribute('title') || '');
      const ariaLabel = normalizeText(element.getAttribute('aria-label') || '');
      const placeholder = normalizeText(
        'placeholder' in inputElement ? inputElement.placeholder || '' : ''
      );

      const labelText = normalizeText(getAssociatedLabelText(element));
      const nearbyText = normalizeText(getNearbyText(element));
      const parentText = normalizeText(element.parentElement?.textContent || '');

      const item: DomIndexItem = {
        element,
        tag: element.tagName.toLowerCase(),
        role: element.getAttribute('role') || '',
        text: normalizeText(element.textContent || ''),
        placeholder,
        ariaLabel,
        name: normalizeText((inputElement as HTMLInputElement).name || ''),
        id: normalizeText(element.id || ''),
        value: normalizeText(getElementValue(element)),
        title,
        voiceCommand,
        voiceField,
        labelText,
        nearbyText,
        parentText,
        scoreText: ''
      };

      item.scoreText = [
        item.text,
        item.placeholder,
        item.ariaLabel,
        item.name,
        item.id,
        item.value,
        item.title,
        item.voiceCommand,
        item.voiceField,
        item.labelText,
        item.nearbyText,
        item.parentText,
        normalizeText(getVoiceAttributes(element)),
        normalizeText(item.role),
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
    .filter((item) => {
      return (
        item.tag === 'input' ||
        item.tag === 'textarea' ||
        item.role === 'textbox' ||
        item.element.getAttribute('contenteditable') === 'true'
      );
    })
    .map((item) => {
      const score = calculateDomScore(normalizedKeyword, item);

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

  if (input.getAttribute('contenteditable') === 'true') {
    input.textContent = value;
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  const prototype =
    input instanceof HTMLTextAreaElement
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;

  const nativeSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

  if (nativeSetter) {
    nativeSetter.call(input, value);
  } else {
    input.value = value;
  }

  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
  input.dispatchEvent(new Event('change', { bubbles: true }));

  return true;
};

const isClickableItem = (item: DomIndexItem) => {
  return (
    ['button', 'a', 'select'].includes(item.tag) ||
    ['button', 'tab', 'menuitem', 'option', 'checkbox', 'radio', 'switch'].includes(item.role) ||
    item.element.hasAttribute('data-voice-command') ||
    item.element.hasAttribute('data-action') ||
    item.element.hasAttribute('onclick') ||
    item.element.getAttribute('tabindex') !== null
  );
};

const isDangerousElement = (item: DomIndexItem) => {
  const text = item.scoreText;

  return /(حذف|مسح|ازاله|ازالة|تصفير|تهيئه|تهيئة|delete|remove|reset)/.test(text);
};

export const scanAndClick = (commandText: string): boolean => {
  const text = normalizeText(commandText);
  const domIndex = buildDomIndex();

  const candidates = domIndex
    .filter(isClickableItem)
    .map((item) => {
      let score = calculateDomScore(text, item);

      if (/(افتح|فتح|اضغط|اختر|اعرض|روح|انتقل)/.test(text)) {
        score += 3;
      }

      if (isDangerousElement(item) && !/(حذف|مسح|ازاله|ازالة|صفر|تصفير|الغ|الغاء)/.test(text)) {
        score -= 30;
      }

      return {
        ...item,
        score
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  const bestMatch = candidates[0];

  if (!bestMatch) return false;

  bestMatch.element.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
    inline: 'center'
  });

  bestMatch.element.style.boxShadow = '0 0 0 4px rgba(99, 102, 241, 0.55)';

  setTimeout(() => {
    bestMatch.element.style.boxShadow = '';
  }, 500);

  bestMatch.element.click();

  return true;
};

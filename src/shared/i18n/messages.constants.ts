import arMessages from './locales/ar.json';
import deMessages from './locales/de.json';
import enMessages from './locales/en.json';
import esMessages from './locales/es.json';
import faMessages from './locales/fa.json';
import frMessages from './locales/fr.json';
import hiMessages from './locales/hi.json';
import itMessages from './locales/it.json';
import jaMessages from './locales/ja.json';
import ptBRMessages from './locales/pt-BR.json';
import thMessages from './locales/th.json';
import zhCNMessages from './locales/zh-CN.json';

export const messages = {
  en: enMessages,
  ar: arMessages,
  it: itMessages,
  fa: faMessages,
  fr: frMessages,
  de: deMessages,
  es: esMessages,
  'pt-BR': ptBRMessages,
  hi: hiMessages,
  th: thMessages,
  'zh-CN': zhCNMessages,
  ja: jaMessages,
} as const;

export type MessageKey = keyof typeof messages.en;

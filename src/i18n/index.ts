import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslation from './locales/en.json';
import zhTranslation from './locales/zh.json';
import esTranslation from './locales/es.json';
import frTranslation from './locales/fr.json';
import deTranslation from './locales/de.json';
import jaTranslation from './locales/ja.json';
import koTranslation from './locales/ko.json';
import ruTranslation from './locales/ru.json';
import ptTranslation from './locales/pt.json';
import itTranslation from './locales/it.json';
import hiTranslation from './locales/hi.json';
import arTranslation from './locales/ar.json';
import trTranslation from './locales/tr.json';
import thTranslation from './locales/th.json';
import idTranslation from './locales/id.json';
import viTranslation from './locales/vi.json';

// 初始化 i18next
i18n
  // 检测用户语言
  .use(LanguageDetector)
  // 将 i18n 实例传递给 react-i18next
  .use(initReactI18next)
  // 初始化 i18next
  .init({
    resources: {
      en: {
        translation: enTranslation
      },
      zh: {
        translation: zhTranslation
      },
      es: {
        translation: esTranslation
      },
      fr: {
        translation: frTranslation
      },
      de: {
        translation: deTranslation
      },
      ja: {
        translation: jaTranslation
      },
      ko: {
        translation: koTranslation
      },
      ru: {
        translation: ruTranslation
      },
      pt: {
        translation: ptTranslation
      },
      it: {
        translation: itTranslation
      },
      hi: {
        translation: hiTranslation
      },
      ar: {
        translation: arTranslation
      },
      tr: {
        translation: trTranslation
      },
      th: {
        translation: thTranslation
      },
      id: {
        translation: idTranslation
      },
      vi: {
        translation: viTranslation
      }
    },
    fallbackLng: 'en',
    lng: 'en', // 设置默认语言为英文
    debug: process.env.NODE_ENV === 'development',
    
    interpolation: {
      escapeValue: false, // 不转义 HTML
    },
    
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    }
  });

export default i18n; 
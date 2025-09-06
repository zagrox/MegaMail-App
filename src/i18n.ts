import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';

const namespaces = [
  'common', 'auth', 'onboarding', 'dashboard', 'statistics', 'account',
  'buyCredits', 'campaigns', 'templates', 'domains', 'smtp', 'emailLists',
  'contacts', 'segments', 'sendEmail', 'mediaManager', 'emailBuilder',
  'send-wizard', 'orders'
];

i18next
  .use(LanguageDetector)
  .use(HttpBackend)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    // Preload all namespaces to prevent issues with lazy loading.
    ns: namespaces,
    defaultNS: 'common',
    fallbackNS: 'common',
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
  });

export default i18next;
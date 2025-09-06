import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';

i18next
  .use(LanguageDetector)
  .use(HttpBackend)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'fa'], // Explicitly list supported languages
    // By removing the `ns` array, we enable lazy-loading.
    // Each component's useTranslation hook will now trigger the loading
    // of the namespaces it needs on-demand.
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
    // Explicitly enable Suspense for react-i18next
    react: {
        useSuspense: true,
    },
  });

export default i18next;
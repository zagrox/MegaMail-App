import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';

i18next
  .use(HttpBackend)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    // By removing the `ns` array, we enable lazy-loading.
    // Each component's useTranslation hook will now trigger the loading
    // of the namespaces it needs on-demand.
    defaultNS: 'common',
    fallbackNS: 'common',
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
    backend: {
      // FIX: Replace 'translation.json' requests with 'common.json'.
      // This handles cases where i18next might fall back to its internal default 'translation'
      // namespace, ensuring it loads the correct 'common.json' file instead.
      loadPath: (lngs, namespaces) => {
        const lng = lngs[0];
        const ns = namespaces[0];
        if (ns === 'translation') {
            return `/locales/${lng}/common.json`;
        }
        return `/locales/${lng}/${ns}.json`;
      },
    },
  });

export default i18next;


import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

const LanguageSwitcher = () => {
    const { i18n, t } = useTranslation(['account']);
    const { updateUser, user } = useAuth();
    const { addToast } = useToast();
    
    const options = [
        { value: 'en', label: 'English', directusValue: 'english', dir: 'ltr' },
        { value: 'fa', label: 'فارسی', directusValue: 'persian', dir: 'rtl' },
    ];

    const handleLanguageChange = async (langCode: string) => {
        if (i18n.language.startsWith(langCode)) return;

        const previousLangCode = i18n.language;
        localStorage.setItem('i18nextLng', langCode);

        try {
            // Optimistically change the language in the UI and wait for it to complete
            await i18n.changeLanguage(langCode);

            // Now that the language is loaded, the `t` function will use the new language files
            addToast(t('languageUpdateSuccess'), 'success');

            // Sync the change to the backend in the background for logged-in users
            if (user && !user.isApiKeyUser) {
                const selectedOption = options.find(opt => opt.value === langCode);
                if (selectedOption) {
                    const payload = {
                        language: selectedOption.directusValue,
                        text_direction: selectedOption.dir,
                    };
                    updateUser(payload).catch(error => {
                        console.warn("Failed to sync language preference:", error);
                        // Notify user that saving the preference failed.
                        // The UI change for this session will remain, but a reload will revert it.
                        addToast('Failed to save language preference to your profile.', 'error');
                        // Revert localStorage so the next page load uses the correct server language.
                        localStorage.setItem('i18nextLng', previousLangCode);
                    });
                }
            }
        } catch (error) {
            console.error("Failed to change language:", error);
            // Revert localStorage if the language change itself (e.g., loading files) fails.
            localStorage.setItem('i18nextLng', previousLangCode);
            addToast("An error occurred while changing the language.", 'error');
        }
    };

    return (
        <div className="language-switcher">
            {options.map(option => (
                <button
                    key={option.value}
                    className={`language-btn ${i18n.language.startsWith(option.value) ? 'active' : ''}`}
                    onClick={() => handleLanguageChange(option.value)}
                >
                    <span>{option.label}</span>
                </button>
            ))}
        </div>
    );
};

export default LanguageSwitcher;

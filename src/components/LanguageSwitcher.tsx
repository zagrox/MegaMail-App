
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

    const handleLanguageChange = (langCode: string) => {
        if (i18n.language.startsWith(langCode)) return;

        // Update UI immediately
        i18n.changeLanguage(langCode);
        localStorage.setItem('i18nextLng', langCode);

        const showSuccessToast = () => {
            addToast(t('languageUpdateSuccess'), 'success');
        };

        // If user is not an API user, sync to Directus
        if (user && !user.isApiKeyUser) {
            const selectedOption = options.find(opt => opt.value === langCode);
            if (selectedOption) {
                const payload = {
                    language: selectedOption.directusValue,
                    text_direction: selectedOption.dir,
                };
                updateUser(payload)
                    .then(showSuccessToast)
                    .catch(error => {
                        console.warn("Failed to sync language preference:", error);
                        // The UI has already updated optimistically, AuthContext will handle reverting on error.
                        // We don't show an error toast here to avoid confusion.
                    });
            }
        } else {
            // For guests or API key users, the change is local.
            showSuccessToast();
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

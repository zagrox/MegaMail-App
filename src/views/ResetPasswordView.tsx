import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { useToast } from '../contexts/ToastContext';
import Loader from '../components/Loader';
import Icon, { ICONS } from '../components/Icon';
import { useConfiguration } from '../contexts/ConfigurationContext';

const ResetPasswordView = () => {
    const { resetPassword } = useAuth();
    const { t } = useTranslation(['auth', 'common']);
    const { addToast } = useToast();
    const { config } = useConfiguration();
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        const hash = window.location.hash.substring(1);
        const hashQueryString = hash.split('?')[1] || '';
        const searchQueryString = window.location.search.substring(1) || '';
        const params = new URLSearchParams(hashQueryString || searchQueryString);
        const tokenFromUrl = params.get('token');

        if (tokenFromUrl) {
            setToken(tokenFromUrl);
        }
    }, []);

    const handleResetSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!token) {
            addToast(t('invalidResetToken'), 'error');
            return;
        }

        const form = e.currentTarget;
        const password = (form.elements.namedItem('password') as HTMLInputElement).value;
        const confirm_password = (form.elements.namedItem('confirm_password') as HTMLInputElement).value;

        if (password !== confirm_password) {
            addToast(t('passwordsDoNotMatch'), 'error');
            return;
        }

        setLoading(true);
        try {
            await resetPassword(token, password);
            addToast(t('passwordResetSuccessMessage'), 'success');
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
        } catch (err: any) {
            let errorMessage = err.message;
            if (err.errors && Array.isArray(err.errors) && err.errors.length > 0) {
                errorMessage = err.errors[0].message;
            }
            addToast(errorMessage || t('unknownError'), 'error');
        } finally {
            setLoading(false);
        }
    };

    const goToLogin = () => {
        window.location.href = '/';
    }
    
    const appName = config?.app_name || 'MegaMail';

    // This view now serves two purposes: entering email to request reset, and entering new password with token.
    if (token) {
        // Mode: User has a token and is setting a new password.
        return (
            <div className="auth-container">
                <div className="auth-box">
                    <h1><span className="logo-font">{appName}</span></h1>
                    <p>{t('resetPasswordSubtitle')}</p>
                    <form className="auth-form" onSubmit={handleResetSubmit}>
                        <fieldset disabled={loading} style={{ border: 'none', padding: 0, margin: 0, display: 'contents' }}>
                            <div className="input-group has-btn">
                                <span className="input-icon"><Icon>{ICONS.LOCK}</Icon></span>
                                <input name="password" type={showPassword ? "text" : "password"} placeholder={t('newPassword')} required />
                                <button type="button" className="input-icon-btn" onClick={() => setShowPassword(!showPassword)}>
                                    <Icon>{showPassword ? ICONS.EYE_OFF : ICONS.EYE}</Icon>
                                </button>
                            </div>
                            <div className="input-group">
                                <span className="input-icon"><Icon>{ICONS.LOCK}</Icon></span>
                                <input name="confirm_password" type="password" placeholder={t('confirmPassword')} required />
                            </div>
                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                {loading ? <Loader /> : t('resetPassword')}
                            </button>
                        </fieldset>
                    </form>
                    <div className="auth-switch">
                        <button onClick={goToLogin} className="link-button">{t('backToSignIn')}</button>
                    </div>
                </div>
            </div>
        );
    }
    
    // Mode: User does not have a token and needs to request one.
    // This part is never reached because the App router handles the 'forgot' mode within AuthView.
    // However, keeping this logic for the /reset-password route which handles the token.
    // The prompt is slightly ambiguous, if the user lands on /#/reset-password without a token,
    // they should be redirected or shown an error. The current App.tsx logic doesn't render this view
    // unless the hash matches. The token useEffect handles the error case. This is sufficient.
    return (
        <div className="auth-container">
            <div className="auth-box">
                 <h1><span className="logo-font">{appName}</span></h1>
                 <p>{t('resetPasswordSubtitle')}</p>
                 <div className="info-message warning">
                    <p>{t('invalidResetToken')}</p>
                 </div>
                 <div className="auth-switch">
                    <button onClick={goToLogin} className="link-button">{t('backToSignIn')}</button>
                </div>
            </div>
        </div>
    );
};

export default ResetPasswordView;

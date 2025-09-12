
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../api/elasticEmail';
import { useToast } from '../contexts/ToastContext';
import Loader from '../components/Loader';
import Icon, { ICONS } from '../components/Icon';
import Button from '../components/Button';
import { AppActions } from '../config/actions';
import ConfirmModal from '../components/ConfirmModal';

const ApiKeyView = ({ apiKey: initialApiKey }: { apiKey: string, user: any }) => {
    const { t } = useTranslation(['account', 'common']);
    const { updateUser } = useAuth();
    const { addToast } = useToast();
    const [newApiKey, setNewApiKey] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isKeyVisible, setIsKeyVisible] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

    const handleValidateAndConfirm = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);
        try {
            await apiFetch('/account/load', newApiKey);
            setIsConfirmModalOpen(true);
        } catch (err: any) {
            addToast(t('invalidApiKey'), 'error');
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleConfirmUpdate = async () => {
        setIsConfirmModalOpen(false);
        setIsProcessing(true);
        try {
            await updateUser({ elastickey: newApiKey });
            addToast(t('apiKeyUpdateSuccess'), 'success');
            setNewApiKey('');
            setIsKeyVisible(false); // Re-hide the key after an update for security
        } catch (err: any) {
            addToast(err.message || t('apiKeyUpdateError'), 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const maskedKey = initialApiKey ? `••••••••••••••••••••••••••••${initialApiKey.slice(-4)}` : '';

    return (
        <div>
            <ConfirmModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={handleConfirmUpdate}
                title={t('confirmApiKeyUpdateTitle')}
                confirmText={t('saveChanges')}
                isDestructive
            >
                <p>{t('confirmApiKeyUpdateBody')}</p>
            </ConfirmModal>

            <div className="account-tab-card" style={{ marginBottom: '2rem' }}>
                <div className="account-tab-card-header">
                    <h3>{t('currentApiKey')}</h3>
                </div>
                <div className="account-tab-card-body">
                    <p>{t('apiKeyHiddenForSecurity')}</p>
                    <div className="secret-value-wrapper">
                        <input type="text" value={isKeyVisible ? initialApiKey : maskedKey} readOnly />
                    </div>
                    <div className="info-message warning" style={{ marginTop: '1.5rem', textAlign: 'left' }}>
                        <p style={{ margin: 0 }}><strong>{t('warning', { ns: 'common' })}:</strong> {t('apiKeyWarning')}</p>
                    </div>
                </div>
                <div className="form-actions" style={{ backgroundColor: 'var(--subtle-background)', justifyContent: 'space-between' }}>
                    <a href="https://megamail.readme.io/reference/" target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                        <Icon>{ICONS.FILE_TEXT}</Icon>
                        <span>{t('apiDocs')}</span>
                    </a>
                    <Button
                        className="btn-secondary"
                        onClick={() => setIsKeyVisible(!isKeyVisible)}
                        action={AppActions.REVEAL_API_KEY}
                    >
                        <Icon>{ICONS.KEY}</Icon>
                        <span>{isKeyVisible ? t('hideKey') : t('revealKey')}</span>
                    </Button>
                </div>
            </div>

            <div className="account-tab-card">
                <div className="account-tab-card-header">
                    <h3>{t('updateApiKey')}</h3>
                </div>
                <form onSubmit={handleValidateAndConfirm}>
                    <div className="account-tab-card-body">
                         <p style={{ color: 'var(--subtle-text-color)', fontSize: '0.9rem', marginTop: 0, marginBottom: '1.5rem' }}>
                            {t('mailzilaIntegrationNote')}
                        </p>
                         <div className="form-group">
                            <label htmlFor="api-key-input">{t('yourApiKey')}</label>
                            <input
                                id="api-key-input"
                                type="password"
                                value={newApiKey}
                                onChange={(e) => setNewApiKey(e.target.value)}
                                placeholder={t('enterYourApiKey')}
                                required
                            />
                        </div>
                    </div>
                    <div className="form-actions" style={{ backgroundColor: 'var(--subtle-background)' }}>
                        <button type="submit" className="btn btn-primary" disabled={isProcessing}>
                            {isProcessing ? <Loader /> : t('saveAndVerifyKey')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ApiKeyView;

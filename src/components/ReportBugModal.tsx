import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';
import Loader from './Loader';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useConfiguration } from '../contexts/ConfigurationContext';
import sdk from '../api/directus';

const ReportBugModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void; }) => {
    const { t } = useTranslation(['guides', 'common']);
    const { user } = useAuth();
    const { addToast } = useToast();
    const { config } = useConfiguration();
    const [title, setTitle] = useState('');
    const [details, setDetails] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (!user?.id || !config?.app_backend) {
                throw new Error('User or configuration not available.');
            }
            const token = await sdk.getToken();
            const response = await fetch(`${config.app_backend}/items/bugs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    bug_title: title,
                    bug_details: details,
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({})); // Catch if response is not json
                const errorMessage = errorData?.errors?.[0]?.message || 'Failed to submit bug report.';
                throw new Error(errorMessage);
            }

            addToast(t('bugReportSuccess'), 'success');
            onClose();
            setTitle('');
            setDetails('');
        } catch (err: any) {
            addToast(t('bugReportError', { error: err.message }), 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('bugReportModalTitle')}>
            <form onSubmit={handleSubmit} className="modal-form">
                <div className="info-message" style={{ textAlign: 'inherit', alignItems: 'flex-start', width: '100%', margin: 0 }}>
                    <p style={{ margin: 0 }}>{t('bugReportFormIntro1')}</p>
                    <p style={{ margin: 0 }}>{t('bugReportFormIntro2')}</p>
                </div>
                <p>{t('bugReportFormDesc')}</p>
                <div className="form-group">
                    <label htmlFor="bug-title">{t('bugTitle')}</label>
                    <input
                        id="bug-title"
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder={t('bugTitlePlaceholder')}
                        required
                        disabled={isSubmitting}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="bug-details">{t('bugDetails')}</label>
                    <textarea
                        id="bug-details"
                        value={details}
                        onChange={(e) => setDetails(e.target.value)}
                        required
                        disabled={isSubmitting}
                        rows={5}
                    />
                </div>
                <div className="form-actions">
                    <button type="button" className="btn" onClick={onClose} disabled={isSubmitting}>{t('cancel', { ns: 'common' })}</button>
                    <button type="submit" className="btn btn-primary" disabled={isSubmitting || !title || !details}>
                        {isSubmitting ? <Loader /> : t('submitBugReport')}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default ReportBugModal;

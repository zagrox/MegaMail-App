import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import sdk from '../api/directus';
import { useToast } from '../contexts/ToastContext';
import { useConfiguration } from '../contexts/ConfigurationContext';
import Loader from '../components/Loader';
import Icon, { ICONS } from '../components/Icon';
import CenteredMessage from '../components/CenteredMessage';

const OfflinePaymentView = ({ order, setView }: { order: any, setView: (view: string, data?: any) => void }) => {
    const { t, i18n } = useTranslation(['buyCredits', 'common', 'orders']);
    const { addToast } = useToast();
    const { config } = useConfiguration();
    const [details, setDetails] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!order) {
        return (
            <CenteredMessage>
                <div className="info-message warning">
                    <p>{t('noOrderSelected', { ns: 'orders' })}</p>
                </div>
            </CenteredMessage>
        );
    }
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!details.trim()) {
            addToast(t('detailsCannotBeEmpty'), 'error');
            return;
        }

        setIsSubmitting(true);

        try {
            const token = await sdk.getToken();
            if (!token) throw new Error("Authentication token not found.");
            if (!config?.app_backend) throw new Error("Application backend is not configured.");

            const response = await fetch(`${config.app_backend}/items/orders/${order.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ order_offline: details })
            });

            if (!response.ok) {
                const errorData = await response.json();
                const errorMessage = errorData?.errors?.[0]?.message || 'Failed to submit details.';
                throw new Error(errorMessage);
            }

            addToast(t('detailsSubmittedSuccess'), 'success');
            sessionStorage.setItem('account-tab', 'orders');
            setView('Account');

        } catch (error: any) {
            addToast(t('detailsSubmittedError', { error: error.message }), 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBackToOrders = () => {
        sessionStorage.setItem('account-tab', 'orders');
        setView('Account');
    };

    return (
        <div className="buy-credits-view">
             <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
                <div className="card-header" style={{ textAlign: 'center', borderBottom: 'none', paddingBottom: 0 }}>
                    <h2 style={{fontSize: '1.5rem'}}>{t('offlinePaymentFormTitle')}</h2>
                    <p style={{ color: 'var(--subtle-text-color)', marginTop: '0.5rem', fontSize: '0.9rem' }}>{t('offlinePaymentFormInstructions')}</p>
                </div>
                <div className="card-body">
                    <div className="table-container-simple" style={{ marginBottom: '2rem' }}>
                        <table className="simple-table">
                            <tbody>
                                <tr><td>{t('orderId')}</td><td style={{textAlign: 'right'}}><strong>#{order.id}</strong></td></tr>
                                <tr><td>{t('package')}</td><td style={{textAlign: 'right'}}><strong>{order.order_note}</strong></td></tr>
                                <tr><td>{t('totalAmount', { ns: 'orders' })}</td><td style={{textAlign: 'right'}}><strong>{Number(order.order_total).toLocaleString(i18n.language)} {t('priceIRT')}</strong></td></tr>
                            </tbody>
                        </table>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="transfer-details">{t('transferDetails')}</label>
                            <textarea
                                id="transfer-details"
                                value={details}
                                onChange={e => setDetails(e.target.value)}
                                rows={6}
                                placeholder={t('transferDetailsPlaceholder')}
                                required
                                disabled={isSubmitting}
                            />
                        </div>
                        <div className="form-actions" style={{ justifyContent: 'space-between', padding: '1.5rem 0 0', border: 'none' }}>
                            <button type="button" className="btn btn-secondary" onClick={handleBackToOrders} disabled={isSubmitting}>
                                {/* FIX: Changed path prop to children for Icon component */}
                                <Icon>{ICONS.CHEVRON_LEFT}</Icon>
                                <span>{t('backToOrders')}</span>
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={isSubmitting || !details.trim()}>
                                {/* FIX: Changed path prop to children for Icon component */}
                                {isSubmitting ? <Loader /> : <Icon>{ICONS.CHECK}</Icon>}
                                <span>{t('submitDetails')}</span>
                            </button>
                        </div>
                    </form>
                </div>
             </div>
        </div>
    );
};

export default OfflinePaymentView;

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { readItems, updateItem } from '@directus/sdk';
import sdk from '../api/directus';
import CenteredMessage from '../components/CenteredMessage';
import Loader from '../components/Loader';
import Icon, { ICONS } from '../components/Icon';

type ProcessedOrder = {
    id: string;
    note: string;
    creditsAdded?: number;
    total: number;
};

const CallbackView = () => {
    const { t, i18n } = useTranslation(['buyCredits', 'dashboard', 'orders', 'common']);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState('');
    const [processedOrder, setProcessedOrder] = useState<ProcessedOrder | null>(null);

    useEffect(() => {
        const handleCallback = async () => {
            setLoading(true);
            try {
                // Be robust: check both hash and search for parameters, as gateways can handle redirects differently.
                const hash = window.location.hash.substring(1);
                const hashQueryString = hash.split('?')[1] || '';
                const searchQueryString = window.location.search.substring(1) || '';
                const params = new URLSearchParams(hashQueryString || searchQueryString);
                
                const trackId = params.get('trackId');
                const status = params.get('status');
                const success = params.get('success');
                const orderIdParam = params.get('orderId');

                if (!trackId || !status || !success || !orderIdParam) {
                    throw new Error('Missing callback parameters.');
                }

                // Find the transaction by trackId
                const transactions = await sdk.request(readItems('transactions', {
                    filter: { trackid: { _eq: trackId } },
                    fields: ['*', 'transaction_order.*'],
                    limit: 1
                }));

                if (!transactions || transactions.length === 0) {
                    throw new Error(`Transaction with Track ID ${trackId} not found.`);
                }
                
                const transaction = transactions[0];
                const order = transaction.transaction_order;
                
                // Update the transaction status
                await sdk.request(updateItem('transactions', transaction.id, { payment_status: status }));

                const isSuccess = success === '1' && status === '2';

                if (isSuccess) {
                    // Update order status to 'completed'. This will trigger the backend flow.
                    // Check status to prevent re-triggering if the page is reloaded.
                    if (order.order_status !== 'completed') {
                        await sdk.request(updateItem('orders', order.id, { order_status: 'completed' }));
                    }
                    
                    // Find package details just for display purposes.
                    const packages = await sdk.request(readItems('packages', {
                        filter: { packname: { _eq: order.order_note } }
                    }));
                    
                    const packsize = (packages && packages.length > 0) ? packages[0].packsize : 0;

                    setMessage(t('paymentSuccessMessage', { count: packsize.toLocaleString(i18n.language) }));
                    setProcessedOrder({
                        id: order.id,
                        note: order.order_note,
                        creditsAdded: packsize > 0 ? packsize : undefined,
                        total: order.order_total,
                    });
                } else {
                    // Payment failed or was canceled. Update status if not already failed.
                    if (order.order_status !== 'failed') {
                        await sdk.request(updateItem('orders', order.id, { order_status: 'failed' }));
                    }
                     setProcessedOrder({
                        id: order.id,
                        note: order.order_note,
                        total: order.order_total,
                    });
                    throw new Error('Payment was not successful.');
                }

            } catch (err: any) {
                setError(err.message || 'An unknown error occurred during payment verification.');
            } finally {
                setLoading(false);
            }
        };

        handleCallback();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleReturn = () => {
        window.location.href = '/#account-orders';
    };

    if (loading) {
        return (
            <CenteredMessage style={{ height: '100vh' }}>
                <Loader />
                <p style={{ marginTop: '1rem', color: 'var(--subtle-text-color)' }}>
                    Verifying your payment, please wait...
                </p>
            </CenteredMessage>
        );
    }

    return (
        <div className="auth-container">
            <div className="card" style={{ maxWidth: '500px', width: '100%', margin: '0 auto', padding: '2rem', textAlign: 'center' }}>
                {error ? (
                    <>
                        <Icon style={{ width: 48, height: 48, color: 'var(--danger-color)', margin: '0 auto 1rem' }}>{ICONS.X_CIRCLE}</Icon>
                        <h2 style={{ color: 'var(--danger-color)' }}>{t('paymentFailed')}</h2>
                        <p style={{ color: 'var(--subtle-text-color)', maxWidth: '400px', margin: '0 auto 1.5rem' }}>{error}</p>
                        {processedOrder && (
                             <div className="table-container-simple" style={{ marginBottom: '2rem', textAlign: 'left' }}>
                                <table className="simple-table">
                                     <tbody>
                                        <tr><td>{t('orderId', { ns: 'orders' })}</td><td style={{textAlign: 'right'}}><strong>#{processedOrder.id}</strong></td></tr>
                                        <tr><td>{t('package')}</td><td style={{textAlign: 'right'}}><strong>{processedOrder.note}</strong></td></tr>
                                    </tbody>
                                </table>
                            </div>
                        )}
                        <div className="form-actions" style={{ justifyContent: 'center' }}>
                            <button onClick={handleReturn} className="btn btn-primary">{t('returnToOrders', { ns: 'orders' })}</button>
                        </div>
                    </>
                ) : (
                    <>
                        <Icon style={{ width: 48, height: 48, color: 'var(--success-color)', margin: '0 auto 1rem' }}>{ICONS.CHECK}</Icon>
                        <h2 style={{ color: 'var(--success-color)' }}>{t('paymentSuccess')}</h2>
                        <p style={{ color: 'var(--subtle-text-color)', maxWidth: '400px', margin: '0 auto 1.5rem' }}>{message}</p>
                        {processedOrder && (
                            <div className="table-container-simple" style={{ marginBottom: '2rem', textAlign: 'left' }}>
                                <table className="simple-table">
                                    <tbody>
                                        <tr><td>{t('orderId', { ns: 'orders' })}</td><td style={{textAlign: 'right'}}><strong>#{processedOrder.id}</strong></td></tr>
                                        <tr><td>{t('package')}</td><td style={{textAlign: 'right'}}><strong>{processedOrder.note}</strong></td></tr>
                                        {processedOrder.creditsAdded && <tr><td>{t('credits', { ns: 'dashboard' })}</td><td style={{textAlign: 'right'}}><strong>+{processedOrder.creditsAdded.toLocaleString(i18n.language)}</strong></td></tr>}
                                        <tr><td>{t('total', { ns: 'common' })}</td><td style={{textAlign: 'right'}}><strong>{processedOrder.total.toLocaleString(i18n.language)} {t('buyCredits:priceIRT')}</strong></td></tr>
                                    </tbody>
                                </table>
                            </div>
                        )}
                        <div className="form-actions" style={{ justifyContent: 'center' }}>
                            <button onClick={handleReturn} className="btn btn-primary">{t('returnToOrders', { ns: 'orders' })}</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default CallbackView;

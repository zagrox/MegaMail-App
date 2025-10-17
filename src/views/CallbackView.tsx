import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { readItems, updateItem } from '@directus/sdk';
import sdk from '../api/directus';
import { apiFetch } from '../api/elasticEmail';
import { useAuth } from '../contexts/AuthContext';
import CenteredMessage from '../components/CenteredMessage';
import Loader from '../components/Loader';
import Icon, { ICONS } from '../components/Icon';
import Button from '../components/Button';

type ProcessedOrder = {
    id: string;
    note: string;
    creditsAdded?: number;
    total: number;
};

const CallbackView = () => {
    const { t } = useTranslation(['buyCredits', 'common', 'orders']);
    const { user, loading: authLoading } = useAuth();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('Verifying your payment, please wait...');
    const [processedOrder, setProcessedOrder] = useState<ProcessedOrder | null>(null);

    useEffect(() => {
        if (authLoading) {
            return; // Wait for auth to initialize before doing anything.
        }

        if (!user) {
            setStatus('error');
            setMessage('Authentication session not found. Please log in and check your orders.');
            return;
        }

        const handleCallback = async () => {
            try {
                const hash = window.location.hash.substring(1);
                const hashQueryString = hash.split('?')[1] || '';
                const searchQueryString = window.location.search.substring(1) || '';
                const params = new URLSearchParams(hashQueryString || searchQueryString);
                
                const trackId = params.get('trackId');
                const statusParam = params.get('status');
                const success = params.get('success');
                const orderIdParam = params.get('orderId');

                if (!trackId || !statusParam || !success || !orderIdParam) {
                    throw new Error('Missing callback parameters.');
                }

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

                if (!order) {
                    throw new Error(`Order for transaction ${transaction.id} could not be loaded.`);
                }
                
                await sdk.request(updateItem('transactions', transaction.id, { payment_status: statusParam }));

                const isSuccess = success === '1' && (statusParam === '1' || statusParam === '2');
                const orderData = { id: order.id, note: order.order_note, total: order.order_total };

                if (isSuccess) {
                    await sdk.request(updateItem('orders', order.id, { order_status: 'completed' }));
                    
                    const packages = await sdk.request(readItems('packages', { filter: { packname: { _eq: order.order_note } } }));
                    if (!packages || packages.length === 0) throw new Error(`Package details for "${order.order_note}" not found.`);
                    
                    const packsize = packages[0].packsize;

                    if (user.elastickey) {
                        await apiFetch('/account/addsubaccountcredits', user.elastickey, {
                            method: 'POST',
                            params: { credits: packsize, notes: `Order #${order.id} via ZibalPay. Track ID: ${trackId}` }
                        });
                        
                        const successMessage = `Payment successful! ${packsize.toLocaleString()} credits have been added to your account.`;
                        setMessage(successMessage);
                        setStatus('success');
                        setProcessedOrder({ ...orderData, creditsAdded: packsize });
                    } else {
                        throw new Error("User API key not found. Could not add credits.");
                    }
                } else {
                    await sdk.request(updateItem('orders', order.id, { order_status: 'failed' }));
                    setProcessedOrder(orderData);
                    throw new Error('Payment was not successful or was cancelled by the user.');
                }

            } catch (err: any) {
                setMessage(err.message || 'An unknown error occurred during payment verification.');
                setStatus('error');
            }
        };

        handleCallback();

    }, [user, authLoading, t]);

    const handleReturnToOrders = () => {
        // Use a full page navigation to ensure the app state is fresh.
        window.location.href = '/#account-orders';
    };

    if (status === 'loading') {
        return (
            <CenteredMessage style={{ height: '100vh' }}>
                <Loader />
                <p style={{ marginTop: '1rem', color: 'var(--subtle-text-color)' }}>
                    {message}
                </p>
            </CenteredMessage>
        );
    }

    const isSuccess = status === 'success';

    return (
        <CenteredMessage style={{ height: '100vh' }}>
            <div className="card" style={{ maxWidth: '500px', width: '100%', padding: '2rem', textAlign: 'center' }}>
                <Icon style={{ width: 48, height: 48, color: `var(--${isSuccess ? 'success' : 'danger'}-color)`, margin: '0 auto 1rem' }}>
                    {isSuccess ? ICONS.CHECK : ICONS.X_CIRCLE}
                </Icon>
                <h2 style={{ color: `var(--${isSuccess ? 'success' : 'danger'}-color)` }}>
                    {isSuccess ? t('paymentSuccess') : t('paymentFailed')}
                </h2>
                <p style={{ color: 'var(--subtle-text-color)', maxWidth: '400px', margin: '0 auto 1.5rem' }}>{message}</p>
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
                    <Button onClick={handleReturnToOrders} className="btn-primary">{t('returnToOrders', { ns: 'orders' })}</Button>
                </div>
            </div>
        </CenteredMessage>
    );
};

export default CallbackView;
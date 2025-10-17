import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { readItems, updateItem } from '@directus/sdk';
import { authenticatedRequest } from '../api/directus';
import { useAuth } from '../contexts/AuthContext';
import { useConfiguration } from '../contexts/ConfigurationContext';
import CenteredMessage from '../components/CenteredMessage';
import Loader from '../components/Loader';
import Icon, { ICONS } from '../components/Icon';

const CallbackView = () => {
    const { t, i18n } = useTranslation(['buyCredits', 'common', 'orders']);
    const { user } = useAuth();
    const { config } = useConfiguration();
    const [status, setStatus] = useState('loading'); // 'loading', 'success', 'error'
    const [message, setMessage] = useState('');
    const [processedOrder, setProcessedOrder] = useState<any | null>(null);

    useEffect(() => {
        if (!user || !config) {
            return;
        }

        const verifyAndPoll = async () => {
            try {
                const params = new URLSearchParams(window.location.hash.split('?')[1] || window.location.search);
                const trackId = params.get('trackId');
                const orderId = params.get('orderId');
                const zibalSuccess = params.get('success');

                if (!trackId || !orderId) {
                    setStatus('error');
                    setMessage('Invalid payment callback URL. Required parameters are missing.');
                    return;
                }

                if (zibalSuccess === '0') {
                    // Payment failed or was canceled at the gateway. No need to poll.
                    try {
                        // FIX: Cast payload to `any` to satisfy Directus SDK type requirements when no schema is present.
                        await authenticatedRequest(updateItem('orders', orderId, { order_status: 'failed' } as any));
                        
                        // Find the transaction and update it.
                        const transactionResponse = await authenticatedRequest(readItems('transactions', {
                            // FIX: Cast filter object to `any` to satisfy Directus SDK type requirements when no schema is present.
                            filter: { trackid: { _eq: trackId } } as any,
                            limit: 1
                        }));

                        const transaction = transactionResponse?.[0];
                        if (transaction) {
                            await authenticatedRequest(updateItem('transactions', transaction.id, {
                                // FIX: Cast payload to `any` to satisfy Directus SDK type requirements when no schema is present.
                                payment_status: 'لغو شده توسط کاربر' // Canceled by user
                            } as any));
                        }

                        setStatus('error');
                        setMessage('The payment was canceled or failed at the payment gateway.');
                    } catch (updateError: any) {
                        setStatus('error');
                        setMessage(`Payment failed, but there was an issue updating the order status: ${updateError.message}`);
                    }
                    return; // Stop execution
                }

                // If success is '1', proceed with server-side verification and polling.
                await authenticatedRequest(updateItem('orders', orderId, {
                    // FIX: Cast payload to `any` to satisfy Directus SDK type requirements when no schema is present.
                    payment_gateway_track_id: trackId,
                    order_status: 'processing'
                } as any));

                // Poll for the final result from the backend.
                for (let i = 0; i < 15; i++) { // Poll for up to 45 seconds
                    const orderResponse = await authenticatedRequest(readItems('orders', {
                        // FIX: Cast filter object and fields array to `any` to satisfy Directus SDK type requirements when no schema is present.
                        filter: { id: { _eq: orderId } } as any,
                        fields: ['id', 'order_status', 'order_note', 'order_total'] as any
                    }));

                    const updatedOrder = orderResponse?.[0];
                    if (updatedOrder) {
                        setProcessedOrder(updatedOrder);
                        if (updatedOrder.order_status === 'completed') {
                            setStatus('success');
                            setMessage('Payment successful! Your order has been processed and credits added to your account.');
                            return;
                        }
                        if (updatedOrder.order_status === 'failed') {
                            setStatus('error');
                            setMessage('The payment failed, was cancelled, or could not be verified.');
                            return;
                        }
                    }
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
                
                setStatus('error');
                setProcessedOrder({ id: orderId });
                setMessage('Verification is taking longer than expected. Please check your Orders page in a few minutes or contact support.');

            } catch (err: any) {
                setStatus('error');
                setMessage(err.message || 'An unknown error occurred while initiating verification.');
            }
        };

        verifyAndPoll();

    }, [user, config, t]);

    const handleReturn = () => {
        window.location.href = '/#account-orders';
    };

    if (status === 'loading') {
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
                {status === 'success' ? (
                     <>
                        <Icon style={{ width: 48, height: 48, color: 'var(--success-color)', margin: '0 auto 1rem' }}>{ICONS.CHECK}</Icon>
                        <h2 style={{ color: 'var(--success-color)' }}>{t('paymentSuccess')}</h2>
                        <p style={{ color: 'var(--subtle-text-color)', maxWidth: '400px', margin: '0 auto 1.5rem' }}>{message}</p>
                    </>
                ) : (
                    <>
                        <Icon style={{ width: 48, height: 48, color: 'var(--danger-color)', margin: '0 auto 1rem' }}>{ICONS.X_CIRCLE}</Icon>
                        <h2 style={{ color: 'var(--danger-color)' }}>{t('paymentFailed')}</h2>
                        <p style={{ color: 'var(--subtle-text-color)', maxWidth: '400px', margin: '0 auto 1.5rem' }}>{message}</p>
                    </>
                )}
                {processedOrder && (
                     <div className="table-container-simple" style={{ marginBottom: '2rem', textAlign: 'left' }}>
                        <table className="simple-table">
                             <tbody>
                                <tr><td>{t('orderId', { ns: 'orders' })}</td><td style={{textAlign: 'right'}}><strong>#{processedOrder.id}</strong></td></tr>
                                {processedOrder.order_note && (
                                     <tr><td>{t('package')}</td><td style={{textAlign: 'right'}}><strong>{processedOrder.order_note}</strong></td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
                <div className="form-actions" style={{ justifyContent: 'center' }}>
                    <button onClick={handleReturn} className="btn btn-primary">{t('returnToOrders', { ns: 'orders' })}</button>
                </div>
            </div>
        </div>
    );
};

export default CallbackView;

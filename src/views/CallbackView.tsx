import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { updateItem, readItems } from '@directus/sdk';
import sdk from '../api/directus';
import { useAuth } from '../contexts/AuthContext';
import { useConfiguration } from '../contexts/ConfigurationContext';
import CenteredMessage from '../components/CenteredMessage';
import Loader from '../components/Loader';
import Icon, { ICONS } from '../components/Icon';
import Button from '../components/Button';

const CallbackView = () => {
    const { t } = useTranslation(['buyCredits', 'common', 'orders']);
    const { user, loading: authLoading } = useAuth();
    const { config, loading: configLoading } = useConfiguration();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState(t('verifyingPayment'));
    const [finalOrder, setFinalOrder] = useState<any | null>(null);

    useEffect(() => {
        const verifyPayment = async () => {
            if (authLoading || configLoading) {
                return; // Wait for auth session and config to initialize
            }

            if (!user || !config) {
                setStatus('error');
                setMessage(t('sessionExpired'));
                return;
            }

            const params = new URLSearchParams(window.location.search || window.location.hash.split('?')[1]);
            const orderId = params.get('orderId');
            const trackId = params.get('trackId');
            const zibalStatus = params.get('status');
            const success = params.get('success');
            
            if (!orderId || !trackId || !zibalStatus || !success) {
                setStatus('error');
                setMessage(t('invalidCallbackParams'));
                return;
            }
            
            // Attempt to fetch order details for display, regardless of outcome
            try {
                const orderResponse = await sdk.request(readItems('orders', {
                    filter: { id: { _eq: orderId } },
                    fields: ['id', 'order_status', 'order_note', 'order_total'],
                    limit: 1
                }));
                if (orderResponse?.[0]) {
                    setFinalOrder(orderResponse[0]);
                }
            } catch (e) {
                console.warn("Could not fetch final order details for display.");
            }

            // Handle cases where user cancelled on bank page or payment failed initially
            if (success !== '1' || zibalStatus !== '2') {
                 try {
                    await sdk.request(updateItem('orders', orderId, { order_status: 'failed' }));
                } catch (updateError) {
                    console.warn(`Could not update order ${orderId} to failed status`, updateError);
                }
                setStatus('error');
                setMessage(t('paymentFailedMessageFull'));
                return;
            }

            // At this point, zibalStatus is '2', meaning potential success. We MUST verify.
            try {
                const zibalVerificationResponse = await fetch("https://gateway.zibal.ir/v1/verify", {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        merchant: config.app_zibal || "62f36ca618f934159dd26c19",
                        trackId: Number(trackId),
                    }),
                });
                if (!zibalVerificationResponse.ok) {
                    throw new Error('Could not connect to payment verification service.');
                }
                const zibalData = await zibalVerificationResponse.json();

                // Update transaction record in Directus with verification result
                const transactions = await sdk.request(readItems('transactions', {
                    filter: { trackid: { _eq: trackId } },
                    limit: 1
                }));
                const transactionId = transactions?.[0]?.id;

                if (transactionId) {
                    await sdk.request(updateItem('transactions', transactionId, {
                        transaction_status: String(zibalData.status),
                        transaction_message: zibalData.message,
                        transaction_ref: zibalData.refNumber,
                        transaction_card: zibalData.cardNumber,
                    }));
                }
                
                // Check Zibal result and update our order status
                if (zibalData.result === 100) { // Zibal success code
                    const updatedOrder = await sdk.request(updateItem('orders', orderId, { order_status: 'completed' }));
                    setFinalOrder(updatedOrder);
                    setStatus('success');
                    setMessage(t('paymentSuccessMessage'));
                } else {
                    await sdk.request(updateItem('orders', orderId, { order_status: 'failed' }));
                    throw new Error(zibalData.message || 'Payment verification failed.');
                }

            } catch (err: any) {
                setStatus('error');
                setMessage(err.message || t('paymentFailedMessageFull'));
                // Try to mark as failed in DB as a last resort
                try {
                     await sdk.request(updateItem('orders', orderId, { order_status: 'failed' }));
                } catch {}
            }
        };

        verifyPayment();

    }, [authLoading, configLoading, user, config, t]);

    const handleReturnToOrders = () => {
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
                {finalOrder && (
                     <div className="table-container-simple" style={{ marginBottom: '2rem', textAlign: 'left' }}>
                        <table className="simple-table">
                             <tbody>
                                <tr><td>{t('orderId', { ns: 'orders' })}</td><td style={{textAlign: 'right'}}><strong>#{finalOrder.id}</strong></td></tr>
                                <tr><td>{t('package')}</td><td style={{textAlign: 'right'}}><strong>{finalOrder.order_note}</strong></td></tr>
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

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { readItems } from '@directus/sdk';
import sdk from '../api/directus';
import { useAuth } from '../contexts/AuthContext';
import CenteredMessage from '../components/CenteredMessage';
import Loader from '../components/Loader';
import Icon, { ICONS } from '../components/Icon';
import Button from '../components/Button';

const CallbackView = () => {
    const { t } = useTranslation(['buyCredits', 'common', 'orders']);
    const { user, loading: authLoading } = useAuth();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState(t('verifyingPayment', { ns: 'buyCredits' }));
    const [finalOrder, setFinalOrder] = useState<any | null>(null);

    useEffect(() => {
        if (authLoading) {
            return; // Wait for auth session to initialize
        }

        if (!user) {
            setStatus('error');
            setMessage(t('sessionExpired', { ns: 'buyCredits' }));
            return;
        }

        const params = new URLSearchParams(window.location.hash.split('?')[1] || window.location.search);
        const orderId = params.get('orderId');

        if (!orderId) {
            setStatus('error');
            setMessage(t('orderIdMissing', { ns: 'buyCredits' }));
            return;
        }

        const poll = async () => {
            try {
                const response = await sdk.request(readItems('orders', {
                    filter: { id: { _eq: orderId }, user_created: { _eq: user.id } },
                    fields: ['id', 'order_status', 'order_note', 'order_total'],
                    limit: 1
                }));

                const order = response?.[0];

                if (order && order.order_status !== 'pending' && order.order_status !== 'processing') {
                    return order; // End polling
                }
                return null; // Continue polling
            } catch (err: any) {
                // Stop polling on a hard error like "Access Denied"
                throw new Error(t('orderStatusError', { ns: 'buyCredits', error: err.message }));
            }
        };

        const intervalId = setInterval(async () => {
            const orderResult = await poll().catch(err => {
                clearInterval(intervalId);
                setStatus('error');
                setMessage(err.message);
            });

            if (orderResult) {
                clearInterval(intervalId);
                setFinalOrder(orderResult);
                if (orderResult.order_status === 'completed') {
                    setStatus('success');
                    setMessage(t('paymentSuccessMessage', { ns: 'buyCredits' }));
                } else {
                    setStatus('error');
                    setMessage(t('paymentFailedMessageFull', { ns: 'buyCredits' }));
                }
            }
        }, 3000); // Poll every 3 seconds

        // Set a timeout to prevent infinite polling
        const timeoutId = setTimeout(() => {
            clearInterval(intervalId);
            if (status === 'loading') {
                setStatus('error');
                setMessage(t('paymentTimeout', { ns: 'buyCredits' }));
            }
        }, 60000); // 1 minute timeout

        return () => {
            clearInterval(intervalId);
            clearTimeout(timeoutId);
        };

    }, [authLoading, user, t]);

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

import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { readItem } from '@directus/sdk';
import sdk from '../api/directus';
import { useAuth } from '../contexts/AuthContext';
import CenteredMessage from '../components/CenteredMessage';
import Loader from '../components/Loader';
import Icon, { ICONS } from '../components/Icon';
import Button from '../components/Button';
import { useConfiguration } from '../contexts/ConfigurationContext';

const CallbackView = () => {
    const { t } = useTranslation(['buyCredits', 'common', 'orders']);
    const { user, loading: authLoading } = useAuth();
    const { config, loading: configLoading } = useConfiguration();
    const [status, setStatus] = useState<'verifying' | 'success' | 'error' | 'timeout'>('verifying');
    const [finalOrder, setFinalOrder] = useState<any | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const pollInterval = useRef<number | null>(null);
    const timeout = useRef<number | null>(null);
    const hasTriggeredVerification = useRef(false);

    const stopTimers = () => {
        if (pollInterval.current) clearInterval(pollInterval.current);
        if (timeout.current) clearTimeout(timeout.current);
        pollInterval.current = null;
        timeout.current = null;
    };

    useEffect(() => {
        return () => stopTimers();
    }, []);

    useEffect(() => {
        // 1. Wait until user and config are fully loaded.
        if (authLoading || configLoading || !user || !config) {
            return;
        }

        // 2. Ensure this logic runs only once.
        if (hasTriggeredVerification.current) {
            return;
        }
        hasTriggeredVerification.current = true;

        const runVerificationAndPoll = async () => {
            const params = new URLSearchParams(window.location.search || window.location.hash.split('?')[1]);
            const orderId = params.get('orderId');
            const trackId = params.get('trackId');

            if (!orderId || !trackId) {
                setStatus('error');
                setErrorMessage(t('invalidCallbackParams'));
                return;
            }

            try {
                // 3. Trigger the backend verification flow as the authenticated user.
                const token = await sdk.getToken();
                const flowUrl = `${config.app_backend}/flows/trigger/e0df8d51-4d1a-4638-994c-28340d21e0fc`;
                const triggerResponse = await fetch(flowUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ trackId, orderId })
                });

                if (!triggerResponse.ok) {
                    throw new Error('Failed to initiate payment verification flow.');
                }
                
                // 4. Start polling for the result.
                const pollOrderStatus = async () => {
                    try {
                        const order = await sdk.request(readItem('orders', orderId, { fields: ['order_status', 'id', 'order_note', 'order_total'] }));
                        setFinalOrder(order);
                        
                        if (order.order_status === 'completed') {
                            setStatus('success');
                            stopTimers();
                        } else if (order.order_status !== 'pending' && order.order_status !== 'processing') {
                            setStatus('error');
                            setErrorMessage(t('paymentFailedMessageFull'));
                            stopTimers();
                        }
                    } catch (pollErr: any) {
                        setStatus('error');
                        setErrorMessage(t('orderStatusError', { error: pollErr.message }));
                        stopTimers();
                    }
                };
                
                pollOrderStatus();
                pollInterval.current = window.setInterval(pollOrderStatus, 3000);

                timeout.current = window.setTimeout(() => {
                    // Check status inside timeout to avoid race conditions
                    setStatus(currentStatus => {
                        if (currentStatus === 'verifying') {
                            stopTimers();
                            return 'timeout';
                        }
                        return currentStatus;
                    });
                }, 45000);

            } catch (triggerErr: any) {
                setStatus('error');
                setErrorMessage(triggerErr.message);
                stopTimers();
            }
        };

        runVerificationAndPoll();

    }, [authLoading, configLoading, user, config, t]);


    const handleReturnToOrders = () => {
        window.location.href = '/#account-orders';
    };

    const renderContent = () => {
        switch (status) {
            case 'success':
                return {
                    icon: ICONS.CHECK,
                    colorClass: 'success',
                    title: t('paymentSuccess'),
                    message: t('paymentSuccessMessage'),
                };
            case 'error':
                 return {
                    icon: ICONS.X_CIRCLE,
                    colorClass: 'danger',
                    title: t('paymentFailed'),
                    message: errorMessage || t('orderStatusError', { error: 'Verification failed.' }),
                };
            case 'timeout':
                 return {
                    icon: ICONS.COMPLAINT,
                    colorClass: 'warning',
                    title: t('paymentFailed'),
                    message: t('paymentTimeout'),
                };
            case 'verifying':
            default:
                return null;
        }
    };

    const content = renderContent();

    if (!content) {
        return (
            <CenteredMessage style={{ height: '100vh' }}>
                <Loader />
                <p style={{ marginTop: '1rem', color: 'var(--subtle-text-color)' }}>
                    {t('verifyingPayment')}
                </p>
            </CenteredMessage>
        );
    }

    return (
         <CenteredMessage style={{ height: '100vh' }}>
            <div className="card" style={{ maxWidth: '500px', width: '100%', padding: '2rem', textAlign: 'center' }}>
                <Icon style={{ width: 48, height: 48, color: `var(--${content.colorClass}-color)`, margin: '0 auto 1rem' }}>
                    {content.icon}
                </Icon>
                <h2 style={{ color: `var(--${content.colorClass}-color)` }}>
                    {content.title}
                </h2>
                <p style={{ color: 'var(--subtle-text-color)', maxWidth: '400px', margin: '0 auto 1.5rem' }}>{content.message}</p>
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

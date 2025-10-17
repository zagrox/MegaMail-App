import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { readItems, updateItem } from '@directus/sdk';
import sdk from '../api/directus';
import { apiFetch } from '../api/elasticEmail';
import { useAuth } from '../contexts/AuthContext';
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
    const { t } = useTranslation(['buyCredits', 'common']);
    const { user, loading: authLoading } = useAuth();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('Verifying your payment, please wait...');

    useEffect(() => {
        const channel = new BroadcastChannel('payment_channel');

        if (authLoading) {
            return; // Wait for auth to initialize
        }

        if (!user) {
            setStatus('error');
            const errorMessage = 'Authentication session not found. Please log in and check your orders.';
            setMessage(errorMessage);
            channel.postMessage({ status: 'error', message: errorMessage });
            setTimeout(() => window.close(), 3000);
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
                        channel.postMessage({ status: 'success', order: { ...orderData, creditsAdded: packsize }, message: successMessage });
                    } else {
                        throw new Error("User API key not found. Could not add credits.");
                    }
                } else {
                    await sdk.request(updateItem('orders', order.id, { order_status: 'failed' }));
                    throw new Error('Payment was not successful or was cancelled.');
                }

            } catch (err: any) {
                setMessage(err.message || 'An unknown error occurred during payment verification.');
                setStatus('error');
                channel.postMessage({ status: 'error', message: err.message });
            } finally {
                setTimeout(() => window.close(), 2000); // Attempt to close the tab after showing the message
            }
        };

        handleCallback();

        return () => {
            channel.close();
        };
    }, [user, authLoading, t]);

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

    return (
        <CenteredMessage style={{ height: '100vh' }}>
            {status === 'success' ? (
                 <Icon style={{ width: 48, height: 48, color: 'var(--success-color)', margin: '0 auto 1rem' }}>{ICONS.CHECK}</Icon>
            ) : (
                 <Icon style={{ width: 48, height: 48, color: 'var(--danger-color)', margin: '0 auto 1rem' }}>{ICONS.X_CIRCLE}</Icon>
            )}
            <h2 style={{ color: status === 'success' ? 'var(--success-color)' : 'var(--danger-color)' }}>
                {status === 'success' ? t('paymentSuccess') : t('paymentFailed')}
            </h2>
            <p style={{ color: 'var(--subtle-text-color)', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
                {message}
            </p>
            <p style={{ marginTop: '1rem', color: 'var(--subtle-text-color)', fontSize: '0.9rem' }}>
                {t('youCanCloseThisTab', { ns: 'buyCredits', defaultValue: 'You can now close this tab. Your original window has been updated.' })}
            </p>
        </CenteredMessage>
    );
};

export default CallbackView;
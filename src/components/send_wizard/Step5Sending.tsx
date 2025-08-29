import React, { useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import WizardLayout from './WizardLayout';
import Icon, { ICONS } from '../Icon';
import useApiV4 from '../../hooks/useApiV4';
import useApi from '../../views/useApi';
import Loader from '../Loader';

const SummaryItem = ({ label, value }: { label: string, value: React.ReactNode }) => {
    if (!value && value !== 0) return null;
    return (
        <>
            <dt>{label}</dt>
            <dd style={{ textAlign: 'right', wordBreak: 'break-all' }}>{value}</dd>
        </>
    );
};

const Step5Sending = ({ onSubmit, onBack, data, updateData, apiKey, isSubmitting }: { onSubmit: () => void; onBack: () => void; data: any; updateData: (d: any) => void; apiKey: string; isSubmitting: boolean; }) => {
    const { t, i18n } = useTranslation();
    const { data: domains, loading: domainsLoading } = useApiV4('/domains', apiKey, {});
    const { data: accountData, loading: balanceLoading } = useApi('/account/load', apiKey, {}, apiKey ? 1 : 0);

    const userBalance = accountData?.emailcredits ?? 0;
    const creditsNeeded = data.recipientCount || 0;
    const hasEnoughCredits = userBalance >= creditsNeeded;

    const isSendingAction = data.sendAction === 'schedule' || data.sendAction === 'now';
    const isSubmitDisabled = (isSendingAction && !hasEnoughCredits) || domainsLoading;

    const defaultFromEmail = useMemo(() => {
        if (!Array.isArray(domains)) return '................@.................';

        const verifiedDomains = domains.filter(d =>
            String(d.Spf).toLowerCase() === 'true' &&
            String(d.Dkim).toLowerCase() === 'true'
        );

        if (verifiedDomains.length > 0) {
            return verifiedDomains[0].DefaultSender || `mailer@${verifiedDomains[0].Domain}`;
        }

        return 'no-verified-domain@found.com';
    }, [domains]);

    useEffect(() => {
        if (data.sendAction === 'schedule' && !data.scheduleDateTime) {
            const now = new Date();
            now.setMinutes(now.getMinutes() + 5); // Default to 5 mins in the future
            now.setSeconds(0);
            now.setMilliseconds(0);
            const yyyy = now.getFullYear();
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const dd = String(now.getDate()).padStart(2, '0');
            const HH = String(now.getHours()).padStart(2, '0');
            const MM = String(now.getMinutes()).padStart(2, '0');
            updateData({ scheduleDateTime: `${yyyy}-${mm}-${dd}T${HH}:${MM}` });
        }
    }, [data.sendAction, data.scheduleDateTime, updateData]);

    const handleSelect = (action: string) => {
        updateData({ sendAction: action });
    };

    const trackingStatus = [data.trackOpens && 'Opens', data.trackClicks && 'Clicks'].filter(Boolean).join(' & ') || 'Disabled';
    
    let optimizationStatus = 'Disabled';
    if (data.sendTimeOptimization) {
        if (data.deliveryOptimization === 'ToEngagedFirst') {
            optimizationStatus = t('sendToEngagedFirst');
        } else if (data.enableSendTimeOptimization) {
            optimizationStatus = t('sendAtOptimalTime');
        }
    }

    let sendTimeStatus = '';
    if (data.sendAction === 'now') {
        sendTimeStatus = 'Immediately';
    } else if (data.sendAction === 'schedule' && data.scheduleDateTime) {
        try {
            sendTimeStatus = new Date(data.scheduleDateTime).toLocaleString(i18n.language, { dateStyle: 'medium', timeStyle: 'short' });
        } catch (e) {
            sendTimeStatus = 'Invalid Date';
        }
    } else if (data.sendAction === 'later') {
        sendTimeStatus = 'Saved as Draft';
    }
    
    const recipientValueStyle: React.CSSProperties = {
        fontWeight: 'bold',
        color: hasEnoughCredits ? 'var(--secondary-color)' : 'var(--danger-color)',
    };


    return (
        <WizardLayout
            step={5}
            title="Sending & Summary"
            onNext={onSubmit}
            onBack={onBack}
            isLastStep
            isSubmitting={isSubmitting}
            nextDisabled={isSubmitDisabled}
        >
            <div className="sending-options-list">
                <label
                    htmlFor="sendAction-schedule"
                    className={`selection-card sending-option-card ${data.sendAction === 'schedule' ? 'selected' : ''}`}
                >
                    <input
                        type="radio"
                        id="sendAction-schedule"
                        name="sendAction"
                        value="schedule"
                        checked={data.sendAction === 'schedule'}
                        onChange={() => handleSelect('schedule')}
                        style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                    />
                    <div className="selection-card-radio"></div>
                    <div className="sending-option-card-content">
                        <div className="sending-option-card-details">
                            <h4 className="sending-option-card-title">Schedule</h4>
                            {data.sendAction === 'schedule' && (
                                <input
                                    type="datetime-local"
                                    className="sending-option-datetime-input"
                                    value={data.scheduleDateTime}
                                    onChange={(e) => updateData({ scheduleDateTime: e.target.value })}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            )}
                        </div>
                        <Icon path={ICONS.CALENDAR} className="sending-option-card-icon" />
                    </div>
                </label>
                <label
                    htmlFor="sendAction-now"
                    className={`selection-card sending-option-card ${data.sendAction === 'now' ? 'selected' : ''}`}
                >
                    <input
                        type="radio"
                        id="sendAction-now"
                        name="sendAction"
                        value="now"
                        checked={data.sendAction === 'now'}
                        onChange={() => handleSelect('now')}
                        style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                    />
                    <div className="selection-card-radio"></div>
                    <div className="sending-option-card-content">
                        <h4 className="sending-option-card-title">Send Now</h4>
                        <Icon path={ICONS.SEND_EMAIL} className="sending-option-card-icon" />
                    </div>
                </label>
                <label
                    htmlFor="sendAction-later"
                    className={`selection-card sending-option-card ${data.sendAction === 'later' ? 'selected' : ''}`}
                >
                    <input
                        type="radio"
                        id="sendAction-later"
                        name="sendAction"
                        value="later"
                        checked={data.sendAction === 'later'}
                        onChange={() => handleSelect('later')}
                        style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                    />
                    <div className="selection-card-radio"></div>
                    <div className="sending-option-card-content">
                        <h4 className="sending-option-card-title">Save for Later</h4>
                        <Icon path={ICONS.SAVE_CHANGES} className="sending-option-card-icon" />
                    </div>
                </label>
            </div>

            <div className="final-summary">
                <h4 style={{marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem'}}>Final Summary</h4>
                <dl className="contact-details-grid">
                    <SummaryItem label="From Name" value={data.fromName} />
                    <SummaryItem label="Subject" value={data.subject} />
                    <SummaryItem 
                        label="Recipients" 
                        value={
                            balanceLoading || data.isCountLoading ? <Loader /> : (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', textAlign: 'right' }}>
                                    <span style={recipientValueStyle}>
                                        {data.recipientCount?.toLocaleString(i18n.language)}
                                    </span>
                                    {!hasEnoughCredits && (
                                        <small style={{ color: 'var(--danger-color)', marginTop: '0.25rem' }}>
                                            Insufficient funds
                                        </small>
                                    )}
                                </div>
                            )
                        } 
                    />
                    <SummaryItem label="From Email" value={domainsLoading ? 'Loading...' : defaultFromEmail} />
                    <SummaryItem label="Reply To" value={data.enableReplyTo ? data.replyTo : null} />
                    
                    <dt className="grid-separator"></dt>
                    
                    <SummaryItem label="Campaign Name" value={data.campaignName} />
                    <SummaryItem label="Template" value={data.template} />
                    <SummaryItem label="Send Time" value={sendTimeStatus} />
                    <SummaryItem label="Tracking" value={trackingStatus} />
                    <SummaryItem label="Time Optimization" value={optimizationStatus} />
                </dl>
            </div>
        </WizardLayout>
    );
};

export default Step5Sending;

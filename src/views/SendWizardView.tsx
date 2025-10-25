import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { apiFetchV4 } from '../api/elasticEmail';
import useApiV4 from '../hooks/useApiV4';
import { useToast } from '../contexts/ToastContext';
import Step1SelectType from '../components/send_wizard/Step1SelectType';
import Step2Recipients from '../components/send_wizard/Step2Recipients';
import Step3Content from '../components/send_wizard/Step3Content';
import Step4Settings from '../components/send_wizard/Step4Settings';
import Step5Sending from '../components/send_wizard/Step5Sending';
import Icon, { ICONS } from '../components/Icon';

const MarketingView = ({ apiKey, setView, campaignToLoad }: { apiKey: string, setView: (view: string, data?: any) => void, campaignToLoad?: any }) => {
    const { t } = useTranslation(['send-wizard', 'sendEmail', 'common']);
    const { addToast } = useToast();
    const [step, setStep] = useState(1);
    const [maxStep, setMaxStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { data: domains, loading: domainsLoading } = useApiV4('/domains', apiKey, {});

    const [campaignData, setCampaignData] = useState({
        type: '',
        recipientTarget: null as 'all' | 'list' | 'segment' | null,
        recipients: { listNames: [] as string[], segmentNames: [] as string[] },
        recipientCount: null as number | null,
        isCountLoading: false,
        template: null as string | null,
        fromName: '',
        subject: '',
        enableReplyTo: false,
        replyTo: '',
        campaignName: '',
        sendTimeOptimization: false,
        deliveryOptimization: 'None',
        enableSendTimeOptimization: false,
        trackOpens: true,
        trackClicks: true,
        utmEnabled: false,
        utm: {
            Source: '',
            Medium: '',
            Campaign: '',
            Content: '',
        },
        sendAction: 'schedule',
        scheduleDateTime: ''
    });

    const updateData = useCallback((newData: Partial<typeof campaignData>) => {
        setCampaignData(prev => ({ ...prev, ...newData }));
    }, []);

    const verifiedDomains = useMemo(() => {
        if (!Array.isArray(domains)) return [];
        return domains.filter(d => String(d.Spf).toLowerCase() === 'true' && String(d.Dkim).toLowerCase() === 'true');
    }, [domains]);

    useEffect(() => {
        if (campaignToLoad && !domainsLoading) {
            const loadedContent = campaignToLoad.Content?.[0] || {};
            const loadedRecipients = campaignToLoad.Recipients || {};
            const loadedOptions = campaignToLoad.Options || {};

            let recipientTarget: 'all' | 'list' | 'segment' | null = null;
            if (loadedRecipients.ListNames?.length > 0) {
                recipientTarget = 'list';
            } else if (loadedRecipients.SegmentNames?.includes('All Contacts')) {
                recipientTarget = 'all';
            } else if (loadedRecipients.SegmentNames?.length > 0) {
                recipientTarget = 'segment';
            } else if (campaignToLoad.Status?.toLowerCase() === 'draft' && Object.keys(loadedRecipients).length === 0) {
                recipientTarget = 'all';
            }

            const fromString = loadedContent.From || '';
            let fromName = '';
            let fromEmail = '';

            const angleBracketMatch = fromString.match(/(.*)<(.*)>/);
            if (angleBracketMatch && angleBracketMatch.length === 3) {
                fromName = angleBracketMatch[1].trim().replace(/"/g, '');
                fromEmail = angleBracketMatch[2].trim();
            } else {
                fromEmail = fromString.trim();
            }

            const isEmailValid = fromEmail && fromEmail.includes('@') && !fromEmail.endsWith('@');
            const domainPart = isEmailValid ? fromEmail.split('@')[1] : '';
            const isDomainVerified = verifiedDomains.some(d => d.Domain === domainPart);

            let finalFromName = fromName;
            if (!isEmailValid || !isDomainVerified) {
                if (verifiedDomains.length > 0) {
                    const firstDomain = verifiedDomains[0];
                    const defaultSender = firstDomain.DefaultSender;
                    const defaultMatch = defaultSender?.match(/(.*)<(.*)>/);
                    if (defaultMatch) {
                        finalFromName = defaultMatch[1].trim().replace(/"/g, '');
                    } else {
                        finalFromName = '';
                    }
                } else {
                    finalFromName = '';
                }
            }

            const newCampaignData = {
                type: 'regular',
                recipientTarget,
                recipients: {
                    listNames: loadedRecipients.ListNames || [],
                    segmentNames: loadedRecipients.SegmentNames || [],
                },
                template: loadedContent.TemplateName || null,
                fromName: finalFromName,
                subject: loadedContent.Subject || '',
                enableReplyTo: !!loadedContent.ReplyTo,
                replyTo: loadedContent.ReplyTo || '',
                campaignName: campaignToLoad.Name || '',
                trackOpens: loadedOptions.TrackOpens !== false,
                trackClicks: loadedOptions.TrackClicks !== false,
                sendTimeOptimization: loadedOptions.DeliveryOptimization !== 'None' || loadedOptions.EnableSendTimeOptimization,
                deliveryOptimization: loadedOptions.DeliveryOptimization || 'None',
                enableSendTimeOptimization: loadedOptions.EnableSendTimeOptimization || false,
                utmEnabled: !!loadedContent.Utm,
                utm: loadedContent.Utm || { Source: '', Medium: '', Campaign: '', Content: '' },
            };

            setCampaignData(prev => ({ ...prev, ...newCampaignData }));
            setStep(2);
            setMaxStep(5);
        }
    }, [campaignToLoad, verifiedDomains, domainsLoading]);

    const nextStep = () => setStep(s => {
        const next = s + 1;
        setMaxStep(ms => Math.max(ms, next));
        return next;
    });
    const prevStep = () => setStep(s => s - 1);
    const goToStep = (targetStep: number) => {
        if (targetStep <= maxStep) {
            setStep(targetStep);
        }
    };
    const goToDashboard = () => setView('Dashboard');

    const stepsInfo = [
        { number: 1, title: t('selectCampaignType') },
        { number: 2, title: t('selectAudience') },
        { number: 3, title: t('designContent') },
        { number: 4, title: t('campaignSettings') },
        { number: 5, title: t('reviewAndSend') },
    ];

    const handleSubmit = async () => {
        setIsSubmitting(true);
        const action = campaignData.sendAction === 'later' ? 'draft' : 'send';
    
        try {
            if (action === 'send') {
                const isRecipientSelected =
                    campaignData.recipientTarget === 'all' ||
                    (campaignData.recipientTarget === 'list' && campaignData.recipients.listNames.length > 0) ||
                    (campaignData.recipientTarget === 'segment' && campaignData.recipients.segmentNames.length > 0);
    
                if (!isRecipientSelected) {
                    throw new Error(t('selectRecipientsToSend', { ns: 'sendEmail' }));
                }
            }
    
            const defaultSender = (verifiedDomains.length > 0) ? verifiedDomains[0].DefaultSender : undefined;
    
            let fromEmail = '';
            if (defaultSender) {
                const emailMatch = defaultSender.match(/<([^>]+)>/);
                if (emailMatch?.[1]) {
                    fromEmail = emailMatch[1];
                } else {
                    fromEmail = defaultSender.split(/[\s(<>)]+/).filter(p => p.includes('@'))[0] || defaultSender;
                }
            }
    
            const fromName = campaignData.fromName?.trim() || '';
            const combinedFrom = fromName ? `${fromName} <${fromEmail}>` : fromEmail;
    
            const contentPayload = {
                From: combinedFrom,
                ReplyTo: campaignData.enableReplyTo && campaignData.replyTo ? campaignData.replyTo : '',
                Subject: campaignData.subject || undefined,
                TemplateName: campaignData.template || undefined,
                Utm: campaignData.utmEnabled ? campaignData.utm : null,
                Body: null
            };
    
            const optionsPayload = {
                TrackOpens: campaignData.trackOpens,
                TrackClicks: campaignData.trackClicks,
                DeliveryOptimization: campaignData.deliveryOptimization,
                EnableSendTimeOptimization: campaignData.enableSendTimeOptimization,
                ScheduleFor: (action === 'send' && campaignData.sendAction === 'schedule' && campaignData.scheduleDateTime)
                    ? new Date(campaignData.scheduleDateTime).toISOString()
                    : undefined,
            };
    
            const finalRecipients: { ListNames: string[]; SegmentNames: string[] } = {
                ListNames: campaignData.recipients.listNames || [],
                SegmentNames: campaignData.recipients.segmentNames || []
            };
    
            const payload = {
                Name: campaignData.campaignName || undefined,
                Status: action === 'send' ? 'Active' : 'Draft',
                Content: [contentPayload],
                Recipients: finalRecipients,
                Options: optionsPayload,
            };
    
            const method = campaignToLoad ? 'PUT' : 'POST';
            const endpoint = campaignToLoad ? `/campaigns/${encodeURIComponent(campaignToLoad.Name)}` : '/campaigns';
    
            // Use JSON.parse(JSON.stringify()) to strip out any keys with `undefined` values before sending
            await apiFetchV4(endpoint, apiKey, { method, body: JSON.parse(JSON.stringify(payload)) });
    
            addToast(payload.Status === 'Draft' ? t('draftSavedSuccess', { ns: 'sendEmail' }) : t('emailSentSuccess', { ns: 'sendEmail' }), 'success');
            setView('Campaigns');
    
        } catch (err: any) {
            const errorKey = action === 'draft' ? 'draftSaveError' : 'emailSentError';
            addToast(t(errorKey, { ns: 'sendEmail', error: err.message }), 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const payloadForDisplay = useMemo(() => {
        const defaultSender = (verifiedDomains.length > 0) ? verifiedDomains[0].DefaultSender : undefined;
        let fromEmail = '';
        if (defaultSender) {
            const emailMatch = defaultSender.match(/<([^>]+)>/);
            if (emailMatch?.[1]) {
                fromEmail = emailMatch[1];
            } else {
                fromEmail = defaultSender.split(/[\s(<>)]+/).filter(p => p.includes('@'))[0] || defaultSender;
            }
        }
        const fromName = campaignData.fromName?.trim() || '';
        const combinedFrom = fromName ? `${fromName} <${fromEmail}>` : fromEmail;
        const contentPayload: { [key: string]: any } = {
            From: combinedFrom,
            ReplyTo: campaignData.enableReplyTo && campaignData.replyTo ? campaignData.replyTo : '',
        };
        if (campaignData.subject) contentPayload.Subject = campaignData.subject;
        if (campaignData.template) contentPayload.TemplateName = campaignData.template;
        if (campaignData.utmEnabled) contentPayload.Utm = campaignData.utm;

        const optionsPayload = {
            TrackOpens: campaignData.trackOpens,
            TrackClicks: campaignData.trackClicks,
            DeliveryOptimization: campaignData.deliveryOptimization,
            EnableSendTimeOptimization: campaignData.enableSendTimeOptimization,
            ScheduleFor: (campaignData.sendAction === 'schedule' && campaignData.scheduleDateTime) ? new Date(campaignData.scheduleDateTime).toISOString() : undefined,
        };

        const recipients: { ListNames: string[]; SegmentNames: string[]; } = { ListNames: [], SegmentNames: [] };
        switch (campaignData.recipientTarget) {
            case 'list':
                recipients.ListNames = campaignData.recipients.listNames || [];
                break;
            case 'segment':
                recipients.SegmentNames = campaignData.recipients.segmentNames || [];
                break;
            case 'all':
                recipients.SegmentNames = ['All Contacts'];
                break;
        }

        const action = campaignData.sendAction === 'later' ? 'draft' : 'send';
        const isRecipientSelected = campaignData.recipientTarget === 'all' || recipients.ListNames.length > 0 || recipients.SegmentNames.length > 0;
        const status = action === 'send' && isRecipientSelected ? 'Active' : 'Draft';

        const payload: { [key: string]: any } = {
            Name: campaignData.campaignName || undefined,
            Status: status,
            Content: [contentPayload],
            Recipients: recipients,
            Options: optionsPayload,
        };
        return JSON.stringify(JSON.parse(JSON.stringify(payload)), null, 2);
    }, [campaignData, verifiedDomains]);

    const renderStepContent = () => {
        switch (step) {
            case 1:
                return <Step1SelectType onNext={nextStep} onBack={goToDashboard} data={campaignData} updateData={updateData} />;
            case 2:
                return <Step2Recipients onNext={nextStep} onBack={prevStep} data={campaignData} updateData={updateData} apiKey={apiKey} />;
            case 3:
                return <Step3Content onNext={nextStep} onBack={prevStep} data={campaignData} updateData={updateData} apiKey={apiKey} setView={setView} />;
            case 4:
                return <Step4Settings onNext={nextStep} onBack={prevStep} data={campaignData} updateData={updateData} />;
            case 5:
                return <Step5Sending onSubmit={handleSubmit} onBack={prevStep} data={campaignData} updateData={updateData} apiKey={apiKey} isSubmitting={isSubmitting} payloadForDisplay={payloadForDisplay} />;
            default:
                return <Step1SelectType onNext={nextStep} onBack={goToDashboard} data={campaignData} updateData={updateData} />;
        }
    };

    return (
        <div className="wizard-layout-container">
            <aside className="wizard-sidebar">
                <div className="wizard-sidebar-header">
                    <h4>{t('campaignSteps')}</h4>
                </div>
                <div className="wizard-sidebar-steps">
                    {stepsInfo.map(({ number, title }) => {
                        const isCompleted = number < step;
                        const isActive = number === step;
                        const isNavigable = number <= maxStep;

                        let statusClass = '';
                        if (isActive) statusClass = 'active';
                        else if (isCompleted) statusClass = 'completed';

                        return (
                            <button
                                key={number}
                                className={`wizard-sidebar-step ${statusClass}`}
                                onClick={() => goToStep(number)}
                                disabled={!isNavigable}
                                aria-current={isActive ? 'step' : undefined}
                            >
                                <div className="wizard-step-number">
                                    {isCompleted ? <Icon>{ICONS.CHECK}</Icon> : <span>{number}</span>}
                                </div>
                                <span className="wizard-step-title">{title}</span>
                            </button>
                        );
                    })}
                </div>
            </aside>
            <main className="wizard-content">
                {renderStepContent()}
            </main>
        </div>
    );
};

export default MarketingView;
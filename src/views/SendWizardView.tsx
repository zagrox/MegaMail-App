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
    const { data: domains } = useApiV4('/domains', apiKey, {});

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

    useEffect(() => {
        if (campaignToLoad) {
            const loadedContent = campaignToLoad.Content?.[0] || {};
            const loadedRecipients = campaignToLoad.Recipients || {};
            const loadedOptions = campaignToLoad.Options || {};

            let recipientTarget: 'all' | 'list' | 'segment' | null = null;
            if (loadedRecipients.ListNames?.length > 0) {
                recipientTarget = 'list';
            } else if (loadedRecipients.SegmentNames?.length > 0 && loadedRecipients.SegmentNames.includes('All Contacts')) {
                recipientTarget = 'all';
            } else if (loadedRecipients.SegmentNames?.length > 0) {
                recipientTarget = 'segment';
            } else if (Object.keys(loadedRecipients).length === 0) {
                recipientTarget = 'all';
            }

            const fromString = loadedContent.From || '';
            let fromName = loadedContent.FromName;
            if (!fromName) {
                const angleBracketMatch = fromString.match(/(.*)<.*>/);
                if (angleBracketMatch) {
                    fromName = angleBracketMatch[1].trim().replace(/"/g, '');
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
                fromName: fromName || '',
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
                sendAction: 'schedule', // Default action
                scheduleDateTime: '',
            };

            // This directly sets the state, merging the new data
            setCampaignData(prev => ({ ...prev, ...newCampaignData }));
            
            setStep(2); // Start at recipients step
            setMaxStep(5); // Allow navigation to all steps
        }
    }, [campaignToLoad]);

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

            // 1. Construct a temporary state object that mirrors SendEmailView's `campaign` state.
            const verifiedDomains = (domains || []).filter((d: any) => String(d.Spf).toLowerCase() === 'true' && String(d.Dkim).toLowerCase() === 'true');
            const defaultFromEmail = (verifiedDomains.length > 0) ? (verifiedDomains[0].DefaultSender || `mailer@${verifiedDomains[0].Domain}`) : 'draft@example.com';

            let plainDefaultEmail = defaultFromEmail;
            const emailMatch = defaultFromEmail.match(/<([^>]+)>/);
            if (emailMatch?.[1]) {
                plainDefaultEmail = emailMatch[1];
            } else {
                const parts = defaultFromEmail.split(/[\s(<>)]+/).filter(p => p.includes('@'));
                if (parts.length > 0) plainDefaultEmail = parts[0];
            }

            const campaignForPayload = {
                Name: campaignData.campaignName,
                Content: [{
                    From: plainDefaultEmail,
                    FromName: campaignData.fromName,
                    ReplyTo: campaignData.enableReplyTo ? campaignData.replyTo : '',
                    Subject: campaignData.subject,
                    TemplateName: campaignData.template || '',
                    Utm: campaignData.utmEnabled ? campaignData.utm : null,
                    Body: null
                }],
                Recipients: {
                    ListNames: campaignData.recipientTarget === 'list' ? campaignData.recipients.listNames : [],
                    SegmentNames: campaignData.recipientTarget === 'segment' ? campaignData.recipients.segmentNames : []
                },
                Options: {
                    TrackOpens: campaignData.trackOpens,
                    TrackClicks: campaignData.trackClicks,
                    DeliveryOptimization: campaignData.deliveryOptimization,
                    EnableSendTimeOptimization: campaignData.enableSendTimeOptimization,
                    ScheduleFor: (action === 'send' && campaignData.sendAction === 'schedule' && campaignData.scheduleDateTime)
                        ? new Date(campaignData.scheduleDateTime).toISOString()
                        : undefined,
                }
            };

            // 2. Now use the exact, proven logic from SendEmailView.tsx to finalize the payload
            const payload = JSON.parse(JSON.stringify(campaignForPayload));

            payload.Content = payload.Content.map((c: any) => {
                const fromEmail = c.From;
                const fromName = c.FromName?.trim();
                const combinedFrom = fromName ? `${fromName} <${fromEmail}>` : fromEmail;
                const newContent = { ...c, From: combinedFrom };
                delete newContent.FromName;
                return newContent;
            });

            payload.Status = action === 'send' ? 'Active' : 'Draft';
            payload.Content = payload.Content.map((c: any) => ({...c, Body: null, TemplateName: c.TemplateName || null}));
                
            let finalRecipients: { ListNames?: string[]; SegmentNames?: string[] } = {};
            switch (campaignData.recipientTarget) {
                case 'list':
                    finalRecipients = { ListNames: payload.Recipients.ListNames || [] };
                    break;
                case 'segment':
                    finalRecipients = { SegmentNames: payload.Recipients.SegmentNames || [] };
                    break;
                case 'all':
                    if (!campaignToLoad) {
                        finalRecipients = { SegmentNames: ['All Contacts'] };
                    } else {
                        finalRecipients = {};
                    }
                    break;
                default:
                    finalRecipients = { ListNames: [], SegmentNames: [] };
                    break;
            }
            payload.Recipients = finalRecipients;

            if (!payload.Options.ScheduleFor) delete payload.Options.ScheduleFor;

            const method = campaignToLoad ? 'PUT' : 'POST';
            const endpoint = campaignToLoad ? `/campaigns/${encodeURIComponent(campaignToLoad.Name)}` : '/campaigns';

            await apiFetchV4(endpoint, apiKey, { method, body: payload });
            
            addToast(payload.Status === 'Draft' ? t('draftSavedSuccess', { ns: 'sendEmail' }) : t('emailSentSuccess', { ns: 'sendEmail' }), 'success');
            setView('Campaigns');

        } catch (err: any) {
            const errorKey = action === 'draft' ? 'draftSaveError' : 'emailSentError';
            addToast(t(errorKey, { ns: 'sendEmail', error: err.message }), 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

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
                return <Step5Sending onSubmit={handleSubmit} onBack={prevStep} data={campaignData} updateData={updateData} apiKey={apiKey} isSubmitting={isSubmitting} />;
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

import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { apiFetchV4 } from '../api/elasticEmail';
import useApiV4 from '../hooks/useApiV4';
import { useToast } from '../contexts/ToastContext';
import Step1SelectType from '../components/send_wizard/Step1SelectType';
import Step2Recipients from '../components/send_wizard/Step2Recipients';
import Step3Content from '../components/send_wizard/Step3Content';
import Step4Settings from '../components/send_wizard/Step4Settings';
import Step5Sending from '../components/send_wizard/Step5Sending';

const SendWizardView = ({ apiKey, setView }: { apiKey: string, setView: (view: string) => void }) => {
    const { t } = useTranslation();
    const { addToast } = useToast();
    const [step, setStep] = useState(1);
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

    const nextStep = () => setStep(s => s + 1);
    const prevStep = () => setStep(s => s - 1);
    const goToDashboard = () => setView('Dashboard');

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const verifiedDomains = (domains || []).filter((d: any) =>
                String(d.Spf).toLowerCase() === 'true' &&
                String(d.Dkim).toLowerCase() === 'true'
            );
    
            if (verifiedDomains.length === 0) {
                throw new Error("No verified sending domain available. Please configure a domain in your account settings.");
            }
    
            const defaultFromEmail = verifiedDomains[0].DefaultSender || `mailer@${verifiedDomains[0].Domain}`;
    
            const payload: any = {
                Name: campaignData.campaignName,
                Status: campaignData.sendAction === 'later' ? 'Draft' : 'Active',
                Content: [
                    {
                        From: campaignData.fromName ? `${campaignData.fromName} <${defaultFromEmail}>` : defaultFromEmail,
                        ReplyTo: campaignData.enableReplyTo ? campaignData.replyTo : undefined,
                        Subject: campaignData.subject,
                        TemplateName: campaignData.template,
                        Utm: campaignData.utmEnabled ? campaignData.utm : undefined,
                    }
                ],
                Recipients: {},
                Options: {
                    TrackOpens: campaignData.trackOpens,
                    TrackClicks: campaignData.trackClicks,
                    ScheduleFor: campaignData.sendAction === 'schedule' && campaignData.scheduleDateTime 
                        ? new Date(campaignData.scheduleDateTime).toISOString() 
                        : null,
                    DeliveryOptimization: campaignData.deliveryOptimization,
                    EnableSendTimeOptimization: campaignData.enableSendTimeOptimization,
                }
            };
    
            if (campaignData.recipientTarget === 'list') {
                payload.Recipients = { ListNames: campaignData.recipients.listNames };
            } else if (campaignData.recipientTarget === 'segment') {
                payload.Recipients = { SegmentNames: campaignData.recipients.segmentNames };
            } else if (campaignData.recipientTarget === 'all') {
                payload.Recipients = {};
            }
    
            // Clean up undefined/null properties to not send them in the payload
            if (!payload.Content[0].ReplyTo) delete payload.Content[0].ReplyTo;
            if (!payload.Content[0].Utm || Object.values(payload.Content[0].Utm).every(v => !v)) delete payload.Content[0].Utm;
            if (!payload.Options.ScheduleFor) delete payload.Options.ScheduleFor;
    
            await apiFetchV4('/campaigns', apiKey, { method: 'POST', body: payload });
            
            addToast(payload.Status === 'Draft' ? t('draftSavedSuccess') : t('emailSentSuccess'), 'success');
            setView('Campaigns');
    
        } catch (err: any) {
            addToast(t('emailSentError', { error: err.message }), 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderStep = () => {
        switch (step) {
            case 1:
                return <Step1SelectType onNext={nextStep} onBack={goToDashboard} data={campaignData} updateData={updateData} />;
            case 2:
                return <Step2Recipients onNext={nextStep} onBack={prevStep} data={campaignData} updateData={updateData} apiKey={apiKey} />;
            case 3:
                return <Step3Content onNext={nextStep} onBack={prevStep} data={campaignData} updateData={updateData} apiKey={apiKey} />;
            case 4:
                return <Step4Settings onNext={nextStep} onBack={prevStep} data={campaignData} updateData={updateData} />;
            case 5:
                return <Step5Sending onSubmit={handleSubmit} onBack={prevStep} data={campaignData} updateData={updateData} apiKey={apiKey} isSubmitting={isSubmitting} />;
            default:
                return <Step1SelectType onNext={nextStep} onBack={goToDashboard} data={campaignData} updateData={updateData} />;
        }
    };

    return (
        <div className="wizard-container">
            {renderStep()}
        </div>
    );
};

export default SendWizardView;
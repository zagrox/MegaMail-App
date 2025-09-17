import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Icon, { ICONS } from '../components/Icon';
import Modal from '../components/Modal';
import Loader from '../components/Loader';
import Button from '../components/Button';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useConfiguration } from '../contexts/ConfigurationContext';
import sdk from '../api/directus';

const ReportBugModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void; }) => {
    const { t } = useTranslation(['guides', 'common']);
    const { user } = useAuth();
    const { addToast } = useToast();
    const { config } = useConfiguration();
    const [title, setTitle] = useState('');
    const [details, setDetails] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (!user?.id || !config?.app_backend) {
                throw new Error('User or configuration not available.');
            }
            const token = await sdk.getToken();
            const response = await fetch(`${config.app_backend}/items/bugs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    bug_title: title,
                    bug_details: details,
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({})); // Catch if response is not json
                const errorMessage = errorData?.errors?.[0]?.message || 'Failed to submit bug report.';
                throw new Error(errorMessage);
            }

            addToast(t('bugReportSuccess'), 'success');
            onClose();
            setTitle('');
            setDetails('');
        } catch (err: any) {
            addToast(t('bugReportError', { error: err.message }), 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('bugReportModalTitle')}>
            <form onSubmit={handleSubmit} className="modal-form">
                <div className="info-message" style={{ textAlign: 'left', alignItems: 'flex-start', width: '100%', margin: 0 }}>
                    <p style={{ margin: 0 }}>{t('bugReportFormIntro1')}</p>
                    <p style={{ margin: 0 }}>{t('bugReportFormIntro2')}</p>
                </div>
                <p>{t('bugReportFormDesc')}</p>
                <div className="form-group">
                    <label htmlFor="bug-title">{t('bugTitle')}</label>
                    <input
                        id="bug-title"
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder={t('bugTitlePlaceholder')}
                        required
                        disabled={isSubmitting}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="bug-details">{t('bugDetails')}</label>
                    <textarea
                        id="bug-details"
                        value={details}
                        onChange={(e) => setDetails(e.target.value)}
                        required
                        disabled={isSubmitting}
                        rows={5}
                    />
                </div>
                <div className="form-actions">
                    <button type="button" className="btn" onClick={onClose} disabled={isSubmitting}>{t('cancel', { ns: 'common' })}</button>
                    <button type="submit" className="btn btn-primary" disabled={isSubmitting || !title || !details}>
                        {isSubmitting ? <Loader /> : t('submitBugReport')}
                    </button>
                </div>
            </form>
        </Modal>
    );
};


const GuidesView = () => {
    const { t } = useTranslation(['guides', 'common', 'onboarding']);
    const [activeIndex, setActiveIndex] = useState(0);
    const [isBugModalOpen, setIsBugModalOpen] = useState(false);

    const guideData = [
        { key: 'Account', icon: ICONS.ACCOUNT, steps: 4 },
        { key: 'Domain', icon: ICONS.DOMAINS, steps: 4 },
        { key: 'Import', icon: ICONS.UPLOAD, steps: 3 },
        { key: 'Campaign', icon: ICONS.CAMPAIGNS, steps: 3 },
        { key: 'Template', icon: ICONS.LAYERS, steps: 3 },
        { key: 'MarketingCampaign', icon: ICONS.TARGET, steps: 4 },
        { key: 'Statistics', icon: ICONS.STATISTICS, steps: 3 },
        { key: 'ListsSegments', icon: ICONS.EMAIL_LISTS, steps: 3 },
        { key: 'Credits', icon: ICONS.BUY_CREDITS, steps: 3 },
        { key: 'Orders', icon: ICONS.BOX, steps: 4 }
    ];

    const helpCards = [
        { key: 'AI', title: t('aiAssistant'), desc: t('aiAssistantDesc'), icon: ICONS.AI_ICON, isSoon: true, onClick: () => {} },
        { key: 'Bug', title: t('reportABug'), desc: t('reportABugDesc'), icon: ICONS.COMPLAINT, isSoon: false, onClick: () => setIsBugModalOpen(true) },
        { key: 'Ticket', title: t('submitATicket'), desc: t('submitATicketDesc'), icon: ICONS.MAIL, isSoon: true, onClick: () => {} },
        { key: 'API', title: t('apiDocumentation'), desc: t('apiDocumentationDesc'), icon: ICONS.CHEVRON_RIGHT, isSoon: false, onClick: () => window.open('https://megamail.readme.io/reference/', '_blank') },
    ];

    const renderGuideContent = (key: string, numSteps: number) => (
        <div className="step-by-step-list">
            {[...Array(numSteps)].map((_, i) => {
                const step = i + 1;
                return (
                    <div className="step-item" key={step}>
                        <div className="step-number">{step}</div>
                        <div className="step-content">
                            <h4>{t(`guide${key}Step${step}Title`)}</h4>
                            <p dangerouslySetInnerHTML={{ __html: t(`guide${key}Step${step}Desc`) }} />
                        </div>
                    </div>
                );
            })}
        </div>
    );

    const activeGuide = guideData[activeIndex];

    return (
        <div className="guides-view-container">
            <ReportBugModal isOpen={isBugModalOpen} onClose={() => setIsBugModalOpen(false)} />
            <p className="view-subtitle">{t('guidesSubtitle')}</p>
            <div className="guides-layout">
                <nav className="guides-nav">
                    {guideData.map((guide, index) => (
                        <button
                            key={guide.key}
                            className={`guides-nav-item ${activeIndex === index ? 'active' : ''}`}
                            onClick={() => setActiveIndex(index)}
                        >
                            <Icon>{guide.icon}</Icon>
                            <span>{t(`guide${guide.key}Title`)}</span>
                        </button>
                    ))}
                </nav>
                <article className="guides-content card">
                    <header className="guides-content-header">
                        <Icon>{activeGuide.icon}</Icon>
                        <h3>{t(`guide${activeGuide.key}Title`)}</h3>
                    </header>
                    <div className="guides-content-body">
                        {renderGuideContent(activeGuide.key, activeGuide.steps)}
                    </div>
                </article>
            </div>
            
            <div className="help-section">
                <h2 className="help-section-header">{t('needMoreHelp')}</h2>
                <div className="help-cards-grid">
                    {helpCards.map(card => (
                        <button key={card.key} className="card help-card" onClick={card.onClick} disabled={card.isSoon}>
                            {card.isSoon && <div className="soon-badge-overlay">{t('soon', { ns: 'onboarding' })}</div>}
                            <Icon>{card.icon}</Icon>
                            <h4>{card.title}</h4>
                            <p>{card.desc}</p>
                        </button>
                    ))}
                </div>
            </div>

        </div>
    );
};

export default GuidesView;

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
import ReportBugModal from '../components/ReportBugModal';

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
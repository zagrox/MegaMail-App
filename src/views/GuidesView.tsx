import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Icon, { ICONS } from '../components/Icon';

const GuidesView = () => {
    const { t } = useTranslation(['guides', 'common']);
    const [activeIndex, setActiveIndex] = useState(0);

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
        </div>
    );
};

export default GuidesView;
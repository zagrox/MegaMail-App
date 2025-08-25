import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import useApi from './useApi';
import useApiV4 from '../hooks/useApiV4';
import { getPastDateByDays, formatDateForApiV4 } from '../utils/helpers';
import CenteredMessage from '../components/CenteredMessage';
import Loader from '../components/Loader';
import AccountDataCard from '../components/AccountDataCard';
import Icon, { ICONS } from '../components/Icon';
import useModules from '../hooks/useModules';
import { Module } from '../api/types';
import UnlockModuleModal from '../components/UnlockModuleModal';
import { useConfiguration } from '../contexts/ConfigurationContext';

const DashboardView = ({ setView, apiKey, user, isEmbed = false }: { setView: (view: string, data?: any) => void, apiKey: string, user: any, isEmbed?: boolean }) => {
    const { t, i18n } = useTranslation();
    const { hasModuleAccess, loading: authLoading } = useAuth();
    const { config, loading: configLoading } = useConfiguration();
    const apiParams = useMemo(() => ({ from: formatDateForApiV4(getPastDateByDays(365)) }), []);
    const { data: statsData, loading: statsLoading, error: statsError } = useApiV4(`/statistics`, apiKey, apiParams);
    const { data: accountData, loading: accountLoading } = useApi('/account/load', apiKey, {}, apiKey ? 1 : 0);
    const { data: contactsCountData, loading: contactsCountLoading } = useApi('/contact/count', apiKey, { allContacts: true }, apiKey ? 1 : 0);
    const { modules, loading: modulesLoading } = useModules(config?.app_backend);
    const [moduleToUnlock, setModuleToUnlock] = useState<Module | null>(null);

    const staticNavItems = useMemo(() => [
        { name: t('statistics'), icon: ICONS.STATISTICS, desc: t('statisticsDesc'), view: 'Statistics' },
        { name: t('contacts'), icon: ICONS.CONTACTS, desc: t('contactsDesc'), view: 'Contacts' },
        { name: t('sendEmail'), icon: ICONS.SEND_EMAIL, desc: t('sendEmailDesc'), view: 'Send Email' },
        { name: t('emailLists'), icon: ICONS.EMAIL_LISTS, desc: t('emailListsDesc'), view: 'Email Lists' },
        { name: t('segments'), icon: ICONS.SEGMENTS, desc: t('segmentsDesc'), view: 'Segments' },
        { name: t('mediaManager'), icon: ICONS.FOLDER, desc: t('mediaManagerDesc'), view: 'Media Manager' },
        { name: t('campaigns'), icon: ICONS.CAMPAIGNS, desc: t('campaignsDesc'), view: 'Campaigns' },
        { name: t('templates'), icon: ICONS.ARCHIVE, desc: t('templatesDesc'), view: 'Templates' },
        { name: t('emailBuilder'), icon: ICONS.PENCIL, desc: t('emailBuilderDesc'), view: 'Email Builder' },
        { name: t('domains'), icon: ICONS.DOMAINS, desc: t('domainsDesc'), view: 'Domains' },
        { name: t('smtp'), icon: ICONS.SMTP, desc: t('smtpDesc'), view: 'SMTP' },
    ], [t]);

    const dashboardTools = useMemo(() => {
        const moduleMap = modules ? new Map(modules.map(m => [m.modulename, m])) : new Map();

        return staticNavItems.map(item => {
            const moduleData = moduleMap.get(item.view);
            return {
                ...item,
                desc: moduleData ? moduleData.moduledetails : item.desc,
                moduleData: moduleData || null,
            };
        });
    }, [staticNavItems, modules]);

    if (!user && !isEmbed) return <CenteredMessage><Loader /></CenteredMessage>;
    if (statsError) console.warn("Could not load dashboard stats:", statsError);

    const welcomeName = user?.first_name || t('user');
    const appName = config?.app_name || 'Mailzila';
    const copyrightText = configLoading ? '...' : (config?.app_copyright || `${appName} © ${new Date().getFullYear()}, All Rights Reserved`);

    return (
        <div className="dashboard-container">
            {moduleToUnlock && (
                <UnlockModuleModal
                    module={moduleToUnlock}
                    onClose={() => setModuleToUnlock(null)}
                    setView={setView}
                />
            )}
            {!isEmbed && (
                <>
                    <div className="dashboard-header">
                        <div>
                            <h2>{t('welcomeMessage', { name: welcomeName })}</h2>
                        </div>
                        <div className="dashboard-actions">
                            <button className="btn btn-credits" onClick={() => setView('Buy Credits')}>
                                <Icon path={ICONS.BUY_CREDITS} />
                                {accountLoading ? t('loadingCredits') : `${t('credits')}: ${Number(accountData?.emailcredits ?? 0).toLocaleString(i18n.language)}`}
                            </button>
                        </div>
                    </div>
                    <div className="cta-banner">
                        <div className="cta-banner-icon">
                            <Icon path={ICONS.CAMPAIGNS} />
                        </div>
                        <div className="cta-banner-text">
                            <h3 className="cta-banner-title">{t('startEmailMarketingTitle')}</h3>
                            <p className="cta-banner-desc">{t('startEmailMarketingDesc')}</p>
                        </div>
                        <div className="cta-banner-action">
                            <button className="btn btn-primary" onClick={() => setView('Send Email')}>
                                <Icon path={ICONS.SEND_EMAIL} /> {t('createCampaign')}
                            </button>
                        </div>
                    </div>
                </>
            )}

            <div className="dashboard-stats-grid">
                 <AccountDataCard title={t('sendingReputation')} iconPath={ICONS.TRENDING_UP}>
                    {accountLoading ? '...' : (accountData?.reputation ? `${accountData.reputation}%` : 'N/A')}
                </AccountDataCard>
                <AccountDataCard title={t('emailsSent365d')} iconPath={ICONS.MAIL}>
                    {statsLoading ? '...' : (statsData?.EmailTotal?.toLocaleString(i18n.language) ?? '0')}
                </AccountDataCard>
                 <AccountDataCard title={t('totalContacts')} iconPath={ICONS.CONTACTS}>
                    {contactsCountLoading ? '...' : (contactsCountData?.toLocaleString(i18n.language) ?? '0')}
                </AccountDataCard>
            </div>

            {!isEmbed && (
                <>
                    <div className="dashboard-section">
                        <div className="dashboard-section-header">
                            <h3>{t('exploreYourTools')}</h3>
                            <p>{t('exploreYourToolsSubtitle')}</p>
                        </div>
                        <div className="dashboard-nav-grid">
                           {(modulesLoading || authLoading) ? (
                                Array.from({ length: 8 }).map((_, i) => (
                                    <div key={i} className="card nav-card" style={{
                                        height: '115px',
                                        backgroundColor: 'var(--subtle-background)',
                                        animation: 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                                    }} />
                                ))
                            ) : (
                                dashboardTools.map(item => {
                                    const hasAccess = hasModuleAccess(item.view, modules);
                                    const isPurchasable = !!item.moduleData;
                                    const isLocked = isPurchasable && !hasAccess;
                                    const isPromotional = isLocked && item.moduleData?.modulepro === true;

                                    const handleClick = () => {
                                        if (isLocked) {
                                            if (item.moduleData) setModuleToUnlock(item.moduleData);
                                        } else {
                                            setView(item.view);
                                        }
                                    };

                                    return (
                                        <div
                                            key={item.view}
                                            className={`card nav-card clickable ${isLocked ? 'locked' : ''}`}
                                            onClick={handleClick}
                                        >
                                            {isLocked && (
                                                <div className="lock-icon-overlay" style={isPromotional ? { color: 'var(--success-color)' } : {}}>
                                                    <Icon path={isPromotional ? ICONS.GIFT : ICONS.LOCK} />
                                                </div>
                                            )}
                                            <Icon path={item.icon} className="nav-card-icon" />
                                            <div className="nav-card-text-content">
                                                <div className="nav-card-title">{item.name}</div>
                                                <div className="nav-card-description">{item.desc}</div>
                                            </div>
                                        </div>
                                    );
                                })
                           )}
                        </div>
                    </div>
                    <div className="dashboard-branding-footer">
                        <p dangerouslySetInnerHTML={{ __html: copyrightText }} />
                    </div>
                </>
            )}
        </div>
    );
};

export default DashboardView;
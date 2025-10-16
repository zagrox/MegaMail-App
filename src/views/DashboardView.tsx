import React, { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import useApi from './useApi';
import useApiV4 from '../hooks/useApiV4';
import { getPastDateByDays, formatDateForApiV4 } from '../utils/helpers';
import CenteredMessage from '../components/CenteredMessage';
import Loader from '../components/Loader';
import Icon, { ICONS } from '../components/Icon';
import { Module } from '../api/types';
import { useConfiguration } from '../contexts/ConfigurationContext';
import LineLoader from '../components/LineLoader';
import Button from '../components/Button';
import sdk from '../api/directus';
import { readItems } from '@directus/sdk';
import { AppActions } from '../config/actions';
import DOMPurify from 'dompurify';

const DashboardView = ({ setView, apiKey, user, isEmbed = false }: { setView: (view: string, data?: any) => void, apiKey: string, user: any, isEmbed?: boolean }) => {
    const { t, i18n } = useTranslation(['dashboard', 'common', 'account']);
    const { hasModuleAccess, loading: authLoading, allModules, setModuleToUnlock } = useAuth();
    const { config, loading: configLoading } = useConfiguration();
    const apiParams = useMemo(() => ({ from: formatDateForApiV4(getPastDateByDays(365)) }), []);
    const { data: statsData, loading: statsLoading, error: statsError } = useApiV4(`/statistics`, apiKey, apiParams);
    const { data: accountData, loading: accountLoading } = useApi('/account/load', apiKey, {}, apiKey ? 1 : 0);
    const { data: contactsCountData, loading: contactsCountLoading } = useApi('/contact/count', apiKey, { allContacts: true }, apiKey ? 1 : 0);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!user || !user.id || user.isApiKeyUser) {
            return;
        }
        
        const fetchUnreadCount = async () => {
            try {
                const filter = {
                    _and: [
                        { status: { _eq: 'published' } },
                        { read_status: { _eq: false } },
                        {
                            _or: [
                                { recipient: { _eq: user.id } },
                                { is_system_wide: { _eq: true } }
                            ]
                        }
                    ]
                };
                const response = await sdk.request(readItems('notifications', {
                    aggregate: { count: '*' },
                    filter
                }));
                
                if (response && response.length > 0 && (response[0] as any).count) {
                     setUnreadCount(Number((response[0] as any).count));
                }
            } catch (error) {
                console.warn("Failed to fetch unread notification count:", error);
            }
        };

        fetchUnreadCount();
    }, [user]);

    const handleNotificationsClick = () => {
        sessionStorage.setItem('account-tab', 'notifications');
        setView('Account');
    };

    const staticNavItems = useMemo(() => [
        { name: t('statistics', { ns: 'common' }), icon: ICONS.STATISTICS, desc: t('statisticsDesc'), view: 'Statistics' },
        { name: t('contacts', { ns: 'common' }), icon: ICONS.CONTACTS, desc: t('contactsDesc'), view: 'Contacts' },
        { name: t('marketing', { ns: 'common' }), icon: ICONS.TARGET, desc: t('marketingDesc'), view: 'Marketing' },
        { name: t('sendEmail', { ns: 'common' }), icon: ICONS.SEND_EMAIL, desc: t('sendEmailDesc'), view: 'Send Email' },
        { name: t('emailLists', { ns: 'common' }), icon: ICONS.EMAIL_LISTS, desc: t('emailListsDesc'), view: 'Email Lists' },
        { name: t('segments', { ns: 'common' }), icon: ICONS.SEGMENTS, desc: t('segmentsDesc'), view: 'Segments' },
        { name: t('mediaManager', { ns: 'common' }), icon: ICONS.FOLDER, desc: t('mediaManagerDesc'), view: 'Media Manager' },
        { name: t('gallery', { ns: 'common' }), icon: ICONS.IMAGE, desc: t('galleryDesc'), view: 'Gallery' },
        { name: t('campaigns', { ns: 'common' }), icon: ICONS.CAMPAIGNS, desc: t('campaignsDesc'), view: 'Campaigns' },
        { name: t('calendar', { ns: 'common' }), icon: ICONS.CALENDAR, desc: t('calendarDesc'), view: 'Calendar' },
        { name: t('templates', { ns: 'common' }), icon: ICONS.ARCHIVE, desc: t('templatesDesc'), view: 'Templates' },
        { name: t('emailBuilder', { ns: 'common' }), icon: ICONS.LAYERS, desc: t('emailBuilderDesc'), view: 'Email Builder' },
        { name: t('domains', { ns: 'common' }), icon: ICONS.DOMAINS, desc: t('domainsDesc'), view: 'Domains' },
        { name: t('smtp', { ns: 'common' }), icon: ICONS.SMTP, desc: t('smtpDesc'), view: 'SMTP' },
        { name: t('apiKey', { ns: 'account' }), icon: ICONS.KEY, desc: t('apiDesc'), view: 'API' },
    ], [t]);

    const dashboardTools = useMemo(() => {
        const moduleMap = allModules ? new Map(allModules.map(m => [m.modulename, m])) : new Map();

        return staticNavItems.map(item => {
            const moduleData = moduleMap.get(item.view);
            return {
                ...item,
                // Prioritize the module name from the backend as requested by the user
                name: moduleData?.modulename || item.name,
                // Always use the translated description from the local dashboard.json file
                desc: item.desc,
                moduleData: moduleData || null,
            };
        });
    }, [staticNavItems, allModules]);

    if (!user && !isEmbed) return <CenteredMessage><Loader /></CenteredMessage>;
    if (statsError) console.warn("Could not load dashboard stats:", statsError);

    const welcomeName = user?.first_name || t('user');
    const appName = t('appName');
    const copyrightText = configLoading ? '...' : (config?.app_copyright || `${appName} © ${new Date().getFullYear()}, All Rights Reserved`);

    return (
        <div className="dashboard-container">
            {!isEmbed && (
                <>
                    <div className="dashboard-header">
                        <div className="hide-on-mobile">
                            <h2>{t('welcomeMessage', { name: welcomeName })}</h2>
                        </div>
                        <div className="dashboard-actions">
                            <button className="credits-card-cta" onClick={() => setView('Buy Credits')}>
                                <div className="credits-card-cta__icon">
                                    {/* FIX: Updated Icon component to accept children instead of a prop. */}
                                    <Icon>{ICONS.BUY_CREDITS}</Icon>
                                </div>
                                <div className="credits-card-cta__text">
                                    
                                    <span className="credits-card-cta__value">
                                        {accountLoading ? <Loader /> : Number(accountData?.emailcredits ?? 0).toLocaleString(i18n.language)}
                                    </span>
                                </div>
                                <div className="credits-card-cta__arrow">
                                     {/* FIX: Updated Icon component to accept children instead of a prop. */}
                                     <Icon>{ICONS.CHEVRON_RIGHT}</Icon>
                                </div>
                            </button>
                            <Button className="btn-secondary btn-notifications" onClick={handleNotificationsClick} title={t('notifications', { ns: 'common' })}>
                                {/* FIX: Updated Icon component to accept children instead of a prop. */}
                                <Icon>{ICONS.BELL}</Icon>
                                {unreadCount > 0 && <span className="notification-dot"></span>}
                            </Button>
                        </div>
                    </div>
                    <div className="cta-banner">
                        <div className="cta-banner-icon">
                            {/* FIX: Updated Icon component to accept children instead of a prop. */}
                            <Icon>{ICONS.AT_SIGN}</Icon>
                        </div>
                        <div className="cta-banner-text">
                            <h3 className="cta-banner-title">{t('startEmailMarketingTitle')}</h3>
                            <p className="cta-banner-desc">{t('startEmailMarketingDesc')}</p>
                        </div>
                        <div className="cta-banner-action">
                            <Button className="btn-primary" onClick={() => setView('Marketing')}>
                                {/* FIX: Updated Icon component to accept children instead of a prop. */}
                                <Icon>{ICONS.SEND_EMAIL}</Icon> {t('createCampaign', { ns: 'common' })}
                            </Button>
                        </div>
                    </div>
                </>
            )}

            <div className="dashboard-stats-grid">
                <div className="card narrow-stat-card">
                    {/* FIX: Updated Icon component to accept children instead of a prop. */}
                    <Icon className="narrow-stat-card-icon">{ICONS.AWARD}</Icon>
                    <span className="narrow-stat-card-title">{t('sendingReputation')}</span>
                    <span className="narrow-stat-card-value">
                        {accountLoading ? <LineLoader /> : (accountData?.reputation ? `${accountData.reputation}%` : 'N/A')}
                    </span>
                </div>
                <div className="card narrow-stat-card">
                    {/* FIX: Updated Icon component to accept children instead of a prop. */}
                    <Icon className="narrow-stat-card-icon">{ICONS.MAIL}</Icon>
                    <span className="narrow-stat-card-title">{t('emailsSent365d')}</span>
                    <span className="narrow-stat-card-value">
                        {statsLoading ? <LineLoader /> : (statsData?.EmailTotal?.toLocaleString(i18n.language) ?? '0')}
                    </span>
                </div>
                 <div className="card narrow-stat-card">
                    {/* FIX: Updated Icon component to accept children instead of a prop. */}
                    <Icon className="narrow-stat-card-icon">{ICONS.CONTACTS}</Icon>
                    <span className="narrow-stat-card-title">{t('totalContacts')}</span>
                    <span className="narrow-stat-card-value">
                        {contactsCountLoading ? <LineLoader /> : (contactsCountData?.toLocaleString(i18n.language) ?? '0')}
                    </span>
                </div>
            </div>

            {!isEmbed && (
                <>
                    <div className="dashboard-section">
                        <div className="dashboard-section-header hide-on-mobile">
                            <h3>{t('exploreYourTools')}</h3>
                            <p>{t('exploreYourToolsSubtitle')}</p>
                        </div>
                        <div className="dashboard-nav-grid">
                           {/* FIX: Replaced undefined variable 'modulesLoading' with 'authLoading' from the useAuth hook, which correctly represents the loading state for modules. */}
                           {(authLoading) ? (
                                Array.from({ length: 8 }).map((_, i) => (
                                    <div key={i} className="card nav-card" style={{
                                        height: '115px',
                                        backgroundColor: 'var(--subtle-background)',
                                        animation: 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                                    }} />
                                ))
                            ) : (
                                dashboardTools.map(item => {
                                    const hasAccess = hasModuleAccess(item.view, allModules);
                                    const isPurchasable = !!item.moduleData;
                                    const isLocked = isPurchasable && !hasAccess;
                                    const isPromotional = isLocked && item.moduleData?.modulepro === true;
            
                                    const handleClick = () => {
                                        if (isLocked) {
                                            if (item.moduleData) setModuleToUnlock(item.moduleData);
                                        } else {
                                            const settingsMapping: { [key: string]: string } = {
                                                'Domains': 'domains',
                                                'SMTP': 'smtp',
                                                'API': 'api',
                                            };
                                            const settingsTab = settingsMapping[item.view];
                                            if (settingsTab) {
                                                sessionStorage.setItem('settings-tab', settingsTab);
                                                setView('Settings');
                                            } else {
                                                setView(item.view);
                                            }
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
                                                    {/* FIX: Updated Icon component to accept children instead of a prop. */}
                                                    <Icon>{isPromotional ? ICONS.GIFT : ICONS.LOCK}</Icon>
                                                </div>
                                            )}
                                            {/* FIX: Updated Icon component to accept children instead of a prop. */}
                                            <Icon className="nav-card-icon">{item.icon}</Icon>
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
                    <div className="dashboard-branding-footer hide-on-mobile">
                        <p dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(copyrightText) }} />
                    </div>
                </>
            )}
        </div>
    );
};

export default DashboardView;
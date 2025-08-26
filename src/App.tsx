import React, { useState, useEffect, ReactNode, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from './contexts/AuthContext';
import { useConfiguration } from './contexts/ConfigurationContext';
import { ICONS } from './components/Icon';
import CenteredMessage from './components/CenteredMessage';
import Loader from './components/Loader';
import AuthView from './views/AuthView';
import OnboardingFlowView from './views/OnboardingFlowView';
import DashboardView from './views/DashboardView';
import StatisticsView from './views/StatisticsView';
import AccountView from './views/AccountView';
import BuyCreditsView from './views/BuyCreditsView';
import ContactsView from './views/ContactsView';
import EmailListView from './views/EmailListView';
import SegmentsView from './views/SegmentsView';
import MediaManagerView from './views/MediaManagerView';
import EmailBuilderView from './views/EmailBuilderView';
import SendEmailView from './views/SendEmailView';
import CampaignsView from './views/CampaignsView';
import TemplatesView from './views/TemplatesView';
import DomainsView from './views/DomainsView';
import SmtpView from './views/SmtpView';
import Icon from './components/Icon';
import EmbedView from './views/EmbedView';
import ResetPasswordView from './views/ResetPasswordView';
import CallbackView from './views/CallbackView';
import { List, Template, Module } from './api/types';
import ListDetailView from './views/ListDetailView';
import ContactDetailView from './views/ContactDetailView';
import useModules from './hooks/useModules';
import UnlockModuleModal from './components/UnlockModuleModal';


const App = () => {
    const { isAuthenticated, user, logout, hasModuleAccess, loading: authLoading } = useAuth();
    const { config } = useConfiguration();
    const { t, i18n } = useTranslation();
    const [view, setView] = useState('Dashboard');
    const [templateToEdit, setTemplateToEdit] = useState<Template | null>(null);
    const [campaignToLoad, setCampaignToLoad] = useState<any | null>(null);
    const [selectedList, setSelectedList] = useState<List | null>(null);
    const [selectedContactEmail, setSelectedContactEmail] = useState<string | null>(null);
    const [contactDetailOrigin, setContactDetailOrigin] = useState<{ view: string, data: any } | null>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const appContainerRef = useRef<HTMLDivElement>(null);
    const { modules, loading: modulesLoading } = useModules(config?.app_backend);
    const [moduleToUnlock, setModuleToUnlock] = useState<Module | null>(null);

    useEffect(() => {
        if (user?.language) {
            const langCode = user.language.split('-')[0];
            if (langCode !== i18n.language) {
                i18n.changeLanguage(langCode);
            }
        }
    }, [user, i18n]);

    const urlParams = new URLSearchParams(window.location.search);
    const isEmbedMode = urlParams.get('embed') === 'true';
    
    const hash = window.location.hash.substring(1);
    const [hashPath] = hash.split('?');
    const pathname = window.location.pathname;
    const isResetPasswordMode = hashPath.startsWith('/reset-password') || pathname.startsWith('/reset-password');
    const isCallbackMode = hashPath.startsWith('/callback') || pathname.startsWith('/callback');

    useEffect(() => {
        if (!isEmbedMode) {
            document.documentElement.lang = i18n.language;
            document.documentElement.dir = i18n.dir();
        }
    }, [i18n.language, i18n.dir, isEmbedMode]);

    useEffect(() => {
        if (!config) return;
    
        // Update Page Title
        if (config.app_name) {
            document.title = config.app_name;
        }
    
        // Update Favicon and Apple Touch Icon
        const favicon = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
        const appleTouchIcon = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement;
        if (config.app_logo && config.app_backend && favicon) {
            const iconUrl = `${config.app_backend}/assets/${config.app_logo}`;
            favicon.href = iconUrl;
            if (appleTouchIcon) {
                appleTouchIcon.href = iconUrl;
            }
        }

        // Send backend URL to Service Worker
        if (config.app_backend) {
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({ type: 'SET_BACKEND_URL', url: config.app_backend });
            }
        }
    
        // Update Theme Color Meta Tag & CSS Variables
        const themeColorMeta = document.querySelector('meta[name="theme-color"]');
        if (config.app_secondary_color) {
            if (themeColorMeta) {
                themeColorMeta.setAttribute('content', config.app_secondary_color);
            }
            document.documentElement.style.setProperty('--secondary-color', config.app_secondary_color);
        }
        if (config.app_secondary_color_dark) {
            document.documentElement.style.setProperty('--secondary-color-dark', config.app_secondary_color_dark);
        }
    
        // Update PWA Manifest
        const manifestLink = document.querySelector('link[rel="manifest"]');
        if (manifestLink && config.app_backend) {
            const manifest = {
                "name": `${config.app_name} - Email Marketing Platform`,
                "short_name": config.app_name,
                "description": `Your complete email marketing solution, powered by ${config.app_name}.`,
                "start_url": "/",
                "display": "standalone",
                "background_color": "#F7F9FC",
                "theme_color": config.app_secondary_color || "#1A2B3C",
                "orientation": "portrait-primary",
                "icons": [
                    {
                        "src": `${config.app_backend}/assets/${config.app_logo}`,
                        "type": "image/png",
                        "purpose": "any maskable",
                        "sizes": "512x512"
                    }
                ]
            };
            const manifestBlob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
            const manifestUrl = URL.createObjectURL(manifestBlob);
            manifestLink.setAttribute('href', manifestUrl);
        }
    }, [config]);
    
    useEffect(() => {
        const container = appContainerRef.current;
        if (!container || isEmbedMode) return;

        let touchStartX: number | null = null;
        let touchStartY: number | null = null;

        const handleTouchStart = (e: TouchEvent) => {
            if (e.touches.length === 1) {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (isMobileMenuOpen || touchStartX === null || touchStartY === null) return;
            const currentX = e.touches[0].clientX;
            const deltaX = currentX - touchStartX;
            if (Math.abs(deltaX) < 50) return; // Swipe threshold
            
            const isRTL = i18n.dir() === 'rtl';
            if ((!isRTL && deltaX > 0) || (isRTL && deltaX < 0)) {
                setIsMobileMenuOpen(true);
            }
        };
        container.addEventListener('touchstart', handleTouchStart);
        container.addEventListener('touchmove', handleTouchMove);

        return () => {
            container.removeEventListener('touchstart', handleTouchStart);
            container.removeEventListener('touchmove', handleTouchMove);
        };
    }, [isMobileMenuOpen, i18n, isEmbedMode, setIsMobileMenuOpen]);

    if (isResetPasswordMode) return <ResetPasswordView />;
    if (isCallbackMode) return <CallbackView />;
    if (isEmbedMode) return <EmbedView />;
    if (authLoading && !user) return <CenteredMessage style={{height: '100vh'}}><Loader /></CenteredMessage>;
    if (!isAuthenticated) return <AuthView />;
    if (!user?.elastickey) return <OnboardingFlowView onComplete={() => {}} />;
    
    const apiKey = user?.elastickey;

    const handleLogout = () => {
        logout();
        setView('Dashboard');
    };

    const handleSetView = (newView: string, data?: { template?: Template; list?: List; contactEmail?: string; origin?: { view: string, data: any }, campaignToLoad?: any }) => {
        if (newView === 'Email Builder' && data?.template) setTemplateToEdit(data.template);
        else setTemplateToEdit(null);

        if (newView === 'Send Email' && data?.campaignToLoad) setCampaignToLoad(data.campaignToLoad);
        else setCampaignToLoad(null);

        if (newView === 'ListDetail' && data?.list) setSelectedList(data.list);
        else if (newView !== 'ContactDetail') setSelectedList(null);
        
        if (newView === 'ContactDetail' && data?.contactEmail) {
            setSelectedContactEmail(data.contactEmail);
            setContactDetailOrigin(data.origin || { view: 'Contacts', data: {} });
        } else {
            setSelectedContactEmail(null);
            if (!data?.origin) setContactDetailOrigin(null);
        }

        setView(newView);
        setIsMobileMenuOpen(false);
    }
    
    const views: Record<string, { component: ReactNode, title: string, icon: string }> = {
        'Dashboard': { component: <DashboardView setView={handleSetView} apiKey={apiKey} user={user} />, title: t('dashboard'), icon: ICONS.DASHBOARD },
        'Statistics': { component: <StatisticsView apiKey={apiKey} />, title: t('statistics'), icon: ICONS.STATISTICS },
        'Account': { component: <AccountView apiKey={apiKey} user={user} setView={handleSetView} />, title: t('account'), icon: ICONS.ACCOUNT },
        'Buy Credits': { component: <BuyCreditsView apiKey={apiKey} user={user} setView={handleSetView} />, title: t('buyCredits'), icon: ICONS.BUY_CREDITS },
        'Contacts': { component: <ContactsView apiKey={apiKey} setView={handleSetView} />, title: t('contacts'), icon: ICONS.CONTACTS },
        'Email Lists': { component: <EmailListView apiKey={apiKey} setView={handleSetView} />, title: t('emailLists'), icon: ICONS.EMAIL_LISTS },
        'ListDetail': { component: <ListDetailView apiKey={apiKey} list={selectedList} setView={handleSetView} onBack={() => handleSetView('Email Lists')} />, title: selectedList ? t('contactsInList', { listName: selectedList.ListName }) : t('contacts'), icon: ICONS.CONTACTS },
        'ContactDetail': { component: <ContactDetailView apiKey={apiKey} contactEmail={selectedContactEmail || ''} onBack={() => contactDetailOrigin ? handleSetView(contactDetailOrigin.view, contactDetailOrigin.data) : handleSetView('Contacts')} />, title: selectedContactEmail || t('contactDetails'), icon: ICONS.ACCOUNT },
        'Segments': { component: <SegmentsView apiKey={apiKey} />, title: t('segments'), icon: ICONS.SEGMENTS },
        'Media Manager': { component: <MediaManagerView apiKey={apiKey} />, title: t('mediaManager'), icon: ICONS.FOLDER },
        'Campaigns': { component: <CampaignsView apiKey={apiKey} setView={handleSetView} />, title: t('campaigns'), icon: ICONS.CAMPAIGNS },
        'Templates': { component: <TemplatesView apiKey={apiKey} setView={handleSetView} />, title: t('templates'), icon: ICONS.ARCHIVE },
        'Email Builder': { component: <EmailBuilderView apiKey={apiKey} user={user} templateToEdit={templateToEdit} />, title: t('emailBuilder'), icon: ICONS.PENCIL },
        'Send Email': { component: <SendEmailView apiKey={apiKey} setView={handleSetView} campaignToLoad={campaignToLoad} />, title: t('sendEmail'), icon: ICONS.SEND_EMAIL },
        'Domains': { component: <DomainsView apiKey={apiKey} />, title: t('domains'), icon: ICONS.DOMAINS },
        'SMTP': { component: <SmtpView apiKey={apiKey} user={user}/>, title: t('smtp'), icon: ICONS.SMTP }
    };

    const navItems = [
        { name: t('dashboard'), view: 'Dashboard', icon: ICONS.DASHBOARD },
        { name: t('statistics'), view: 'Statistics', icon: ICONS.STATISTICS },
        { name: t('campaigns'), view: 'Campaigns', icon: ICONS.CAMPAIGNS },
        { name: t('sendEmail'), view: 'Send Email', icon: ICONS.SEND_EMAIL },
        { type: 'divider' },
        { name: t('contacts'), view: 'Contacts', icon: ICONS.CONTACTS },
        { name: t('emailLists'), view: 'Email Lists', icon: ICONS.EMAIL_LISTS },
        { name: t('segments'), view: 'Segments', icon: ICONS.SEGMENTS },
        { type: 'divider' },
        { name: t('templates'), view: 'Templates', icon: ICONS.ARCHIVE },
        { name: t('emailBuilder'), view: 'Email Builder', icon: ICONS.PENCIL },
        { name: t('mediaManager'), view: 'Media Manager', icon: ICONS.FOLDER },
        { name: t('smtp'), view: 'SMTP', icon: ICONS.SMTP },
    ];
    
    const isRTL = i18n.dir() === 'rtl';
    const appName = isRTL && config?.app_native ? config.app_native : (config?.app_name || '...');
    const logoUrl = config?.app_logo && config?.app_backend ? `${config.app_backend}/assets/${config.app_logo}` : '';
    
    const SidebarContent = () => (
      <>
        <div className="sidebar-header">
            <img src={logoUrl} alt={`${appName} logo`} className="sidebar-logo" />
            <span className="logo-font">{appName}</span>
        </div>
        <nav className="nav">
            {navItems.map((item, index) => {
                if ('type' in item && item.type === 'divider') {
                    return <hr key={`divider-${index}`} className="nav-divider" />;
                }
                const navItem = item as { name: string; view: string; icon: string; };
                const hasAccess = hasModuleAccess(navItem.view, modules);

                const moduleData = modules?.find(m => m.modulename === navItem.view);
                const isPurchasableModule = !!moduleData;

                // A module is locked if the user doesn't have access AND it's a known module from the CMS
                // (or if modules are still loading, to prevent flicker).
                // hasModuleAccess handles fundamental sections like Dashboard internally.
                const isLocked = !hasAccess && (authLoading || modulesLoading || isPurchasableModule);
                const isPromotional = isLocked && moduleData?.modulepro === true;

                const handleClick = () => {
                    if (isLocked) {
                        if (moduleData) setModuleToUnlock(moduleData);
                    } else {
                        handleSetView(navItem.view);
                    }
                };

                return (
                    <button key={navItem.view} onClick={handleClick} className={`nav-btn ${view === navItem.view ? 'active' : ''} ${isLocked ? 'locked' : ''}`}>
                        <Icon path={navItem.icon} />
                        <span>{navItem.name}</span>
                        {isLocked && (
                            <Icon
                                path={isPromotional ? ICONS.GIFT : ICONS.LOCK}
                                className="lock-icon"
                                style={isPromotional ? { color: 'var(--success-color)' } : {}}
                            />
                        )}
                    </button>
                )
            })}
        </nav>
        <div className="sidebar-footer-nav">
             <button onClick={() => handleSetView('Buy Credits')} className={`nav-btn ${view === 'Buy Credits' ? 'active' : ''}`}>
                <Icon path={ICONS.BUY_CREDITS} />
                <span>{t('buyCredits')}</span>
             </button>
             <button onClick={() => handleSetView('Account')} className={`nav-btn ${view === 'Account' ? 'active' : ''}`}>
                 <Icon path={ICONS.ACCOUNT} />
                 <span>{t('account')}</span>
             </button>
        </div>
      </>
    );
    
    const currentView = views[view];
    const showHeader = view !== 'Dashboard' && view !== 'Email Builder' && view !== 'Account' && view !== 'Send Email' && view !== 'ListDetail' && view !== 'ContactDetail';

    return (
        <div ref={appContainerRef} className={`app-container ${isMobileMenuOpen ? 'mobile-menu-open' : ''}`}>
            {moduleToUnlock && (
                <UnlockModuleModal
                    module={moduleToUnlock}
                    onClose={() => setModuleToUnlock(null)}
                    setView={setView}
                />
            )}
            <div className="mobile-menu-overlay" onClick={() => setIsMobileMenuOpen(false)}></div>
            <aside className="sidebar">
                <SidebarContent />
            </aside>
            <div className="main-wrapper">
                <header className="mobile-header">
                     <button className="mobile-menu-toggle" onClick={() => setIsMobileMenuOpen(true)} aria-label={t('openMenu')}>
                        <Icon path={ICONS.MENU} />
                    </button>
                    <h1 className="mobile-header-title">{currentView?.title || appName}</h1>
                    <button className="mobile-menu-toggle" onClick={() => handleSetView('Account')} aria-label={t('account')}>
                        <Icon path={ICONS.ACCOUNT} />
                    </button>
                </header>
                <main className={`content ${view === 'Email Builder' ? 'content--no-padding' : ''}`}>
                    {showHeader && (
                        <header className="content-header">
                            <h2>{currentView?.title}</h2>
                        </header>
                    )}
                    {currentView?.component}
                </main>
            </div>
        </div>
    );
};

export default App;
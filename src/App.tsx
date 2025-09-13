


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
import MarketingView from './views/SendWizardView';
import CampaignsView from './views/CampaignsView';
import CampaignDetailView from './views/CampaignDetailView';
import TemplatesView from './views/TemplatesView';
import SettingsView from './views/SettingsView';
import CalendarView from './views/CalendarView';
import Icon from './components/Icon';
import EmbedView from './views/EmbedView';
import ResetPasswordView from './views/ResetPasswordView';
import CallbackView from './views/CallbackView';
import { List, Template, Module } from './api/types';
import ListDetailView from './views/ListDetailView';
import ContactDetailView from './views/ContactDetailView';
import UnlockModuleModal from './components/UnlockModuleModal';
import OfflinePaymentView from './views/OfflinePaymentView';
import InvoiceView from './views/InvoiceView';
import CustomFieldsView from './views/CustomFieldsView';


const App = () => {
    const { isAuthenticated, user, logout, hasModuleAccess, loading: authLoading, allModules, moduleToUnlock, setModuleToUnlock } = useAuth();
    const { config } = useConfiguration();
    const { t, i18n } = useTranslation(['common', 'emailLists', 'contacts', 'buyCredits', 'account']);
    const [view, setView] = useState('Dashboard');
    const [templateToEdit, setTemplateToEdit] = useState<Template | null>(null);
    const [campaignToLoad, setCampaignToLoad] = useState<any | null>(null);
    const [selectedList, setSelectedList] = useState<List | null>(null);
    const [selectedCampaign, setSelectedCampaign] = useState<any | null>(null);
    const [selectedContactEmail, setSelectedContactEmail] = useState<string | null>(null);
    const [contactDetailOrigin, setContactDetailOrigin] = useState<{ view: string, data: any } | null>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [orderToResume, setOrderToResume] = useState<any | null>(null);
    const [orderForOfflinePayment, setOrderForOfflinePayment] = useState<any | null>(null);
    const [orderForInvoice, setOrderForInvoice] = useState<any | null>(null);
    const appContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // This effect determines the correct language for the UI based on a clear priority,
        // ensuring the language selected on the login screen is respected during onboarding.
        if (authLoading || !config) {
            return; // Wait until essential data is loaded.
        }
    
        // Maps a language name ('persian', 'english', 'fa-IR', etc.) to a 2-letter i18next code.
        const mapLangToCode = (lang: string | undefined): string | undefined => {
            if (!lang) return undefined;
            const lowerLang = lang.toLowerCase();
            if (lowerLang.startsWith('fa') || lowerLang.startsWith('persian')) return 'fa';
            if (lowerLang.startsWith('en') || lowerLang.startsWith('english')) return 'en';
            return undefined; // Return undefined for unknown languages
        };
    
        const i18nextLngCode = mapLangToCode(localStorage.getItem('i18nextLng') || undefined);
        const userLangCode = mapLangToCode(user?.language);
        const configLangCode = mapLangToCode(config.app_language);
        const isUserOnboarding = user && !user.elastickey;
    
        let targetLangCode: string | undefined;
    
        // PRIORITY 1: A user currently in the onboarding flow. Respect their language choice from the login screen above all else.
        if (isUserOnboarding && i18nextLngCode) {
            targetLangCode = i18nextLngCode;
        }
        // PRIORITY 2: A logged-in, fully onboarded user's saved preference from their profile.
        else if (userLangCode) {
            targetLangCode = userLangCode;
        }
        // PRIORITY 3: A guest user's session preference (also covers onboarding users if they somehow clear localStorage).
        else if (i18nextLngCode) {
            targetLangCode = i18nextLngCode;
        }
        // PRIORITY 4: The app's default language from the backend configuration.
        else if (configLangCode) {
            targetLangCode = configLangCode;
        }
    
        // Apply the determined language if it's different from the current one.
        if (targetLangCode && targetLangCode !== i18n.language) {
            i18n.changeLanguage(targetLangCode);
        }
    }, [user, config, authLoading, i18n.language, i18n]);

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

    const appName = t('appName');

    useEffect(() => {
        if (!config) return;
    
        // Update Page Title
        document.title = appName;
    
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
                "name": `${appName} - Email Marketing Platform`,
                "short_name": appName,
                "description": `Your complete email marketing solution, powered by ${appName}.`,
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
    }, [config, appName]);
    
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

    const handleSetView = (newView: string, data?: { template?: Template; list?: List; contactEmail?: string; origin?: { view: string, data: any }, campaignToLoad?: any, campaign?: any, orderToResume?: any, order?: any }) => {
        if (newView === 'Email Builder' && data?.template) setTemplateToEdit(data.template);
        else setTemplateToEdit(null);

        if ((newView === 'Send Email' || newView === 'Marketing') && data?.campaignToLoad) {
            setCampaignToLoad(data.campaignToLoad);
        } else if (newView !== 'Send Email' && newView !== 'Marketing') {
            setCampaignToLoad(null);
        }

        if (newView === 'ListDetail' && data?.list) setSelectedList(data.list);
        else if (newView !== 'ContactDetail') setSelectedList(null);
        
        if (newView === 'ContactDetail' && data?.contactEmail) {
            setSelectedContactEmail(data.contactEmail);
            setContactDetailOrigin(data.origin || { view: 'Contacts', data: {} });
        } else {
            setSelectedContactEmail(null);
            if (!data?.origin) setContactDetailOrigin(null);
        }

        if (newView === 'CampaignDetail' && data?.campaign) {
            setSelectedCampaign(data.campaign);
        } else {
            setSelectedCampaign(null);
        }

        if (newView === 'Buy Credits' && data?.orderToResume) {
            setOrderToResume(data.orderToResume);
        } else {
            // Clear it for any other navigation action to avoid resuming a stale order.
            setOrderToResume(null);
        }

        if (newView === 'OfflinePayment' && data?.order) {
            setOrderForOfflinePayment(data.order);
        } else {
            setOrderForOfflinePayment(null);
        }

        if (newView === 'Invoice' && data?.order) {
            setOrderForInvoice(data.order);
        } else {
            setOrderForInvoice(null);
        }

        setView(newView);
        setIsMobileMenuOpen(false);
    }
    
    const views: Record<string, { component: ReactNode, title: string, icon: React.ReactNode }> = {
        'Dashboard': { component: <DashboardView setView={handleSetView} apiKey={apiKey} user={user} />, title: t('dashboard'), icon: ICONS.DASHBOARD },
        'Statistics': { component: <StatisticsView apiKey={apiKey} />, title: t('statistics'), icon: ICONS.STATISTICS },
        'Account': { component: <AccountView apiKey={apiKey} user={user} setView={handleSetView} allModules={allModules} hasModuleAccess={hasModuleAccess} />, title: t('account'), icon: ICONS.ACCOUNT },
        'Buy Credits': { component: <BuyCreditsView apiKey={apiKey} user={user} setView={handleSetView} orderToResume={orderToResume} />, title: t('buyCredits'), icon: ICONS.BUY_CREDITS },
        'OfflinePayment': { component: <OfflinePaymentView order={orderForOfflinePayment} setView={handleSetView} />, title: t('offlinePaymentTitle', { ns: 'buyCredits' }), icon: ICONS.PENCIL },
        'Invoice': { component: <InvoiceView order={orderForInvoice} setView={handleSetView} />, title: t('invoiceTitle', { ns: 'orders' }), icon: ICONS.FILE_TEXT },
        'Contacts': { component: <ContactsView apiKey={apiKey} setView={handleSetView} />, title: t('contacts'), icon: ICONS.CONTACTS },
        'Email Lists': { component: <EmailListView apiKey={apiKey} setView={handleSetView} />, title: t('emailLists'), icon: ICONS.EMAIL_LISTS },
        'ListDetail': { component: <ListDetailView apiKey={apiKey} list={selectedList} setView={handleSetView} onBack={() => handleSetView('Email Lists')} />, title: selectedList ? t('contactsInList', { listName: selectedList.ListName }) : t('contacts'), icon: ICONS.CONTACTS },
        'ContactDetail': { component: <ContactDetailView apiKey={apiKey} contactEmail={selectedContactEmail || ''} onBack={() => contactDetailOrigin ? handleSetView(contactDetailOrigin.view, contactDetailOrigin.data) : handleSetView('Contacts')} />, title: selectedContactEmail || t('contactDetails'), icon: ICONS.ACCOUNT },
        'Segments': { component: <SegmentsView apiKey={apiKey} />, title: t('segments'), icon: ICONS.SEGMENTS },
        'Custom Fields': { component: <CustomFieldsView apiKey={apiKey} setView={handleSetView} />, title: t('customFields'), icon: ICONS.HASH },
        'Media Manager': { component: <MediaManagerView apiKey={apiKey} />, title: t('mediaManager'), icon: ICONS.FOLDER },
        'Campaigns': { component: <CampaignsView apiKey={apiKey} setView={handleSetView} />, title: t('campaigns'), icon: ICONS.CAMPAIGNS },
        'CampaignDetail': { component: <CampaignDetailView apiKey={apiKey} campaign={selectedCampaign} onBack={() => handleSetView('Campaigns')} />, title: selectedCampaign?.Name || t('campaigns'), icon: ICONS.CAMPAIGNS },
        'Templates': { component: <TemplatesView apiKey={apiKey} setView={handleSetView} />, title: t('templates'), icon: ICONS.ARCHIVE },
        'Email Builder': { component: <EmailBuilderView apiKey={apiKey} user={user} templateToEdit={templateToEdit} />, title: t('emailBuilder'), icon: ICONS.LAYERS },
        'Send Email': { component: <SendEmailView apiKey={apiKey} setView={handleSetView} campaignToLoad={campaignToLoad} />, title: t('sendEmail'), icon: ICONS.SEND_EMAIL },
        'Marketing': { component: <MarketingView apiKey={apiKey} setView={handleSetView} campaignToLoad={campaignToLoad} />, title: t('marketingCampaign'), icon: ICONS.TARGET },
        'Calendar': { component: <CalendarView />, title: t('calendar'), icon: ICONS.CALENDAR },
        'Settings': { component: <SettingsView apiKey={apiKey} user={user} />, title: t('settings', { ns: 'account' }), icon: ICONS.SETTINGS },
    };

    const navItems = [
        // Overview
        { name: t('dashboard'), view: 'Dashboard', icon: ICONS.DASHBOARD },
        { name: t('statistics'), view: 'Statistics', icon: ICONS.STATISTICS },
        { name: t('campaigns'), view: 'Campaigns', icon: ICONS.CAMPAIGNS },
        { name: t('templates'), view: 'Templates', icon: ICONS.ARCHIVE },
        { name: t('sendEmail'), view: 'Send Email', icon: ICONS.SEND_EMAIL },
        { name: t('calendar'), view: 'Calendar', icon: ICONS.CALENDAR },
        { name: t('mediaManager'), view: 'Media Manager', icon: ICONS.FOLDER },
        { type: 'divider' },
        // Marketing
        { name: t('contacts'), view: 'Contacts', icon: ICONS.CONTACTS },
        { name: t('emailBuilder'), view: 'Email Builder', icon: ICONS.LAYERS },
        { name: t('marketing'), view: 'Marketing', icon: ICONS.TARGET },
        { name: t('emailLists'), view: 'Email Lists', icon: ICONS.EMAIL_LISTS },
    ];
    
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
                const navItem = item as { name: string; view: string; icon: React.ReactNode; };
                const hasAccess = hasModuleAccess(navItem.view, allModules);

                const moduleData = allModules?.find(m => m.modulename === navItem.view);
                const isPurchasableModule = !!moduleData;

                const isLocked = !hasAccess && (authLoading || !allModules || isPurchasableModule);
                const isPromotional = isLocked && moduleData?.modulepro === true;

                return (
                    <button key={navItem.view} onClick={() => handleSetView(navItem.view)} className={`nav-btn ${view === navItem.view ? 'active' : ''} ${isLocked ? 'locked' : ''}`}>
                        <Icon>{navItem.icon}</Icon>
                        <span>{navItem.name}</span>
                        {isLocked && (
                            <Icon
                                className="lock-icon"
                                style={isPromotional ? { color: 'var(--success-color)' } : {}}
                            >{isPromotional ? ICONS.GIFT : ICONS.LOCK}</Icon>
                        )}
                    </button>
                )
            })}
        </nav>
        <div className="sidebar-footer-nav">
             <button onClick={() => handleSetView('Buy Credits')} className={`nav-btn ${view === 'Buy Credits' ? 'active' : ''}`}>
                <Icon>{ICONS.BUY_CREDITS}</Icon>
                <span>{t('buyCredits')}</span>
             </button>
             <button onClick={() => handleSetView('Settings')} className={`nav-btn ${view === 'Settings' ? 'active' : ''}`}>
                 <Icon>{ICONS.SETTINGS}</Icon>
                 <span>{t('settings', { ns: 'account' })}</span>
             </button>
             <button onClick={() => handleSetView('Account')} className={`nav-btn ${view === 'Account' ? 'active' : ''}`}>
                 <Icon>{ICONS.ACCOUNT}</Icon>
                 <span>{t('account')}</span>
             </button>
        </div>
      </>
    );
    
    const currentView = views[view];
    const showHeader = view !== 'Dashboard' && view !== 'Email Builder' && view !== 'Account' && view !== 'Send Email' && view !== 'ListDetail' && view !== 'ContactDetail' && view !== 'Marketing' && view !== 'CampaignDetail' && view !== 'OfflinePayment' && view !== 'Invoice';

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
                        <Icon>{ICONS.MENU}</Icon>
                    </button>
                    <h1 className="mobile-header-title">{currentView?.title || appName}</h1>
                    <button className="mobile-menu-toggle" onClick={() => handleSetView('Account')} aria-label={t('account')}>
                        <Icon>{ICONS.ACCOUNT}</Icon>
                    </button>
                </header>
                <main className={`content ${view === 'Email Builder' || view === 'Marketing' ? 'content--no-padding' : ''}`}>
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
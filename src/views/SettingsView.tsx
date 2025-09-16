import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Tabs from '../components/Tabs';
import { ICONS } from '../components/Icon';
import DomainsView from './DomainsView';
import SmtpView from './SmtpView';
import ApiKeyView from './ApiKeyView';
import ShareTab from './account/ShareTab';
import { useAuth } from '../contexts/AuthContext';
import FormsTab from './settings/FormsTab';

const SettingsView = ({ apiKey, user }: { apiKey: string, user: any }) => {
    const { t } = useTranslation(['common', 'account', 'domains', 'smtp']);
    const { hasModuleAccess, allModules } = useAuth();
    const [activeTab, setActiveTab] = useState('domains');

    const tabs = useMemo(() => {
        const baseTabs = [
            { 
                id: 'domains', 
                label: t('domains'), 
                icon: ICONS.DOMAINS, 
                component: <DomainsView apiKey={apiKey} /> 
            },
            { 
                id: 'smtp', 
                label: t('smtp'), 
                icon: ICONS.SMTP, 
                component: <SmtpView apiKey={apiKey} user={user} /> 
            },
            { 
                id: 'api', 
                label: t('apiKey', { ns: 'account' }), 
                icon: ICONS.KEY, 
                component: <ApiKeyView apiKey={apiKey} user={user} /> 
            },
            {
                id: 'forms',
                label: t('forms'),
                icon: ICONS.FILE_TEXT,
                component: <FormsTab apiKey={apiKey} />
            },
        ];
        
        // Conditionally add the Embed tab based on API module access
        if (hasModuleAccess('API', allModules)) {
            baseTabs.push({ 
                id: 'embed', 
                label: t('embed', { ns: 'account' }), 
                icon: ICONS.SHARE, 
                component: <ShareTab apiKey={apiKey} /> 
            });
        }
        return baseTabs;
    }, [t, apiKey, user, hasModuleAccess, allModules]);

    useEffect(() => {
        const initialTab = sessionStorage.getItem('settings-tab');
        if (initialTab) {
            // Check if the tab from session storage is a valid tab to prevent errors
            if (tabs.some(tab => tab.id === initialTab)) {
                setActiveTab(initialTab);
            }
            sessionStorage.removeItem('settings-tab');
        }
    }, [tabs]);


    return (
        <div className="settings-view-container">
            <Tabs
                tabs={tabs}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
            />
        </div>
    );
};

export default SettingsView;
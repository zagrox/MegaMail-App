import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Tabs from '../components/Tabs';
import { ICONS } from '../components/Icon';
import DomainsView from './DomainsView';
import SmtpView from './SmtpView';
import ApiKeyView from './ApiKeyView';

const SettingsView = ({ apiKey, user }: { apiKey: string, user: any }) => {
    const { t } = useTranslation(['common', 'account', 'domains', 'smtp']);
    const [activeTab, setActiveTab] = useState('domains');

    const tabs = [
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
    ];

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

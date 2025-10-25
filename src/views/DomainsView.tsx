
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Tabs from '../components/Tabs';
import DomainVerificationTab from './domains/DomainVerificationTab';
import EmailVerificationTab from './domains/EmailVerificationTab';
import { ICONS } from '../components/Icon';

const DomainsView = ({ apiKey, setView }: { apiKey: string, setView: (view: string, data?: any) => void }) => {
    const { t } = useTranslation(['domains', 'common']);
    const [activeTab, setActiveTab] = useState('domains');

    const tabs = [
        { 
            id: 'domains', 
            label: t('domainVerification'), 
            icon: ICONS.DOMAINS,
            component: <DomainVerificationTab apiKey={apiKey} setView={setView} /> 
        },
        { 
            id: 'emails', 
            label: t('emailVerification'), 
            icon: ICONS.MAIL,
            component: <EmailVerificationTab apiKey={apiKey} /> 
        },
    ];

    return (
        <div className="account-tab-content">
             <Tabs
                tabs={tabs}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
            />
        </div>
    );
};

export default DomainsView;
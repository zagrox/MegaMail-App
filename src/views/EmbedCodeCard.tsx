

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Icon, { ICONS } from './Icon';
import { useConfiguration } from '../contexts/ConfigurationContext';

const EmbedCodeCard = ({ apiKey }: { apiKey: string }) => {
    const { t, i18n } = useTranslation(['account', 'dashboard', 'statistics', 'common']);
    const [view, setView] = useState('Dashboard');
    const [copied, setCopied] = useState(false);
    const { config } = useConfiguration();

    const appName = t('appName');
    const baseUrl = config?.app_url || 'https://app.megamail.ir';
    const embedUrl = `${baseUrl}/?embed=true&apiKey=${apiKey}&view=${view}&lang=${i18n.language}`;
    const iframeCode = `<iframe src="${embedUrl}" width="100%" height="800px" style="border:1px solid #ccc; border-radius: 8px;" title="${appName} Dashboard"></iframe>`;

    // Visually redact the API key for display purposes
    const redactedApiKey = `...${apiKey.slice(-8)}`;
    const displayCode = iframeCode.replace(apiKey, redactedApiKey);

    const handleCopy = () => {
        // Copy the real, unredacted code
        navigator.clipboard.writeText(iframeCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="card">
            <div className="card-header" style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{t('embedDashboard')}</h3>
            </div>
            <div className="card-body" style={{ padding: '0 1.25rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ color: 'var(--subtle-text-color)', marginTop: 0, fontSize: '0.9rem' }}>{t('embedDashboard


import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import useApiV4 from '../hooks/useApiV4';
import { apiFetchV4 } from '../api/elasticEmail';
import CenteredMessage from '../components/CenteredMessage';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import Icon, { ICONS } from '../components/Icon';
import Badge from '../components/Badge';
import { useStatusStyles } from '../hooks/useStatusStyles';
import { useToast } from '../contexts/ToastContext';
import LineLoader from '../components/LineLoader';

const ProgressBar = ({ value, max }: { value: number; max: number }) => {
    const percentage = max > 0 ? (value / max) * 100 : 0;
    let colorClass = '';
    if (percentage >= 20) {
        colorClass = 'success';
    } else if (percentage >= 10) {
        colorClass = 'warning';
    }
    return (
        <div className={`progress-bar-container ${colorClass}`}>
            <div className="progress-bar-fill" style={{ width: `${percentage}%` }} />
        </div>
    );
};

const CampaignCard = ({ campaign, onSelect, onEdit, stats, loadingStats }: { campaign: any; onSelect: () => void; onEdit: () => void; stats: { Delivered: number, Opened: number } | null; loadingStats: boolean; }) => {
    const { t, i18n } = useTranslation();
    const { getStatusStyle } = useStatusStyles();
    const statusStyle = getStatusStyle(campaign.Status);
    const isDraft = campaign.Status === 'Draft';
    const content = campaign.Content?.[0];

    const fromString = content?.From || '';
    let fromName = content?.FromName;
    let fromEmail = fromString;

    const angleBracketMatch = fromString.match(/(.*)<(.*)>/);
    if (angleBracketMatch && angleBracketMatch.length === 3) {
        if (!fromName) {
            fromName = angleBracketMatch[1].trim().replace(/"/g, '');
        }
        fromEmail = angleBracketMatch[2].trim();
    } else {
        const lastSpaceIndex = fromString.lastIndexOf(' ');
        if (lastSpaceIndex !== -1 && fromString.substring(lastSpaceIndex + 1).includes('@')) {
            const potentialName = fromString.substring(0, lastSpaceIndex).trim();
            const potentialEmail = fromString.substring(lastSpaceIndex + 1).trim();
            if (!fromName) {
                fromName = potentialName;
            }
            fromEmail = potentialEmail;
        }
    }

    return (
        <div className="card campaign-card">
            <div className="campaign-card-header" onClick={onSelect} role="button" tabIndex={0} onKeyPress={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect()}>
                <h3>{campaign.Name}</h3>
                <Badge text={statusStyle.text} type={statusStyle.type} iconPath={statusStyle.iconPath} />
            </div>
            <div className="campaign-card-body">
                <p className="campaign-detail">
                    <strong>{t('subject')}:</strong> {content?.Subject || t('noSubject')}
                </p>
                {fromName && (
                    <p className="campaign-detail">
                        <strong>{t('fromName')}:</strong> {fromName}
                    </p>
                )}
                {fromEmail && (
                    <p className="campaign-detail">
                        <strong>{t('fromEmail')}:</strong> {fromEmail}
                    </p>
                )}
                {content?.Preheader && (
                    <p className="campaign-detail">
                        <strong>{t('preheader')}:</strong> {content.Preheader}
                    </p>
                )}
            </div>
            <div className="campaign-card-footer">
                <div className="campaign-card-footer-stats" style={{ width: '100%', paddingRight: '1rem' }}>
                    {loadingStats ? (
                        <div style={{width: '80px'}}><LineLoader /></div>
                    ) : stats ? (
                        stats.Delivered > 0 ? (
                            <div style={{ width: '100%' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--subtle-text-color)' }}>{t('openRate')}</span>
                                    <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>
                                        {((stats.Opened / stats.Delivered) * 100).toFixed(1)}%
                                    </span>
                                </div>
                                <ProgressBar value={stats.Opened} max={stats.Delivered} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: '0.25rem', color: 'var(--subtle-text-color)' }}>
                                    <span>{stats.Opened.toLocaleString(i18n.language)} {t('opened')}</span>
                                    <span>{stats.Delivered.toLocaleString(i18n.language)} {t('delivered')}</span>
                                </div>
                            </div>
                        ) : (
                            <span style={{ fontSize: '0.8rem', color: 'var(--subtle-text-color)' }}>0 {t('delivered')}</span>
                        )
                    ) : (
                        isDraft ? (
                            <span style={{ fontSize: '0.8rem', color: 'var(--subtle-text-color)' }}>&nbsp;</span>
                        ) : (
                            <span style={{ fontSize: '0.8rem', color: 'var(--subtle-text-color)' }}>{t('noStatsForCampaign')}</span>
                        )
                    )}
                </div>
                <div className="action-buttons" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                     {isDraft && (
                        <button onClick={onEdit} className="btn" disabled={loadingStats}>
                             {loadingStats ? <Loader/> : <span>{t('edit')}</span>}
                        </button>
                    )}
                    <button onClick={onSelect} className="link-button campaign-card-view-link">{t('viewCampaignStats')} &rarr;</button>
                </div>
            </div>
        </div>
    );
};

const CampaignsView = ({ apiKey, setView }: { apiKey: string, setView: (view: string, data?: any) => void }) => {
    const { t } = useTranslation();
    const { addToast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [campaignStats, setCampaignStats] = useState<Record<string, { data?: any; loading: boolean; error?: any; }>>({});
    const [offset, setOffset] = useState(0);
    const [refetchIndex, setRefetchIndex] = useState(0);
    const [loadingCampaignName, setLoadingCampaignName] = useState<string | null>(null);

    const CAMPAIGNS_PER_PAGE = 10;

    const { data: campaigns, loading, error } = useApiV4('/campaigns', apiKey, {
        limit: CAMPAIGNS_PER_PAGE,
        offset,
        search: searchQuery,
    }, refetchIndex);

    const paginatedCampaigns = useMemo(() => {
        if (!Array.isArray(campaigns)) return [];
        return campaigns;
    }, [campaigns]);
    
    useEffect(() => {
        setOffset(0);
    }, [searchQuery]);

    useEffect(() => {
        if (!apiKey || !paginatedCampaigns || paginatedCampaigns.length === 0) {
            return;
        }
    
        // Identify campaigns on the current page that need stats.
        const campaignsToFetch = paginatedCampaigns.filter(
            c => c.Status !== 'Draft' && !campaignStats[c.Name]
        );
    
        if (campaignsToFetch.length > 0) {
            // Set loading state for all new campaigns at once.
            setCampaignStats(prev => {
                const newStats = { ...prev };
                campaignsToFetch.forEach(campaign => {
                    newStats[campaign.Name] = { loading: true };
                });
                return newStats;
            });
    
            // Fetch all stats in parallel.
            Promise.all(
                campaignsToFetch.map(campaign =>
                    apiFetchV4(`/statistics/campaigns/${encodeURIComponent(campaign.Name)}`, apiKey)
                        .then(result => ({
                            name: campaign.Name,
                            success: true as const,
                            data: {
                                Delivered: result?.Delivered ?? 0,
                                Opened: result?.Opened ?? 0,
                            }
                        }))
                        .catch(error => ({
                            name: campaign.Name,
                            success: false as const,
                            error
                        }))
                )
            ).then(results => {
                // Update state with all results at once.
                setCampaignStats(prev => {
                    const newStats = { ...prev };
                    for (const res of results) {
                        // FIX: Type narrowing for the success/error union type was failing. Checking for the success case explicitly and handling the error case in the else block resolves the issue.
                        if (res.success === false) {
                            console.error(`Failed to fetch stats for campaign ${res.name}`, res.error);
                            newStats[res.name] = { loading: false, error: res.error };
                        } else {
                            newStats[res.name] = { loading: false, data: res.data };
                        }
                    }
                    return newStats;
                });
            });
        }
    }, [paginatedCampaigns, apiKey, campaignStats]);

    const handleSelectCampaign = (campaign: any) => {
        setView('CampaignDetail', { campaign });
    };

    const handleEditCampaign = async (campaign: any) => {
        setLoadingCampaignName(campaign.Name);
        try {
            const fullCampaign = await apiFetchV4(`/campaigns/${encodeURIComponent(campaign.Name)}`, apiKey);
            setView('Send Email', { campaignToLoad: fullCampaign });
        } catch (e: any) {
            addToast(`Failed to load draft for editing: ${e.message}`, 'error');
        } finally {
            setLoadingCampaignName(null);
        }
    };

    return (
        <div>
            <div className="view-header">
                <div className="search-bar" style={{ flexGrow: 1 }}>
                    <Icon path={ICONS.SEARCH} />
                    <input
                        type="search"
                        placeholder={t('searchCampaignsPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        disabled={loading}
                        aria-label={t('searchCampaignsPlaceholder')}
                    />
                </div>
                <div className="header-actions">
                    <button className="btn btn-primary" onClick={() => setView('Send Email')}>
                        <Icon path={ICONS.PLUS} /> {t('createCampaign')}
                    </button>
                </div>
            </div>

            {loading && <CenteredMessage><Loader /></CenteredMessage>}
            {error && <ErrorMessage error={error} />}

            {!loading && !error && (
                 (paginatedCampaigns.length === 0) ? (
                    <CenteredMessage style={{height: '50vh'}}>
                        <div className="info-message">
                            <strong>{searchQuery ? t('noCampaignsForQuery', { query: searchQuery }) : t('noCampaignsFound')}</strong>
                             {!searchQuery && <p>{t('noCampaignsSent')}</p>}
                        </div>
                    </CenteredMessage>
                ) : (
                    <>
                    <div className="campaign-grid">
                        {paginatedCampaigns.map((campaign: any) => {
                           const statsInfo = campaign.Status !== 'Draft' ? campaignStats[campaign.Name] : null;
                           return (
                               <CampaignCard 
                                    key={campaign.Name} 
                                    campaign={campaign}
                                    onSelect={() => handleSelectCampaign(campaign)}
                                    onEdit={() => handleEditCampaign(campaign)}
                                    stats={statsInfo?.data}
                                    loadingStats={statsInfo?.loading || loadingCampaignName === campaign.Name}
                               />
                           );
                        })}
                    </div>

                    {(paginatedCampaigns.length > 0 || offset > 0) && (
                        <div className="pagination-controls">
                            <button onClick={() => setOffset(o => Math.max(0, o - CAMPAIGNS_PER_PAGE))} disabled={offset === 0 || loading}>
                                <Icon path={ICONS.CHEVRON_LEFT} />
                                <span>{t('previous')}</span>
                            </button>
                            <span className="pagination-page-info">{t('page', { page: offset / CAMPAIGNS_PER_PAGE + 1 })}</span>
                            <button onClick={() => setOffset(o => o + CAMPAIGNS_PER_PAGE)} disabled={!paginatedCampaigns || paginatedCampaigns.length < CAMPAIGNS_PER_PAGE || loading}>
                                <span>{t('next')}</span>
                                <Icon path={ICONS.CHEVRON_RIGHT} />
                            </button>
                        </div>
                    )}
                    </>
                )
            )}
        </div>
    );
};

export default CampaignsView;

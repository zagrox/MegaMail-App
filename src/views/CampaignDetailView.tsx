import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useApiV4 from '../hooks/useApiV4';
import useApi from './useApi';
import Icon, { ICONS } from '../components/Icon';
import CenteredMessage from '../components/CenteredMessage';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import AccountDataCard from '../components/AccountDataCard';
import Tabs from '../components/Tabs';
import Badge from '../components/Badge';
import { useStatusStyles } from '../hooks/useStatusStyles';
import OverallActivityChart from '../components/OverallActivityChart';

const DetailedStatsTable = ({ stats }: { stats: any }) => {
    const { t, i18n } = useTranslation(['common', 'campaigns']);

    const recipients = Number(stats.Recipients || 0);
    const delivered = Number(stats.Delivered || 0);

    const formatPercent = (value: number, total: number) => {
        if (total === 0) return '0.00%';
        return `${((value / total) * 100).toFixed(2)}%`;
    };

    const statsList = [
        { label: t('recipients'), value: stats.Recipients, totalForPercent: null },
        { label: t('delivered'), value: stats.Delivered, totalForPercent: recipients },
        { label: t('opened'), value: stats.Opened, totalForPercent: delivered },
        { label: t('clicked'), value: stats.Clicked, totalForPercent: delivered },
        { label: t('bounced'), value: stats.Bounced, totalForPercent: recipients },
        { label: t('unsubscribed'), value: stats.Unsubscribed, totalForPercent: delivered },
        { label: t('complaints'), value: stats.Complaints, totalForPercent: delivered },
        { label: t('inProgress', { ns: 'campaigns' }), value: stats.InProgress, totalForPercent: null },
        { label: t('manualCancel', { ns: 'campaigns' }), value: stats.ManualCancel, totalForPercent: null },
        { label: t('notDelivered', { ns: 'campaigns' }), value: stats.NotDelivered, totalForPercent: null },
    ];

    return (
        <div className="card campaign-stats-table-card">
            <div className="table-container-simple">
                <table className="simple-table">
                    <thead>
                        <tr>
                            <th>{t('metric', { ns: 'campaigns' })}</th>
                            <th style={{textAlign: 'right'}}>{t('total')}</th>
                            <th style={{textAlign: 'right'}}>{t('rate', { ns: 'campaigns' })}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {statsList.map(stat => {
                            if (stat.value === undefined || stat.value === null) return null;
                            return (
                                <tr key={stat.label}>
                                    <td>{stat.label}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                        {Number(stat.value).toLocaleString(i18n.language)}
                                    </td>
                                    <td style={{ textAlign: 'right', width: '100px' }}>
                                        {(stat.totalForPercent !== null && stat.totalForPercent > 0) ? (
                                            <span className="badge badge-default">
                                                {formatPercent(Number(stat.value), stat.totalForPercent)}
                                            </span>
                                        ) : (
                                            <span>-</span>
                                        )}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const SummaryItem = ({ label, value }: { label: string, value: React.ReactNode }) => {
    if (!value && value !== 0) return null;
    return (
        <>
            <dt>{label}</dt>
            <dd>{value}</dd>
        </>
    );
};

const CampaignSummary = ({ campaignDetails, stats, campaign, accountData }: { campaignDetails: any, stats: any, campaign: any, accountData: any }) => {
    const { t, i18n } = useTranslation(['send-wizard', 'sendEmail', 'common']);

    const content = campaignDetails?.Content?.[0] || {};
    const options = campaignDetails?.Options || {};

    // Parse From
    const fromString = content.From || '';
    let fromName = content.FromName;
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

    // Tracking status
    const trackingStatus = [
        options.TrackOpens && t('trackOpens', { ns: 'sendEmail' }),
        options.TrackClicks && t('trackClicks', { ns: 'sendEmail' })
    ].filter(Boolean).join(' & ') || t('disabled', { ns: 'send-wizard' });

    // Optimization status
    let optimizationStatus = t('disabled', { ns: 'send-wizard' });
    if (options.DeliveryOptimization === 'ToEngagedFirst') {
        optimizationStatus = t('sendToEngagedFirst', { ns: 'sendEmail' });
    } else if (options.EnableSendTimeOptimization) {
        optimizationStatus = t('sendAtOptimalTime', { ns: 'sendEmail' });
    }

    // Send time
    let sendTime = t('unknown', { ns: 'common' });
    if (options.ScheduleFor) {
        sendTime = new Date(options.ScheduleFor).toLocaleString(i18n.language, { dateStyle: 'medium', timeStyle: 'short' });
    } else if (campaign.DateSent) {
        sendTime = new Date(campaign.DateSent).toLocaleString(i18n.language, { dateStyle: 'medium', timeStyle: 'short' });
    } else if (campaign.Status !== 'Draft') {
        sendTime = t('immediately', { ns: 'send-wizard' });
    }
    
    const userBalance = accountData?.emailcredits ?? 0;
    const creditsNeeded = stats?.Recipients || 0;
    const hasEnoughCredits = userBalance >= creditsNeeded;

    const recipientValueStyle: React.CSSProperties = {
        fontWeight: 'bold',
        color: hasEnoughCredits ? 'var(--secondary-color)' : 'var(--danger-color)',
        fontSize: '1.2rem',
    };

    return (
        <div className="final-summary-container">
            <h3>{t('finalSummary', { ns: 'send-wizard' })}</h3>
            <dl className="final-summary-grid">
                <SummaryItem label={t('fromName', { ns: 'sendEmail' })} value={fromName} />
                <SummaryItem label={t('subject', { ns: 'sendEmail' })} value={content.Subject} />
                <SummaryItem
                    label={t('recipients', { ns: 'common' })}
                    value={
                        stats ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                <span style={recipientValueStyle}>{stats.Recipients?.toLocaleString(i18n.language)}</span>
                                {!hasEnoughCredits && isNaN(stats.Recipients) && <small style={{ color: 'var(--danger-color)' }}>{t('insufficientFunds', { ns: 'send-wizard' })}</small>}
                            </div>
                        ) : '...'
                    }
                />
                <SummaryItem label={t('fromEmail', { ns: 'sendEmail' })} value={fromEmail} />
                <SummaryItem label={t('replyTo', { ns: 'sendEmail' })} value={content.ReplyTo} />

                <hr className="separator" />

                <SummaryItem label={t('campaignName', { ns: 'sendEmail' })} value={campaignDetails.Name} />
                <SummaryItem label={t('template', { ns: 'sendEmail' })} value={content.TemplateName} />
                <SummaryItem label={t('sendTime', { ns: 'send-wizard' })} value={sendTime} />
                <SummaryItem label={t('tracking', { ns: 'sendEmail' })} value={trackingStatus} />
                <SummaryItem label={t('timeOptimization', { ns: 'send-wizard' })} value={optimizationStatus} />
            </dl>
        </div>
    );
};

const StatsPieChart = ({ stats }: { stats: any }) => {
    const { t, i18n } = useTranslation(['common', 'campaigns']);

    const data = useMemo(() => [
        { label: t('opened'), value: stats.Opened ?? 0, color: '#10B981' },
        { label: t('clicked'), value: stats.Clicked ?? 0, color: '#F59E0B' },
        { label: t('bounced'), value: stats.Bounced ?? 0, color: '#64748B' },
        { label: t('unsubscribed'), value: stats.Unsubscribed ?? 0, color: '#8B5CF6' },
        { label: t('complaints'), value: stats.Complaints ?? 0, color: '#EF4444' },
    ], [stats, t]);

    const filteredData = data.filter(d => d.value > 0);
    const total = filteredData.reduce((sum, d) => sum + d.value, 0);

    if (total === 0) {
        return null;
    }

    let startAngle = -90; // Start from the top
    const slices = filteredData.map(d => {
        const angle = (d.value / total) * 360;
        const endAngle = startAngle + angle;
        const largeArcFlag = angle > 180 ? 1 : 0;
        
        const x1 = 50 + 40 * Math.cos(Math.PI * startAngle / 180);
        const y1 = 50 + 40 * Math.sin(Math.PI * startAngle / 180);
        const x2 = 50 + 40 * Math.cos(Math.PI * endAngle / 180);
        const y2 = 50 + 40 * Math.sin(Math.PI * endAngle / 180);
        
        const path = `M 50,50 L ${x1},${y1} A 40,40 0 ${largeArcFlag},1 ${x2},${y2} Z`;
        startAngle = endAngle;
        
        return { ...d, path };
    });

    return (
        <div className="card">
             <div className="card-header">
                <h3>{t('engagementBreakdown', { ns: 'campaigns' })}</h3>
            </div>
            <div className="stats-pie-chart-container">
                <svg viewBox="0 0 100 100" className="stats-pie-chart">
                    {slices.map(slice => (
                        <path key={slice.label} d={slice.path} fill={slice.color} />
                    ))}
                </svg>
                <div className="chart-legend">
                    {filteredData.map(d => (
                        <div key={d.label} className="legend-item">
                            <span className="color-swatch" style={{ backgroundColor: d.color }}></span>
                            <span>{d.label}</span>
                            <span className="legend-value">{d.value.toLocaleString(i18n.language)}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const CampaignDetailView = ({ apiKey, campaign, onBack }: { apiKey: string, campaign: any | null, onBack: () => void }) => {
    const { t, i18n } = useTranslation(['campaigns', 'common', 'statistics']);
    const { getStatusStyle } = useStatusStyles();
    
    // Fetch aggregate stats for the entire campaign
    const { data: stats, loading: statsLoading, error: statsError } = useApiV4(
        campaign ? `/statistics/campaigns/${encodeURIComponent(campaign.Name)}` : '',
        apiKey
    );
    
    // Fetch full campaign details (which includes content, options, etc.)
    const { data: campaignDetails, loading: detailsLoading, error: detailsError } = useApiV4(
        campaign ? `/campaigns/${encodeURIComponent(campaign.Name)}` : '',
        apiKey
    );
    
    // Fetch account data, primarily for checking credit balance
    const { data: accountData, loading: accountLoading, error: accountError } = useApi('/account/load', apiKey, {}, apiKey ? 1 : 0);

    const [activeTab, setActiveTab] = useState('overview');

    if (!campaign) {
        return (
            <CenteredMessage>
                <div className="info-message warning">{t('noCampaignSelected')}</div>
            </CenteredMessage>
        );
    }
    
    const loading = statsLoading || detailsLoading || accountLoading;
    const error = statsError || detailsError || accountError;

    const statusStyle = getStatusStyle(campaign.Status);

    const OverviewTab = () => (
        <div className="campaign-overview-tab">
            <div className="card-grid account-grid">
                <AccountDataCard title={t('recipients', { ns: 'common' })} iconPath={ICONS.CONTACTS}>{loading ? '...' : stats?.Recipients?.toLocaleString(i18n.language) ?? '0'}</AccountDataCard>
                <AccountDataCard title={t('delivered', { ns: 'common' })} iconPath={ICONS.VERIFY}>{loading ? '...' : stats?.Delivered?.toLocaleString(i18n.language) ?? '0'}</AccountDataCard>
                <AccountDataCard title={t('opened', { ns: 'common' })} iconPath={ICONS.EYE}>{loading ? '...' : stats?.Opened?.toLocaleString(i18n.language) ?? '0'}</AccountDataCard>
                <AccountDataCard title={t('clicked', { ns: 'common' })} iconPath={ICONS.CLICK}>{loading ? '...' : stats?.Clicked?.toLocaleString(i18n.language) ?? '0'}</AccountDataCard>
            </div>
             <div className="overall-snapshot-grid">
                {stats && <StatsPieChart stats={stats} />}
                <div className="card">
                     <div className="channel-selector-header">
                        <h4>{t('activityOverview', { ns: 'statistics' })}</h4>
                    </div>
                    <OverallActivityChart stats={stats} loading={loading} error={error} />
                </div>
             </div>
        </div>
    );
    
    const DetailsTab = () => (
        <div className="campaign-details-tab-grid">
            {loading ? <Loader /> : (
                <>
                    <div className="card"><CampaignSummary campaignDetails={campaignDetails} stats={stats} campaign={campaign} accountData={accountData} /></div>
                    <DetailedStatsTable stats={stats} />
                </>
            )}
        </div>
    );

    const tabs = [
        { id: 'overview', label: t('overview', { ns: 'campaigns' }), icon: ICONS.DASHBOARD, component: <OverviewTab /> },
        { id: 'details', label: t('details', { ns: 'campaigns' }), icon: ICONS.FILE_TEXT, component: <DetailsTab /> },
    ];

    return (
        <div>
            <div className="view-header">
                <button className="btn btn-secondary" onClick={onBack} style={{ whiteSpace: 'nowrap' }}>
                    <Icon>{ICONS.CHEVRON_LEFT}</Icon>
                    <span>{t('backToCampaigns')}</span>
                </button>
                 <h2 style={{margin: 0, borderBottom: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {campaign.Name}
                </h2>
                <Badge text={statusStyle.text} type={statusStyle.type} iconPath={statusStyle.iconPath} />
            </div>

            {error && <ErrorMessage error={error} />}
            
            <Tabs
                tabs={tabs}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
            />
        </div>
    );
};

// FIX: Add default export to resolve module not found error.
export default CampaignDetailView;

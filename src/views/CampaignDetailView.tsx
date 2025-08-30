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
    const { t, i18n } = useTranslation();

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
        { label: t('inProgress'), value: stats.InProgress, totalForPercent: null },
        { label: t('manualCancel'), value: stats.ManualCancel, totalForPercent: null },
        { label: t('notDelivered'), value: stats.NotDelivered, totalForPercent: null },
    ];

    return (
        <div className="card campaign-stats-table-card">
            <div className="table-container-simple">
                <table className="simple-table">
                    <thead>
                        <tr>
                            <th>{t('metric')}</th>
                            <th style={{textAlign: 'right'}}>{t('total')}</th>
                            <th style={{textAlign: 'right'}}>{t('rate')}</th>
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
    const { t, i18n } = useTranslation();

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
        options.TrackOpens && 'Opens',
        options.TrackClicks && 'Clicks'
    ].filter(Boolean).join(' & ') || 'Disabled';

    // Optimization status
    let optimizationStatus = 'Disabled';
    if (options.DeliveryOptimization === 'ToEngagedFirst') {
        optimizationStatus = t('sendToEngagedFirst');
    } else if (options.EnableSendTimeOptimization) {
        optimizationStatus = t('sendAtOptimalTime');
    }

    // Send time
    let sendTime = 'N/A';
    if (options.ScheduleFor) {
        sendTime = new Date(options.ScheduleFor).toLocaleString(i18n.language, { dateStyle: 'medium', timeStyle: 'short' });
    } else if (campaign.DateSent) {
        sendTime = new Date(campaign.DateSent).toLocaleString(i18n.language, { dateStyle: 'medium', timeStyle: 'short' });
    } else if (campaign.Status !== 'Draft') {
        sendTime = 'Sent Immediately';
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
            <h3>{t('Final Summary')}</h3>
            <dl className="final-summary-grid">
                <SummaryItem label="From Name" value={fromName} />
                <SummaryItem label="Subject" value={content.Subject} />
                <SummaryItem
                    label="Recipients"
                    value={
                        stats ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                <span style={recipientValueStyle}>{stats.Recipients?.toLocaleString(i18n.language)}</span>
                                {!hasEnoughCredits && isNaN(stats.Recipients) && <small style={{ color: 'var(--danger-color)' }}>Insufficient funds</small>}
                            </div>
                        ) : '...'
                    }
                />
                <SummaryItem label="From Email" value={fromEmail} />
                <SummaryItem label="Reply To" value={content.ReplyTo} />

                <hr className="separator" />

                <SummaryItem label="Campaign Name" value={campaignDetails.Name} />
                <SummaryItem label="Template" value={content.TemplateName} />
                <SummaryItem label="Send Time" value={sendTime} />
                <SummaryItem label="Tracking" value={trackingStatus} />
                <SummaryItem label="Time Optimization" value={optimizationStatus} />
            </dl>
        </div>
    );
};

const StatsPieChart = ({ stats }: { stats: any }) => {
    const { t, i18n } = useTranslation();

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

        const pathData = `M 50,50 L ${x1},${y1} A 40,40 0 ${largeArcFlag},1 ${x2},${y2} Z`;
        startAngle = endAngle;

        return { path: pathData, color: d.color, label: d.label, value: d.value, percentage: (d.value / total) * 100 };
    });

    return (
        <div className="card">
            <div className="card-header"><h3>Interaction Breakdown</h3></div>
            <div style={{ display: 'flex', alignItems: 'center', padding: '1.5rem', gap: '2rem', flexWrap: 'wrap' }}>
                <svg viewBox="0 0 100 100" width="200" height="200" style={{flexShrink: 0}}>
                    {/* FIX: Replaced invalid 'title' prop on SVG <path> with a nested <title> element for tooltip. */}
                    {slices.map(slice => (
                        <path key={slice.label} d={slice.path} fill={slice.color}>
                            <title>{`${slice.label}: ${slice.value.toLocaleString()}`}</title>
                        </path>
                    ))}
                </svg>
                <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {slices.map(slice => (
                        <div key={slice.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ width: '12px', height: '12px', backgroundColor: slice.color, borderRadius: '3px' }}></span>
                                <span>{slice.label}</span>
                            </div>
                            <div style={{textAlign: 'right'}}>
                                <span style={{ fontWeight: 600 }}>{slice.value.toLocaleString(i18n.language)}</span>
                                <span style={{ color: 'var(--subtle-text-color)', marginLeft: '0.5rem' }}>({slice.percentage.toFixed(1)}%)</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};


const CampaignDetailView = ({ apiKey, campaign, onBack }: { apiKey: string; campaign: any | null; onBack: () => void; }) => {
    const { t, i18n } = useTranslation();
    const { getStatusStyle } = useStatusStyles();
    const [activeTab, setActiveTab] = useState('report');

    const campaignName = campaign?.Name;
    const isDraft = campaign?.Status === 'Draft';

    const { data: stats, loading: statsLoading, error: statsError } = useApiV4(
        !isDraft && campaignName ? `/statistics/campaigns/${encodeURIComponent(campaignName)}` : '',
        apiKey
    );

    const { data: campaignDetails, loading: detailsLoading, error: detailsError } = useApiV4(
        campaignName ? `/campaigns/${encodeURIComponent(campaignName)}` : '',
        apiKey
    );
    
    const { data: accountData, loading: balanceLoading } = useApi('/account/load', apiKey, {}, apiKey ? 1 : 0);

    const allLoading = statsLoading || detailsLoading || balanceLoading;
    const anyError = statsError || detailsError;

    const kpiData = useMemo(() => {
        if (!stats) return { openRate: '0.00', clickRate: '0.00', recipients: 0, unsubscribed: 0 };
        const delivered = stats.Delivered || 0;
        const opened = stats.Opened || 0;
        const clicked = stats.Clicked || 0;
        const openRate = delivered > 0 ? (opened / delivered) * 100 : 0;
        const clickRate = delivered > 0 ? (clicked / delivered) * 100 : 0;
        return {
            openRate: openRate.toFixed(2),
            clickRate: clickRate.toFixed(2),
            recipients: stats.Recipients || 0,
            unsubscribed: stats.Unsubscribed || 0,
        };
    }, [stats]);
    
    const content = campaignDetails?.Content?.[0];
    const emailBody = content?.Body?.[0]?.Content;

    if (!campaign) {
        return <CenteredMessage>{t('error')}: No campaign selected.</CenteredMessage>;
    }

    const statusStyle = getStatusStyle(campaign.Status);

    const ReportTabContent = () => (
        <div className="campaign-report-container">
            <div className="campaign-detail-kpi-grid" style={{marginTop: '2rem'}}>
                <AccountDataCard title={t('openRate')} iconPath={ICONS.EYE}>{kpiData.openRate}%</AccountDataCard>
                <AccountDataCard title={t('clickRate')} iconPath={ICONS.CLICK}>{kpiData.clickRate}%</AccountDataCard>
                <AccountDataCard title={t('recipients')} iconPath={ICONS.CONTACTS}>{kpiData.recipients.toLocaleString(i18n.language)}</AccountDataCard>
                <AccountDataCard title={t('unsubscribed')} iconPath={ICONS.LOGOUT}>{kpiData.unsubscribed.toLocaleString(i18n.language)}</AccountDataCard>
            </div>
            <OverallActivityChart stats={stats} loading={statsLoading} error={statsError} />
             <StatsPieChart stats={stats} />
        </div>
    );

    const tabs = [
        {
            id: 'report',
            label: t('report'),
            icon: ICONS.STATISTICS,
            component: (
                isDraft ? <CenteredMessage>{t('noStatsForCampaign')}</CenteredMessage> : <ReportTabContent />
            )
        },
        {
            id: 'performance',
            label: t('performance'),
            icon: ICONS.TRENDING_UP,
            component: (
                isDraft ? <CenteredMessage>{t('noStatsForCampaign')}</CenteredMessage> : (stats && !statsLoading && <DetailedStatsTable stats={stats} />)
            )
        },
        {
            id: 'content',
            label: t('content'),
            icon: ICONS.FILE_TEXT,
            component: (
                 <CampaignSummary campaignDetails={campaignDetails} stats={stats} campaign={campaign} accountData={accountData} />
            )
        },
        {
            id: 'template',
            label: t('template'),
            icon: ICONS.ARCHIVE,
            component: (
                emailBody ? (
                    <iframe
                        srcDoc={emailBody}
                        title={t('preview')}
                        className="campaign-detail-content-preview"
                    />
                ) : (
                   detailsLoading ? <Loader /> : <CenteredMessage>{t('couldNotLoadPreview')}</CenteredMessage>
                )
            )
        }
    ];

    return (
        <div>
            <div className="campaign-detail-header">
                <button className="btn btn-secondary" onClick={onBack}>
                    <Icon path={ICONS.CHEVRON_LEFT} />
                    <span>{t('campaigns')}</span>
                </button>
                <h2>{campaign.Name}</h2>
                <Badge text={statusStyle.text} type={statusStyle.type} iconPath={statusStyle.iconPath} />
            </div>

            {allLoading && <CenteredMessage><Loader /></CenteredMessage>}
            {anyError && <ErrorMessage error={anyError} />}

            {!allLoading && !anyError && (
                <Tabs tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />
            )}
        </div>
    );
};

export default CampaignDetailView;

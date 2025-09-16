import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import useApiV4 from '../hooks/useApiV4';
import { apiFetchV4, apiFetch } from '../api/elasticEmail';
import { List, Segment, Template } from '../api/types';
import { useToast } from '../contexts/ToastContext';
import Loader from '../components/Loader';
import Icon, { ICONS } from '../components/Icon';
import CenteredMessage from '../components/CenteredMessage';
import Modal from '../components/Modal';
import MultiSelectSearch from '../components/MultiSelectSearch';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';

const emptyContent = { From: '', FromName: '', ReplyTo: '', Subject: '', TemplateName: '', Preheader: '', Body: null, Utm: null };
const initialCampaignState = {
    Name: '',
    Content: [JSON.parse(JSON.stringify(emptyContent))],
    Recipients: { ListNames: [], SegmentNames: [] },
    Options: { 
        TrackOpens: true, 
        TrackClicks: true, 
        DeliveryOptimization: 'None',
        EnableSendTimeOptimization: false
    }
};

// Decode a Base64 string to UTF-8 using modern browser APIs
const decodeState = (base64: string): string => {
    // 1. Decode the Base64 string to a binary string.
    const binary_string = window.atob(base64);
    // 2. Create a Uint8Array from the binary string.
    const bytes = new Uint8Array(binary_string.length);
    for (let i = 0; i < binary_string.length; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    // 3. Decode the UTF-8 bytes back to a string.
    return new TextDecoder().decode(bytes);
}

const SendEmailView = ({ apiKey, setView, campaignToLoad }: { apiKey: string, setView: (view: string, data?: any) => void; campaignToLoad?: any }) => {
    const { t, i18n } = useTranslation(['sendEmail', 'templates', 'common', 'send-wizard']);
    const { addToast } = useToast();
    
    const [isSending, setIsSending] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [activeContent, setActiveContent] = useState(0);
    const [recipientTarget, setRecipientTarget] = useState< 'list' | 'segment' | 'all' | null>(null);
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [templateSearchTerm, setTemplateSearchTerm] = useState('');
    const [recipientCount, setRecipientCount] = useState<number | null>(null);
    const [isCountLoading, setIsCountLoading] = useState(false);
    const [campaign, setCampaign] = useState(JSON.parse(JSON.stringify(initialCampaignState)));
    const [segmentCounts, setSegmentCounts] = useState<Record<string, number | null>>({});
    
    const { data: lists, loading: listsLoading } = useApiV4('/lists', apiKey, { limit: 1000 });
    const { data: segments, loading: segmentsLoading } = useApiV4('/segments', apiKey, {});
    const { data: domains, loading: domainsLoading } = useApiV4('/domains', apiKey, {});
    const { data: templates, loading: templatesLoading } = useApiV4(
        '/templates',
        apiKey,
        {
            limit: 1000,
            scopeType: 'Personal',
            templateTypes: 'RawHTML',
        }
    );
    
    const listItems = useMemo(() => (Array.isArray(lists) ? lists : []).map((l: List) => ({ id: l.ListName, name: l.ListName })), [lists]);
    
    useEffect(() => {
        if (segments && Array.isArray(segments) && apiKey) {
            segments.forEach((seg: Segment) => {
                if (segmentCounts[seg.Name] === undefined) {
                    apiFetch('/contact/count', apiKey, { params: { rule: seg.Rule } })
                        .then(count => {
                            setSegmentCounts(prev => ({ ...prev, [seg.Name]: Number(count) }));
                        })
                        .catch(() => {
                            setSegmentCounts(prev => ({ ...prev, [seg.Name]: null }));
                        });
                }
            });
        }
    }, [segments, apiKey, segmentCounts]);

    const segmentItems = useMemo(() => {
        if (!Array.isArray(segments)) return [];
        return segments.map((s: Segment) => {
            const count = segmentCounts[s.Name];
            const nameWithCount = count !== null && count !== undefined
                ? `${s.Name} (${count.toLocaleString()})`
                : s.Name;
            return { id: s.Name, name: nameWithCount };
        });
    }, [segments, segmentCounts]);


    const verifiedDomainsWithDefault = useMemo(() => {
        if (!Array.isArray(domains)) return [];
        return domains
            .filter(d => String(d.Spf).toLowerCase() === 'true' && String(d.Dkim).toLowerCase() === 'true')
            .map(d => ({
                domain: d.Domain,
                defaultSender: d.DefaultSender || `mailer@${d.Domain}`
            }));
    }, [domains]);

    const [selectedDomain, setSelectedDomain] = useState('');

    const handleValueChange = (section: 'Campaign' | 'Content' | 'Options', key: string, value: any, contentIndex: number = activeContent) => {
        setCampaign(prev => {
            if (section === 'Campaign') {
                return { ...prev, [key]: value };
            }
            if (section === 'Content') {
                return {
                    ...prev,
                    Content: prev.Content.map((item, idx) => 
                        idx === contentIndex ? { ...item, [key]: value } : item
                    )
                };
            }
            if (section === 'Options') {
                return {
                    ...prev,
                    Options: { ...prev.Options, [key]: value }
                };
            }
            return prev;
        });
    };

    const handleDomainChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const domainName = e.target.value;
        setSelectedDomain(domainName);
        const domainInfo = verifiedDomainsWithDefault.find(d => d.domain === domainName);
        if (domainInfo) {
            handleValueChange('Content', 'From', domainInfo.defaultSender);
        }
    };
        
    const filteredTemplates = useMemo(() => {
        if (!Array.isArray(templates)) return [];
        return templates.filter((t: Template) => t.Name.toLowerCase().includes(templateSearchTerm.toLowerCase()));
    }, [templates, templateSearchTerm]);
    
    const resetForm = useCallback(() => {
        setCampaign(JSON.parse(JSON.stringify(initialCampaignState)));
        setRecipientTarget(null);
        setRecipientCount(null);
        setIsEditing(false);
        setSelectedDomain('');
    }, []);

    useEffect(() => {
        if (campaignToLoad) {
            setIsEditing(true);
            const loadedContent = campaignToLoad.Content?.[0] || {};
            
            const fromString = loadedContent.From || '';
            let fromName = loadedContent.FromName;
            let fromEmail = fromString;

            const angleBracketMatch = fromString.match(/(.*)<(.*)>/);
            if (angleBracketMatch && angleBracketMatch.length === 3) {
                fromName = fromName || angleBracketMatch[1].trim().replace(/"/g, '');
                fromEmail = angleBracketMatch[2].trim();
            } else {
                const lastSpaceIndex = fromString.lastIndexOf(' ');
                if (lastSpaceIndex !== -1 && fromString.substring(lastSpaceIndex + 1).includes('@')) {
                    fromName = fromName || fromString.substring(0, lastSpaceIndex).trim();
                    fromEmail = fromString.substring(lastSpaceIndex + 1).trim();
                }
            }
            
            const domainPart = fromEmail.split('@')[1];
            if (domainPart) {
                setSelectedDomain(domainPart);
            }

            const loadedOptions = campaignToLoad.Options || {};
            const loadedRecipients = campaignToLoad.Recipients || {};

            setCampaign({
                Name: campaignToLoad.Name || '',
                Content: [{
                    From: fromEmail || '',
                    FromName: fromName || '',
                    ReplyTo: loadedContent.ReplyTo || '',
                    Subject: loadedContent.Subject || '',
                    TemplateName: loadedContent.TemplateName || '',
                    Preheader: loadedContent.Preheader || '',
                    Body: loadedContent.Body || null,
                    Utm: loadedContent.Utm || null
                }],
                Recipients: {
                    ListNames: loadedRecipients.ListNames || [],
                    SegmentNames: loadedRecipients.SegmentNames || [],
                },
                Options: {
                    TrackOpens: loadedOptions.TrackOpens !== false,
                    TrackClicks: loadedOptions.TrackClicks !== false,
                    DeliveryOptimization: loadedOptions.DeliveryOptimization || 'None',
                    EnableSendTimeOptimization: loadedOptions.EnableSendTimeOptimization || false,
                }
            });

            if (loadedRecipients.ListNames?.length > 0) {
                setRecipientTarget('list');
            } else if (loadedRecipients.SegmentNames?.length > 0 && loadedRecipients.SegmentNames.includes('All Contacts')) {
                setRecipientTarget('all');
            } else if (loadedRecipients.SegmentNames?.length > 0) {
                setRecipientTarget('segment');
            } else if (Object.keys(loadedRecipients).length === 0) {
                setRecipientTarget('all');
            } else {
                setRecipientTarget(null);
            }
        } else {
            setIsEditing(false);
            resetForm();
        }
    }, [campaignToLoad, resetForm]);

    // Effect to set initial domain
    useEffect(() => {
        if (!campaignToLoad && verifiedDomainsWithDefault.length > 0 && !selectedDomain) {
            const initialDomain = verifiedDomainsWithDefault[0];
            setSelectedDomain(initialDomain.domain);
            handleValueChange('Content', 'From', initialDomain.defaultSender);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [verifiedDomainsWithDefault, campaignToLoad, selectedDomain]);

    useEffect(() => {
        const calculateCount = async () => {
            if (!apiKey) return;

            // --- ASYNCHRONOUS PATH for 'all' and 'list' ---
            if (recipientTarget === 'all' || (recipientTarget === 'list' && campaign.Recipients.ListNames.length > 0)) {
                // The key fix is NOT setting a loading state that removes the existing count.
                // By just fetching and then setting the new count, the number will update seamlessly
                // without a disruptive "flash" or loading indicator replacing it.
                try {
                    let countResult: number | null = null;
                    if (recipientTarget === 'all') {
                        const count = await apiFetch('/contact/count', apiKey, { params: { allContacts: 'true' } });
                        countResult = Number(count);
                    } else { // 'list'
                        const counts = await Promise.all(
                            campaign.Recipients.ListNames.map(listName =>
                                apiFetch('/contact/count', apiKey, { params: { rule: `listname = '${listName.replace(/'/g, "''")}'` } })
                            )
                        );
                        countResult = counts.reduce((sum, count) => sum + Number(count), 0);
                    }
                    setRecipientCount(countResult);
                } catch (error) {
                    console.error("Failed to calculate recipient count:", error);
                    addToast(`Failed to get recipient count: ${(error as Error).message}`, 'error');
                    setRecipientCount(null);
                }
                return;
            }

            // --- SYNCHRONOUS PATH for 'segment', empty selection, or null target ---
            setIsCountLoading(false); // Ensure loader is always off for sync operations.
            if (recipientTarget === 'segment' && campaign.Recipients.SegmentNames.length > 0) {
                const total = campaign.Recipients.SegmentNames.reduce((sum, segmentName) => {
                    const count = segmentCounts[segmentName];
                    return sum + (typeof count === 'number' ? count : 0);
                }, 0);
                setRecipientCount(total);
            } else {
                setRecipientCount(0); // Default to 0 if no recipients are selected
            }
        };

        const debounceTimer = setTimeout(() => {
            calculateCount();
        }, 300);

        return () => clearTimeout(debounceTimer);
    }, [recipientTarget, campaign.Recipients.ListNames, campaign.Recipients.SegmentNames, apiKey, segmentCounts, addToast]);
    
    const handleSelectionChange = (selectedNames: string[], type: 'ListNames' | 'SegmentNames') => {
        setCampaign(prev => {
            const otherType = type === 'ListNames' ? 'SegmentNames' : 'ListNames';
            return {
                ...prev,
                Recipients: {
                    ...prev.Recipients,
                    [otherType]: [],
                    [type]: selectedNames,
                }
            }
        });
    };

    const isRecipientSelected = useMemo(() => (
        recipientTarget === 'all' ||
        (recipientTarget === 'list' && campaign.Recipients.ListNames.length > 0) ||
        (recipientTarget === 'segment' && campaign.Recipients.SegmentNames.length > 0)
    ), [recipientTarget, campaign.Recipients]);

    const handleSubmit = async (action: 'send' | 'draft') => {
        if (action !== 'draft' && !isRecipientSelected) {
            addToast(t('selectRecipientsToSend'), 'error');
            return;
        }

        setIsSending(true);
    
        const payload = JSON.parse(JSON.stringify(campaign));
    
        payload.Content = payload.Content.map((c: any) => {
            const fromEmail = c.From;
            const fromName = c.FromName;
            const combinedFrom = fromName ? `${fromName} ${fromEmail}` : fromEmail;
            
            const newContent = { ...c, From: combinedFrom };
            delete newContent.FromName;
            return newContent;
        });
    
        if (action === 'send') {
            payload.Status = 'Active';
        } else { // 'draft'
            payload.Status = 'Draft';
        }
    
        payload.Content = payload.Content.map((c: any) => ({...c, Body: null, TemplateName: c.TemplateName || null}));
            
        let finalRecipients: { ListNames?: string[]; SegmentNames?: string[] } = {};

        switch (recipientTarget) {
            case 'list':
                finalRecipients = { ListNames: campaign.Recipients.ListNames || [] };
                break;
            case 'segment':
                finalRecipients = { SegmentNames: campaign.Recipients.SegmentNames || [] };
                break;
            case 'all':
                if (!isEditing) {
                    finalRecipients = { SegmentNames: ['All Contacts'] };
                } else {
                    finalRecipients = {};
                }
                break;
            default: // recipientTarget is null
                finalRecipients = { ListNames: [], SegmentNames: [] };
                break;
        }
    
        payload.Recipients = finalRecipients;
    
        try {
            if (isEditing && campaignToLoad) {
                await apiFetchV4(`/campaigns/${encodeURIComponent(campaignToLoad.Name)}`, apiKey, { method: 'PUT', body: payload });
            } else {
                await apiFetchV4('/campaigns', apiKey, { method: 'POST', body: payload });
            }
            
            addToast(payload.Status === 'Draft' ? t('draftSavedSuccess') : t('emailSentSuccess'), 'success');
            setView('Campaigns');
        } catch (err: any) {
            addToast(t('emailSentError', { error: err.message }), 'error');
        } finally {
            setIsSending(false);
        }
    };
    
    const handleSelectTemplate = async (templateName: string) => {
        setIsTemplateModalOpen(false);
        setIsSending(true);
        try {
            const fullTemplate = await apiFetchV4(`/templates/${encodeURIComponent(templateName)}`, apiKey);
            const htmlContent = fullTemplate.Body?.[0]?.Content;
            let fromName = '';
            let subject = fullTemplate.Subject || '';
    
            if (htmlContent) {
                const parser = new DOMParser();
                const doc = parser.parseFromString(htmlContent, 'text/html');
                const stateContainer = doc.getElementById('mailzila-template-state');
                const base64State = stateContainer?.getAttribute('data-state');
    
                if (base64State) {
                    try {
                        const jsonState = decodeState(base64State);
                        const state = JSON.parse(jsonState);
                        fromName = state.fromName || '';
                        subject = state.subject || fullTemplate.Subject || '';
                    } catch (e) {
                        console.error("Failed to parse template state from HTML.", e);
                    }
                }
            }
            
            setCampaign(prev => ({
                ...prev,
                Content: prev.Content.map((item, idx) => 
                    idx === activeContent ? { 
                        ...item, 
                        TemplateName: fullTemplate.Name,
                        Subject: subject,
                        FromName: fromName
                    } : item
                )
            }));
    
        } catch (err: any) {
            addToast(`Failed to load template: ${err.message}`, 'error');
        } finally {
            setIsSending(false);
        }
    };

    const handleGoToDomains = () => {
        sessionStorage.setItem('account-tab', 'domains');
        setView('Account');
    };

    const handleGoToBuilder = () => {
        setIsTemplateModalOpen(false);
        setView('Email Builder');
    };
    
    const currentContent = campaign.Content[activeContent] || {};
        
    if (domainsLoading) return <CenteredMessage><Loader /></CenteredMessage>;
    
    return (
        <div className="quick-send-container">
             <Modal isOpen={isTemplateModalOpen} onClose={() => setIsTemplateModalOpen(false)} title={t('templates')}>
                <div className="template-selector-modal">
                    <div className="search-bar" style={{marginBottom: '1rem'}}>
                        <Icon>{ICONS.SEARCH}</Icon>
                        <input
                            type="search"
                            placeholder={t('searchTemplatesPlaceholder')}
                            value={templateSearchTerm}
                            onChange={e => setTemplateSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="template-list-container">
                        {templatesLoading ? <Loader /> : (
                            !Array.isArray(templates) || templates.length === 0 ? (
                                <EmptyState
                                    icon={ICONS.ARCHIVE}
                                    title={t('noTemplatesFound', { ns: 'templates' })}
                                    message={t('noTemplatesFoundDesc', { ns: 'templates' })}
                                    ctaText={t('createTemplate', { ns: 'templates' })}
                                    onCtaClick={handleGoToBuilder}
                                />
                            ) : filteredTemplates.length > 0 ? (
                                filteredTemplates.map((template: Template) => (
                                    <button
                                        type="button"
                                        key={template.Name}
                                        className="template-list-item"
                                        onClick={() => handleSelectTemplate(template.Name)}
                                    >
                                        <span>{template.Name}</span>
                                        <small>{template.Subject || t('noSubject', { ns: 'campaigns' })}</small>
                                    </button>
                                ))
                            ) : (
                                <CenteredMessage>{t('noTemplatesForQuery', {query: templateSearchTerm, ns: 'templates'})}</CenteredMessage>
                            )
                        )}
                    </div>
                </div>
            </Modal>
            <div className="quick-send-header">
                 <h2>{t('quickSend')}</h2>
                 <p>{t('quickSendDesc')}</p>
            </div>
            <div className="quick-send-form">
                 <div className="card">
                    <div className="card-header">
                        <h3>{`1. ${t('campaignName')}`}</h3>
                    </div>
                    <div className="card-body">
                         <div className="form-group">
                            <label>{t('campaignNameHelpText')}</label>
                            <input
                                type="text"
                                value={campaign.Name}
                                onChange={(e) => handleValueChange('Campaign', 'Name', e.target.value)}
                                required
                                placeholder={t('campaignNamePlaceholder', { ns: 'send-wizard', defaultValue: 'e.g. Welcome to our app' })}
                            />
                        </div>
                    </div>
                </div>

                <div className="card card--overflow-visible">
                    <div className="card-header">
                        <h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <span>2. {t('recipients', { ns: 'common' })}</span>
                                <span className="badge-total-recipients">
                                    {isCountLoading ? <Loader /> : (recipientCount !== null ? recipientCount.toLocaleString(i18n.language) : '0')}
                                </span>
                            </div>
                        </h3>
                    </div>
                    <div className="card-body">
                        <div className="form-group recipient-target-selector">
                            <label className="custom-radio"><input type="radio" name="rt" value="all" checked={recipientTarget === 'all'} onChange={() => setRecipientTarget('all')} /><span className="radio-checkmark"></span><span className="radio-label">{t('allContacts')}</span></label>
                            <label className="custom-radio"><input type="radio" name="rt" value="list" checked={recipientTarget === 'list'} onChange={() => setRecipientTarget('list')} /><span className="radio-checkmark"></span><span className="radio-label">{t('aList')}</span></label>
                            <label className="custom-radio"><input type="radio" name="rt" value="segment" checked={recipientTarget === 'segment'} onChange={() => setRecipientTarget('segment')} /><span className="radio-checkmark"></span><span className="radio-label">{t('aSegment')}</span></label>
                        </div>
                        {recipientTarget === 'list' && (
                            <div style={{marginTop: '1.5rem'}}>
                                <MultiSelectSearch
                                    items={listItems}
                                    selectedItems={campaign.Recipients.ListNames}
                                    onSelectionChange={(selected) => handleSelectionChange(selected, 'ListNames')}
                                    placeholder={t('chooseList')}
                                    loading={listsLoading}
                                />
                            </div>
                        )}
                         {recipientTarget === 'segment' && (
                            <div style={{marginTop: '1.5rem'}}>
                                <MultiSelectSearch
                                    items={segmentItems}
                                    selectedItems={campaign.Recipients.SegmentNames}
                                    onSelectionChange={(selected) => handleSelectionChange(selected, 'SegmentNames')}
                                    placeholder={t('chooseSegment')}
                                    loading={segmentsLoading}
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3>{`3. ${t('subject')} / ${t('content')}`}</h3>
                    </div>
                    <div className="card-body" style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
                        <div className="form-group">
                            <label>{t('template')}</label>
                            {currentContent.TemplateName ? (
                                <div className="template-summary">
                                    <Icon>{ICONS.ARCHIVE}</Icon>
                                    <span>{currentContent.TemplateName}</span>
                                    <button type="button" className="btn btn-secondary" onClick={() => setIsTemplateModalOpen(true)}>{t('changeTemplate')}</button>
                                </div>
                            ) : (
                                <button type="button" className="btn-choose-template" onClick={() => setIsTemplateModalOpen(true)}>
                                    <Icon>{ICONS.ARCHIVE}</Icon>
                                    <span>{t('useTemplate')}</span>
                                </button>
                            )}
                        </div>

                        {currentContent.TemplateName && (
                            <>
                                 <div className="form-grid">
                                    <div className="form-group"><label>{t('fromName')}</label><input type="text" value={currentContent.FromName} onChange={e => handleValueChange('Content', 'FromName', e.target.value)} /></div>
                                    <div className="form-group">
                                        <label>{t('fromEmail')}</label>
                                        {verifiedDomainsWithDefault.length > 0 ? (
                                            <>
                                            <select value={selectedDomain} onChange={handleDomainChange}>
                                                {verifiedDomainsWithDefault.map(d => <option key={d.domain} value={d.domain}>{d.domain}</option>)}
                                            </select>
                                            <p style={{fontSize: '0.9rem', color: 'var(--subtle-text-color)', marginTop: '0.5rem'}}>
                                                {t('sending')}: <strong>{currentContent.From}</strong>
                                            </p>
                                            </>
                                        ) : (
                                            <div className="info-message warning" style={{width: '100%', margin: 0}}>
                                                <p style={{margin: 0}}>
                                                    {t('noVerifiedDomainsToSendError')}{' '}
                                                    <button type="button" className="link-button" onClick={handleGoToDomains}>
                                                        {t('addDomainNow')}
                                                    </button>
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="form-group"><label>{t('subject')}</label><input type="text" value={currentContent.Subject} onChange={e => handleValueChange('Content', 'Subject', e.target.value)} required /></div>
                                <div className="form-group"><label>{t('preheader')}</label><input type="text" value={currentContent.Preheader} onChange={e => handleValueChange('Content', 'Preheader', e.target.value)} /></div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="quick-send-actions">
                <p>{t('finalSummaryText', { template: campaign.Content[0].TemplateName || '...', count: recipientCount || 0 })}</p>
                <div className="action-buttons">
                    <Button type="button" className="btn-secondary" onClick={() => handleSubmit('draft')} disabled={isSending} action="save_draft">{t('saveAsDraft')}</Button>
                    <Button type="button" className="btn-primary" onClick={() => handleSubmit('send')} disabled={isSending || verifiedDomainsWithDefault.length === 0 || !isRecipientSelected} action="send_campaign">{isSending ? <Loader/> : t('sendNow')}</Button>
                </div>
            </div>
        </div>
    );
};

export default SendEmailView;

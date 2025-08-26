
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

type RecipientTarget = 'list' | 'segment' | 'all';
type ContentMethod = 'template' | 'plainText';
type AccordionSection = 'recipients' | 'content' | 'settings' | '';

const emptyContent = { From: '', FromName: '', ReplyTo: '', Subject: '', TemplateName: '', Preheader: '', Body: null, Utm: null };
const initialCampaignState = {
    Name: '',
    Content: [JSON.parse(JSON.stringify(emptyContent))],
    Recipients: { ListNames: [], SegmentNames: [] },
    Options: { 
        TrackOpens: true, 
        TrackClicks: true, 
        ScheduleFor: null as string | null,
        DeliveryOptimization: 'None',
        EnableSendTimeOptimization: false
    }
};


const AccordionItem = ({ 
    id, 
    title, 
    children, 
    openAccordion, 
    setOpenAccordion 
}: { 
    id: AccordionSection, 
    title: string, 
    children: React.ReactNode,
    openAccordion: AccordionSection,
    setOpenAccordion: (id: AccordionSection) => void
}) => (
    <div className="accordion-item">
        <div className={`accordion-header ${openAccordion === id ? 'open' : ''}`} onClick={() => setOpenAccordion(openAccordion === id ? '' : id)}>
            <h3>{title}</h3>
            <Icon path={ICONS.CHEVRON_DOWN} className={`accordion-icon ${openAccordion === id ? 'open' : ''}`} />
        </div>
        {openAccordion === id && <div className="accordion-content">{children}</div>}
    </div>
);


const SendEmailView = ({ apiKey, setView, campaignToLoad }: { apiKey: string, setView: (view: string, data?: any) => void; campaignToLoad?: any }) => {
    const { t, i18n } = useTranslation();
    const { addToast } = useToast();
    
    const [isSending, setIsSending] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [activeContent, setActiveContent] = useState(0);
    const [recipientTarget, setRecipientTarget] = useState<RecipientTarget>('all');
    const [contentMethod, setContentMethod] = useState<ContentMethod>('template');
    const [openAccordion, setOpenAccordion] = useState<AccordionSection>('recipients');
    const [isOptimizationOn, setIsOptimizationOn] = useState(false);
    const [isScheduling, setIsScheduling] = useState(false);
    const [scheduleDate, setScheduleDate] = useState('');
    const [scheduleTime, setScheduleTime] = useState('');
    const [isUtmEnabled, setIsUtmEnabled] = useState(false);
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [templateSearchTerm, setTemplateSearchTerm] = useState('');
    const [recipientCount, setRecipientCount] = useState<number | null>(null);
    const [isCountLoading, setIsCountLoading] = useState(false);
    const [campaign, setCampaign] = useState(JSON.parse(JSON.stringify(initialCampaignState)));
    
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
    const segmentItems = useMemo(() => (Array.isArray(segments) ? segments : []).map((s: Segment) => ({ id: s.Name, name: s.Name })), [segments]);

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
        setRecipientTarget('all');
        setContentMethod('template');
        setIsScheduling(false);
        setScheduleDate('');
        setScheduleTime('');
        setIsOptimizationOn(false);
        setIsUtmEnabled(false);
        setOpenAccordion('recipients');
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
                    ScheduleFor: loadedOptions.ScheduleFor || null,
                    DeliveryOptimization: loadedOptions.DeliveryOptimization || 'None',
                    EnableSendTimeOptimization: loadedOptions.EnableSendTimeOptimization || false,
                }
            });

            if (loadedRecipients.ListNames?.length > 0) setRecipientTarget('list');
            else if (loadedRecipients.SegmentNames?.length > 0) setRecipientTarget('segment');
            else setRecipientTarget('all');

            setContentMethod(loadedContent.TemplateName ? 'template' : 'plainText');
            setIsScheduling(!!loadedOptions.ScheduleFor);
            setIsOptimizationOn(loadedOptions.DeliveryOptimization === 'ToEngagedFirst' || loadedOptions.EnableSendTimeOptimization);
            setIsUtmEnabled(!!loadedContent.Utm);
            setOpenAccordion('recipients');
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
    
            const shouldShowLoader = recipientTarget === 'all' || (recipientTarget === 'list' && campaign.Recipients.ListNames.length > 0);
            if (shouldShowLoader) {
                setIsCountLoading(true);
            }
            setRecipientCount(null);
    
            try {
                if (recipientTarget === 'all') {
                    const count = await apiFetch('/contact/count', apiKey, { params: { allContacts: 'true' } });
                    setRecipientCount(Number(count));
                } else if (recipientTarget === 'list' && campaign.Recipients.ListNames.length > 0) {
                    const counts = await Promise.all(
                        campaign.Recipients.ListNames.map(listName =>
                            apiFetch('/contact/count', apiKey, { params: { rule: `listname = '${listName.replace(/'/g, "''")}'` } })
                        )
                    );
                    const total = counts.reduce((sum, count) => sum + Number(count), 0);
                    setRecipientCount(total);
                } else if (recipientTarget === 'segment' && campaign.Recipients.SegmentNames.length > 0) {
                    if (segments && Array.isArray(segments)) {
                        const total = campaign.Recipients.SegmentNames.reduce((sum, segmentName) => {
                            const segment = segments.find((s: Segment) => s.Name === segmentName);
                            return sum + (segment?.ContactsCount || 0);
                        }, 0);
                        setRecipientCount(total);
                    } else {
                        setRecipientCount(null);
                    }
                } else {
                    setRecipientCount(0);
                }
            } catch (error) {
                console.error("Failed to calculate recipient count:", error);
                addToast(`Failed to get recipient count: ${(error as Error).message}`, 'error');
                setRecipientCount(null);
            } finally {
                if (shouldShowLoader) {
                    setIsCountLoading(false);
                }
            }
        };
    
        const debounceTimer = setTimeout(() => {
            calculateCount();
        }, 300);
    
        return () => clearTimeout(debounceTimer);
    }, [recipientTarget, campaign.Recipients.ListNames, campaign.Recipients.SegmentNames, apiKey, segments, addToast]);


    useEffect(() => {
        if (isScheduling) {
            const scheduleFor = campaign.Options.ScheduleFor;
            const initialDate = scheduleFor ? new Date(scheduleFor) : (() => {
                const now = new Date();
                now.setHours(now.getHours() + 1);
                const minutes = now.getMinutes();
                now.setMinutes(minutes - (minutes % 5) + 5);
                now.setSeconds(0);
                now.setMilliseconds(0);
                return now;
            })();

            const year = initialDate.getFullYear();
            const month = String(initialDate.getMonth() + 1).padStart(2, '0');
            const day = String(initialDate.getDate()).padStart(2, '0');
            const hours = String(initialDate.getHours()).padStart(2, '0');
            const minutes = String(initialDate.getMinutes()).padStart(2, '0');

            setScheduleDate(`${year}-${month}-${day}`);
            setScheduleTime(`${hours}:${minutes}`);
        }
    }, [isScheduling, campaign.Options.ScheduleFor]);

    useEffect(() => {
        if (isScheduling) {
            if (scheduleDate && scheduleTime) {
                const combined = new Date(`${scheduleDate}T${scheduleTime}`);
                if (!isNaN(combined.getTime())) {
                    handleValueChange('Options', 'ScheduleFor', combined.toISOString());
                }
            } else {
                handleValueChange('Options', 'ScheduleFor', null);
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scheduleDate, scheduleTime, isScheduling]);

    useEffect(() => {
        if (isOptimizationOn) {
            setCampaign(c => ({
                ...c,
                Options: { ...c.Options, DeliveryOptimization: 'ToEngagedFirst', EnableSendTimeOptimization: false }
            }));
        } else {
            setCampaign(c => ({
                ...c,
                Options: { ...c.Options, DeliveryOptimization: 'None', EnableSendTimeOptimization: false }
            }));
        }
    }, [isOptimizationOn]);
    
    const handleUtmFieldChange = (field: string, value: string, contentIndex: number) => {
        setCampaign(prev => {
            const newContent = [...prev.Content];
            const currentContent = newContent[contentIndex];
            const newUtm = { ...currentContent.Utm, [field]: value };
            newContent[contentIndex] = { ...currentContent, Utm: newUtm };
            return { ...prev, Content: newContent };
        });
    };
    
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

    const handleSubmit = async (action: 'send' | 'draft' | 'schedule') => {
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
    
        if (action === 'send') payload.Status = 'Active';
        else if (action === 'schedule' && payload.Options.ScheduleFor) {
            payload.Status = 'Active';
            payload.Options = { ...payload.Options, Trigger: { Count: 1 } };
        } else payload.Status = 'Draft';
    
        if (contentMethod === 'plainText') {
             payload.Content = payload.Content.map((c: any) => ({...c, Body: { Content: c.Body?.Content || '', ContentType: 'PlainText', Charset: 'utf-8' }, TemplateName: null }));
        } else {
             payload.Content = payload.Content.map((c: any) => ({...c, Body: null, TemplateName: c.TemplateName || null}));
        }
        
        if (!isUtmEnabled) {
             payload.Content = payload.Content.map((c: any) => { const { Utm, ...rest } = c; return rest; });
        }
    
        let finalRecipients = {};
        if (recipientTarget === 'list') finalRecipients = { ListNames: campaign.Recipients.ListNames || [] };
        else if (recipientTarget === 'segment') finalRecipients = { SegmentNames: campaign.Recipients.SegmentNames || [] };
    
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
    
    const handleSelectTemplate = (templateName: string) => {
        handleValueChange('Content', 'TemplateName', templateName, activeContent);
        setIsTemplateModalOpen(false);
    };

    const handleGoToDomains = () => {
        sessionStorage.setItem('account-tab', 'domains');
        setView('Account');
    };
    
    const currentContent = campaign.Content[activeContent] || {};
    
    const recipientAccordionTitle = useMemo(() => {
        let title = `1. ${t('recipients')}`;
        const count = isCountLoading ? '...' : (recipientCount !== null ? recipientCount.toLocaleString(i18n.language) : '...');
        title += ` (${count})`;
        return title;
    }, [t, isCountLoading, recipientCount, i18n.language]);
    
    if (domainsLoading) return <CenteredMessage><Loader /></CenteredMessage>;
    
    return (
        <div>
             <Modal isOpen={isTemplateModalOpen} onClose={() => setIsTemplateModalOpen(false)} title={t('templates')}>
                <div className="template-selector-modal">
                    <div className="search-bar" style={{marginBottom: '1rem'}}>
                        <Icon path={ICONS.SEARCH} />
                        <input
                            type="search"
                            placeholder={t('searchTemplatesPlaceholder')}
                            value={templateSearchTerm}
                            onChange={e => setTemplateSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="template-list-container">
                        {templatesLoading ? <Loader /> : filteredTemplates.length > 0 ? (
                            filteredTemplates.map((template: Template) => (
                                <button
                                    type="button"
                                    key={template.Name}
                                    className="template-list-item"
                                    onClick={() => handleSelectTemplate(template.Name)}
                                >
                                    <span>{template.Name}</span>
                                    <small>{template.Subject || t('noSubject')}</small>
                                </button>
                            ))
                        ) : (
                            <CenteredMessage>{t('noTemplatesForQuery', {query: templateSearchTerm})}</CenteredMessage>
                        )}
                    </div>
                </div>
            </Modal>
            <h2 className="content-header" style={{marginBottom: '2rem'}}>
                {t('createCampaign')}
            </h2>
            <div className="accordion">
                <AccordionItem 
                    id="recipients" 
                    title={recipientAccordionTitle}
                    openAccordion={openAccordion}
                    setOpenAccordion={setOpenAccordion}
                >
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
                </AccordionItem>

                <AccordionItem 
                    id="content" 
                    title={`2. ${t('subject')} / ${t('content')}`}
                    openAccordion={openAccordion}
                    setOpenAccordion={setOpenAccordion}
                >
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
                                    Sending from: <strong>{currentContent.From}</strong>
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
                    
                    <h4>{t('content')}</h4>
                    <div className="content-method-tabs">
                        <button type="button" className={`content-method-tab ${contentMethod === 'template' ? 'active' : ''}`} onClick={() => setContentMethod('template')}><Icon path={ICONS.ARCHIVE} /> {t('templates')}</button>
                        <button type="button" className={`content-method-tab ${contentMethod === 'plainText' ? 'active' : ''}`} onClick={() => setContentMethod('plainText')}><Icon path={ICONS.TYPE} /> {t('plainText')}</button>
                    </div>

                    {contentMethod === 'template' && (
                        <div className="form-group">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
                                <input 
                                    type="text" 
                                    readOnly 
                                    value={currentContent.TemplateName || ''} 
                                    placeholder={t('noTemplatesFound')} 
                                    onClick={() => setIsTemplateModalOpen(true)}
                                    style={{cursor: 'pointer'}}
                                />
                                <button type="button" className="btn btn-secondary" onClick={() => setIsTemplateModalOpen(true)}>{t('useTemplate')}</button>
                            </div>
                        </div>
                    )}
                    {contentMethod === 'plainText' && <textarea value={currentContent.Body?.Content || ''} onChange={e => handleValueChange('Content', 'Body', { ...currentContent.Body, Content: e.target.value }, activeContent)} rows={10} />}
                </AccordionItem>

                <AccordionItem 
                    id="settings" 
                    title={`3. ${t('settingsAndTracking')}`}
                    openAccordion={openAccordion}
                    setOpenAccordion={setOpenAccordion}
                >
                    <div className="form-group">
                        <label>{t('campaignName')}</label>
                        <input
                            type="text"
                            value={campaign.Name}
                            onChange={(e) => handleValueChange('Campaign', 'Name', e.target.value)}
                            required
                        />
                    </div>
                    
                    <h4>{t('sending')}</h4>
                    <div className="form-group" style={{display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '1rem'}}><label className="toggle-switch"><input type="checkbox" id="opt-toggle" checked={isOptimizationOn} onChange={e => setIsOptimizationOn(e.target.checked)} /><span className="toggle-slider"></span></label><label htmlFor="opt-toggle" style={{marginBottom: 0}}>{t('sendTimeOptimization')}</label></div>
                    {isOptimizationOn && (
                        <div className="form-group" style={{paddingLeft: '1rem', borderLeft: '2px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                            <label className="custom-radio">
                                <input type="radio" name="dto" value="ToEngagedFirst" 
                                       checked={campaign.Options.DeliveryOptimization === 'ToEngagedFirst'} 
                                       onChange={() => setCampaign(c => ({...c, Options: {...c.Options, DeliveryOptimization: 'ToEngagedFirst', EnableSendTimeOptimization: false}}))} />
                                <span className="radio-checkmark"></span>
                                <span className="radio-label">{t('sendToEngagedFirst')}</span>
                                <p className="radio-description">{t('sendToEngagedFirstDesc')}</p>
                            </label>
                            <label className="custom-radio">
                                <input type="radio" name="dto" value="OptimalTime"
                                       checked={campaign.Options.EnableSendTimeOptimization === true}
                                       onChange={() => setCampaign(c => ({...c, Options: {...c.Options, DeliveryOptimization: 'None', EnableSendTimeOptimization: true}}))} />
                                <span className="radio-checkmark"></span>
                                <span className="radio-label">{t('sendAtOptimalTime')}</span>
                                <p className="radio-description">{t('sendAtOptimalTimeDesc')}</p>
                            </label>
                        </div>
                    )}

                    <h4>{t('tracking')}</h4>
                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <label className="custom-checkbox"><input type="checkbox" checked={campaign.Options.TrackOpens} onChange={e => handleValueChange('Options', 'TrackOpens', e.target.checked)} /><span className="checkbox-checkmark"></span><span className="checkbox-label">{t('trackOpens')}</span></label>
                        <label className="custom-checkbox"><input type="checkbox" checked={campaign.Options.TrackClicks} onChange={e => handleValueChange('Options', 'TrackClicks', e.target.checked)} /><span className="checkbox-checkmark"></span><span className="checkbox-label">{t('trackClicks')}</span></label>
                        <label className="custom-checkbox">
                            <input type="checkbox" checked={isUtmEnabled} onChange={e => setIsUtmEnabled(e.target.checked)} />
                            <span className="checkbox-checkmark"></span>
                            <span className="checkbox-label">{t('googleAnalytics')}</span>
                        </label>
                    </div>
                    {isUtmEnabled && (
                        <div className="utm-fields-container">
                            <p>{t('utmDescription')}</p>
                            <div className="form-grid">
                                <div className="form-group"><label>UTM_Source</label><input type="text" value={currentContent.Utm?.Source || ''} onChange={e => handleUtmFieldChange('Source', e.target.value, activeContent)} /></div>
                                <div className="form-group"><label>UTM_Medium</label><input type="text" value={currentContent.Utm?.Medium || ''} onChange={e => handleUtmFieldChange('Medium', e.target.value, activeContent)} /></div>
                                <div className="form-group"><label>UTM_Campaign</label><input type="text" value={currentContent.Utm?.Campaign || ''} onChange={e => handleUtmFieldChange('Campaign', e.target.value, activeContent)} /></div>
                                <div className="form-group"><label>UTM_Content</label><input type="text" value={currentContent.Utm?.Content || ''} onChange={e => handleUtmFieldChange('Content', e.target.value, activeContent)} /></div>
                            </div>
                        </div>
                    )}
                </AccordionItem>
            </div>

            <div className="campaign-form-footer">
                <button type="button" className="btn" onClick={() => handleSubmit('draft')} disabled={isSending}>{t('saveAsDraft')}</button>
                {!isScheduling ? (
                    <div style={{display: 'flex', gap: '1rem'}}>
                         <button type="button" className="btn btn-secondary" onClick={() => setIsScheduling(true)} disabled={isSending || verifiedDomainsWithDefault.length === 0}>{t('schedule')}</button>
                         <button type="button" className="btn btn-primary" onClick={() => handleSubmit('send')} disabled={isSending || verifiedDomainsWithDefault.length === 0}>{isSending ? <Loader/> : t('sendNow')}</button>
                    </div>
                ) : (
                    <div className="schedule-controls">
                        <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} required />
                        <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} required />
                        <button type="button" className="btn" onClick={() => setIsScheduling(false)} disabled={isSending}>{t('cancel')}</button>
                        <button type="button" className="btn btn-primary" onClick={() => handleSubmit('schedule')} disabled={isSending || !campaign.Options.ScheduleFor || verifiedDomainsWithDefault.length === 0}>{isSending ? <Loader/> : t('confirm')}</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SendEmailView;

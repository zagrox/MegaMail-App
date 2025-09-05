
import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import useApiV4 from '../hooks/useApiV4';
import { apiFetchV4 } from '../api/elasticEmail';
import { formatDateForDisplay } from '../utils/helpers';
import CenteredMessage from '../components/CenteredMessage';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import { useToast } from '../contexts/ToastContext';
import Modal from '../components/Modal';
import Icon, { ICONS } from '../components/Icon';
import ConfirmModal from '../components/ConfirmModal';
import { Template } from '../api/types';
import Button from '../components/Button';

// Helper to decode a Base64 string to UTF-8
const decodeState = (base64: string): string => {
    const binary_string = window.atob(base64);
    const bytes = new Uint8Array(binary_string.length);
    for (let i = 0; i < binary_string.length; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
};

// Helper function to extract state from template HTML
const extractStateFromHtml = (htmlContent: string) => {
    if (!htmlContent) return null;
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        const stateContainer = doc.getElementById('mailzila-template-state');
        const base64State = stateContainer?.getAttribute('data-state');
        if (base64State) {
            const jsonState = decodeState(base64State);
            return JSON.parse(jsonState);
        }
    } catch (e) {
        console.error("Failed to parse template state from HTML.", e);
    }
    return null;
};


const TemplatePreviewModal = ({ isOpen, onClose, template }: { isOpen: boolean; onClose: () => void; template: Template | null }) => {
    const { t } = useTranslation(['templates', 'common']);
    const htmlContent = template?.Body?.[0]?.Content || '';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={template?.Name || t('previewTemplate')} size="fullscreen" bodyClassName="modal-body--no-padding">
            <iframe srcDoc={htmlContent} className="preview-iframe" title={t('previewTemplate')} />
        </Modal>
    );
};

const TemplateCard = ({ template, onPreview, onUse, onDelete, isLoadingDetails }: { 
    template: Template & { fromName?: string }; 
    onPreview: () => void; 
    onUse: () => void; 
    onDelete: () => void;
    isLoadingDetails?: boolean;
}) => {
    const { t, i18n } = useTranslation(['templates', 'common', 'sendEmail', 'contacts']);
    return (
        <div className="card campaign-card">
            <div className="campaign-card-header">
                <h3>{template.Name}</h3>
            </div>
            <div className="campaign-card-body">
                <p>
                    <strong>{t('subject', { ns: 'sendEmail' })}:</strong> {template.Subject || t('noSubject', { ns: 'campaigns' })}
                </p>
                {template.fromName && (
                    <p>
                        <strong>{t('fromName', { ns: 'sendEmail' })}:</strong> {template.fromName}
                    </p>
                )}
                <p className="contact-card-email" style={{marginTop: 'auto'}}>
                    {t('dateAdded', { ns: 'common' })}: {formatDateForDisplay(template.DateAdded, i18n.language)}
                </p>
            </div>
            <div className="campaign-card-footer" style={{ gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={onPreview} disabled={isLoadingDetails}>
                    {isLoadingDetails ? <Loader /> : <><Icon>{ICONS.EYE}</Icon> {t('previewTemplate')}</>}
                </button>
                <button className="btn" onClick={onUse} disabled={isLoadingDetails}>
                    {isLoadingDetails ? <Loader /> : <><Icon>{ICONS.SEND_EMAIL}</Icon> {t('useTemplate')}</>}
                </button>
                <button className="btn-icon btn-icon-danger" onClick={onDelete} disabled={isLoadingDetails}>
                    <Icon>{ICONS.DELETE}</Icon>
                </button>
            </div>
        </div>
    );
};

const TemplatesView = ({ apiKey, setView }: { apiKey: string; setView: (view: string, data?: { template: Template }) => void }) => {
    const { t } = useTranslation(['templates', 'common']);
    const { addToast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [refetchIndex, setRefetchIndex] = useState(0);
    const [templateToPreview, setTemplateToPreview] = useState<Template | null>(null);
    const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);
    const [offset, setOffset] = useState(0);
    const TEMPLATES_PER_PAGE = 12;
    const [loadingTemplateName, setLoadingTemplateName] = useState<string | null>(null);
    const [detailedTemplates, setDetailedTemplates] = useState<(Template & { fromName?: string })[]>([]);

    const { data: templatesFromApi, loading, error } = useApiV4(
        '/templates',
        apiKey,
        {
            scopeType: 'Personal',
            templateTypes: 'RawHTML',
            limit: TEMPLATES_PER_PAGE,
            offset,
            search: searchQuery
        },
        refetchIndex
    );
    
    useEffect(() => {
        if (templatesFromApi && Array.isArray(templatesFromApi)) {
            // Immediately set basic data to show something on screen while details load
            setDetailedTemplates(templatesFromApi);

            const fetchDetails = async () => {
                const templatesWithDetails = await Promise.all(
                    templatesFromApi.map(async (template: Template) => {
                        try {
                            const fullTemplate = await apiFetchV4(`/templates/${encodeURIComponent(template.Name)}`, apiKey);
                            const htmlContent = fullTemplate.Body?.[0]?.Content;
                            const state = extractStateFromHtml(htmlContent);
                            return { ...template, fromName: state?.fromName };
                        } catch (e) {
                            console.warn(`Could not fetch details for template ${template.Name}`, e);
                            return template; // return original template on error
                        }
                    })
                );
                setDetailedTemplates(templatesWithDetails);
            };
            fetchDetails();
        } else {
            setDetailedTemplates([]);
        }
    }, [templatesFromApi, apiKey]);


    const refetch = () => setRefetchIndex(i => i + 1);

    const confirmDeleteTemplate = async () => {
        if (!templateToDelete) return;
        const templateName = templateToDelete.Name;
        try {
            await apiFetchV4(`/templates/${encodeURIComponent(templateName)}`, apiKey, { method: 'DELETE' });
            addToast(t('templateDeletedSuccess', { name: templateName }), 'success');
            refetch();
        } catch (err: any) {
            addToast(t('templateDeletedError', { error: err.message }), 'error');
        } finally {
            setTemplateToDelete(null);
        }
    };

    const fetchFullTemplateAndAct = async (templateName: string, action: (fullTemplate: Template) => void) => {
        setLoadingTemplateName(templateName);
        try {
            const fullTemplate = await apiFetchV4(`/templates/${encodeURIComponent(templateName)}`, apiKey);
            if (fullTemplate) {
                action(fullTemplate);
            } else {
                throw new Error("Template not found or empty response.");
            }
        } catch (err: any) {
            addToast(t('contactDetailsError', { ns: 'contacts'}), 'error'); // Using a generic error
        } finally {
            setLoadingTemplateName(null);
        }
    };

    const handlePreview = (template: Template) => {
        fetchFullTemplateAndAct(template.Name, (fullTemplate) => {
            setTemplateToPreview(fullTemplate);
        });
    };

    const handleUse = (template: Template) => {
        fetchFullTemplateAndAct(template.Name, (fullTemplate) => {
            setView('Email Builder', { template: fullTemplate });
        });
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
        setOffset(0);
    };

    return (
        <div>
            <TemplatePreviewModal isOpen={!!templateToPreview} onClose={() => setTemplateToPreview(null)} template={templateToPreview} />
            <ConfirmModal
                isOpen={!!templateToDelete}
                onClose={() => setTemplateToDelete(null)}
                onConfirm={confirmDeleteTemplate}
                title={t('deleteTemplate')}
                confirmText={t('delete')}
                isDestructive
            >
                <p>{t('confirmDeleteTemplate', { name: templateToDelete?.Name })}</p>
            </ConfirmModal>

            <div className="view-header">
                <div className="search-bar" style={{ flexGrow: 1 }}>
                    <Icon>{ICONS.SEARCH}</Icon>
                    <input
                        type="search"
                        placeholder={t('searchTemplatesPlaceholder')}
                        value={searchQuery}
                        onChange={handleSearchChange}
                        disabled={loading}
                    />
                </div>
                <div className="header-actions">
                    <Button className="btn-primary" onClick={() => setView('Email Builder')} action="create_template">
                        <Icon>{ICONS.PLUS}</Icon> {t('createTemplate')}
                    </Button>
                </div>
            </div>

            {loading && detailedTemplates.length === 0 && <CenteredMessage><Loader /></CenteredMessage>}
            {error && <ErrorMessage error={error} />}
            
            {!loading && !error && (
                (detailedTemplates.length === 0) ? (
                    <CenteredMessage style={{ height: '50vh' }}>
                        <div className="info-message">
                            <strong>{searchQuery ? t('noTemplatesForQuery', { query: searchQuery }) : t('noTemplatesFound')}</strong>
                            {!searchQuery && <p>{t('createTemplate')}</p>}
                        </div>
                    </CenteredMessage>
                ) : (
                    <>
                        <div className="campaign-grid">
                            {detailedTemplates.map((template: Template & { fromName?: string }) => (
                                <TemplateCard
                                    key={template.Name}
                                    template={template}
                                    onPreview={() => handlePreview(template)}
                                    onUse={() => handleUse(template)}
                                    onDelete={() => setTemplateToDelete(template)}
                                    isLoadingDetails={loadingTemplateName === template.Name}
                                />
                            ))}
                        </div>

                         {( (templatesFromApi && templatesFromApi.length > 0) || offset > 0) && (
                            <div className="pagination-controls">
                                <button onClick={() => setOffset(o => Math.max(0, o - TEMPLATES_PER_PAGE))} disabled={offset === 0 || loading}>
                                    <Icon>{ICONS.CHEVRON_LEFT}</Icon>
                                    <span>{t('previous')}</span>
                                </button>
                                <span className="pagination-page-info">{t('page', { page: offset / TEMPLATES_PER_PAGE + 1 })}</span>
                                <button onClick={() => setOffset(o => o + TEMPLATES_PER_PAGE)} disabled={!templatesFromApi || templatesFromApi.length < TEMPLATES_PER_PAGE || loading}>
                                    <span>{t('next')}</span>
                                    <Icon>{ICONS.CHEVRON_RIGHT}</Icon>
                                </button>
                            </div>
                        )}
                    </>
                )
            )}
        </div>
    );
};

export default TemplatesView;

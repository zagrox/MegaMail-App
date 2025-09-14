import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PublicTemplate, Template } from '../api/types';
import { useConfiguration } from '../contexts/ConfigurationContext';
import CenteredMessage from '../components/CenteredMessage';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import Icon, { ICONS } from '../components/Icon';
import { useToast } from '../contexts/ToastContext';
import EmptyState from '../components/EmptyState';

const GalleryTemplateCard = ({ template, onSelect }: { template: PublicTemplate & { htmlContent?: string }, onSelect: () => void }) => {
    const { t } = useTranslation(['common', 'templates']);
    const { config } = useConfiguration();
    const [isLoading, setIsLoading] = useState(true);

    const imageUrl = template.template_image && config?.app_backend
        ? `${config.app_backend}/assets/${template.template_image}`
        : null;

    return (
        <div className="card gallery-template-card">
            <div className="gallery-card-preview-wrapper" onClick={onSelect}>
                {imageUrl ? (
                    <img 
                        src={imageUrl} 
                        alt={template.template_name} 
                        className="gallery-card-preview-image"
                        onLoad={() => setIsLoading(false)}
                        style={{ display: isLoading ? 'none' : 'block' }}
                    />
                ) : (
                    <iframe
                        srcDoc={template.htmlContent || ''}
                        title={template.template_name}
                        sandbox="allow-scripts"
                        scrolling="no"
                        onLoad={() => setIsLoading(false)}
                        style={{ display: isLoading ? 'none' : 'block' }}
                    />
                )}
                 {isLoading && (
                    <div className="gallery-card-loader">
                        <Loader />
                    </div>
                )}
            </div>
            <div className="gallery-card-content">
                <h3>{template.template_name}</h3>
            </div>
            <div className="gallery-card-actions">
                <button className="btn btn-primary" onClick={onSelect}>
                    <Icon>{ICONS.LAYERS}</Icon> {t('useThisTemplate')}
                </button>
            </div>
        </div>
    );
};


const GalleryView = ({ setView }: { setView: (view: string, data?: any) => void }) => {
    const { t } = useTranslation(['common', 'templates']);
    const [templates, setTemplates] = useState<(PublicTemplate & { htmlContent?: string })[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<any>(null);
    const [loadingTemplate, setLoadingTemplate] = useState<number | null>(null);
    const { config } = useConfiguration();
    const { addToast } = useToast();

    useEffect(() => {
        const fetchTemplates = async () => {
            if (!config?.app_backend) {
                setError({ message: 'Backend URL not configured.', endpoint: 'Configuration' });
                setLoading(false);
                return;
            }
            setLoading(true);
            setError(null);
            try {
                const url = new URL(`${config.app_backend}/items/templates`);
                url.searchParams.append('filter[status][_eq]', 'published');
                url.searchParams.append('fields', 'id,template_name,template_type,template_html,template_image');

                const response = await fetch(url.toString());

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ message: `HTTP Error: ${response.status}` }));
                    const errorMessage = errorData?.errors?.[0]?.message || errorData.message || `Request failed with status ${response.status}`;
                    throw new Error(errorMessage);
                }
                
                const result = await response.json();
                const responseData = result.data;

                if (!Array.isArray(responseData)) {
                    throw new Error('Invalid data format received from the server.');
                }
                
                // Pre-fetch HTML for iframe previews if no image is available
                const templatesWithPreviewData = await Promise.all(responseData.map(async (template: PublicTemplate) => {
                    if (template.template_image || !template.template_html) {
                        return template;
                    }
                    try {
                        const htmlUrl = `${config.app_backend}/assets/${template.template_html}`;
                        const htmlResponse = await fetch(htmlUrl);
                        if (!htmlResponse.ok) return template; // Don't crash if one file is missing
                        const htmlContent = await htmlResponse.text();
                        return { ...template, htmlContent };
                    } catch (e) {
                        console.warn(`Could not fetch HTML for template ${template.template_name}`, e);
                        return template; // Return template without htmlContent if fetch fails
                    }
                }));

                setTemplates(templatesWithPreviewData as (PublicTemplate & { htmlContent?: string })[]);
            } catch (err: any) {
                const errorMessage = err.message || 'An unknown error occurred.';
                setError({ message: errorMessage, endpoint: 'GET /items/templates' });
            } finally {
                setLoading(false);
            }
        };

        if (config) {
            fetchTemplates();
        }
    }, [config]);

    const handleSelectTemplate = async (template: PublicTemplate) => {
        if (!config?.app_backend) {
            addToast('Backend not configured', 'error');
            return;
        }
        if (!template.template_html) {
            addToast('Template has no HTML content to load.', 'error');
            return;
        }
        setLoadingTemplate(template.id);
        addToast(t('loadingTemplate'), 'info');

        try {
            const htmlUrl = `${config.app_backend}/assets/${template.template_html}`;
            const response = await fetch(htmlUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch template HTML (${response.status})`);
            }
            const htmlContent = await response.text();

            const newTemplate: Template = {
                Name: `${t('copy')} of ${template.template_name}`,
                Subject: '',
                Body: [{ Content: htmlContent }],
                DateAdded: new Date().toISOString()
            };

            setView('Email Builder', { template: newTemplate });

        } catch (err: any) {
            addToast(err.message, 'error');
            setLoadingTemplate(null);
        }
    };
    
    return (
        <div className="gallery-view">
             {loadingTemplate && (
                <div className="page-overlay">
                    <Loader />
                </div>
            )}
            <div className="view-header">
                <h2>{t('gallery')}</h2>
            </div>
            {loading && <CenteredMessage><Loader /></CenteredMessage>}
            {error && <ErrorMessage error={error} />}

            {!loading && !error && (
                templates.length === 0 ? (
                     <EmptyState
                        icon={ICONS.BOX}
                        title={t('noGalleryTemplates')}
                        message={t('noGalleryTemplatesDesc')}
                    />
                ) : (
                    <div className="gallery-grid">
                        {templates.map((template) => (
                            <GalleryTemplateCard
                                key={template.id}
                                template={template}
                                onSelect={() => handleSelectTemplate(template)}
                            />
                        ))}
                    </div>
                )
            )}
        </div>
    );
};

export default GalleryView;
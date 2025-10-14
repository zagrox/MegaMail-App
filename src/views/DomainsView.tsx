import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import useApiV4 from '../hooks/useApiV4';
import { apiFetchV4 } from '../api/elasticEmail';
import CenteredMessage from '../components/CenteredMessage';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import { useToast } from '../contexts/ToastContext';
import Icon, { ICONS } from '../components/Icon';
import Badge from '../components/Badge';
import ConfirmModal from '../components/ConfirmModal';
import { useStatusStyles } from '../hooks/useStatusStyles';
import Modal from '../components/Modal';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import SetDefaultSenderModal from './domains/SetDefaultSenderModal';

const GuideStep = ({ step, title, desc }: { step: number, title: string, desc: string }) => (
    <div className="step-item">
        <div className="step-number">{step}</div>
        <div className="step-content">
            <h4>{title}</h4>
            <p dangerouslySetInnerHTML={{ __html: desc }} />
        </div>
    </div>
);

const HowToModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
    const { t } = useTranslation('guides');
    const title = t('guideDomainTitle');
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="step-by-step-list">
                <GuideStep step={1} title={t('guideDomainStep1Title')} desc={t('guideDomainStep1Desc')} />
                <GuideStep step={2} title={t('guideDomainStep2Title')} desc={t('guideDomainStep2Desc')} />
                <GuideStep step={3} title={t('guideDomainStep3Title')} desc={t('guideDomainStep3Desc')} />
                <GuideStep step={4} title={t('guideDomainStep4Title')} desc={t('guideDomainStep4Desc')} />
            </div>
        </Modal>
    );
};

const DomainsView = ({ apiKey, setView }: { apiKey: string, setView: (view: string, data?: any) => void }) => {
    const { t, i18n } = useTranslation(['domains', 'common']);
    const { addToast } = useToast();
    const [refetchIndex, setRefetchIndex] = useState(0);
    const [newDomain, setNewDomain] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [domainToDelete, setDomainToDelete] = useState<string | null>(null);
    const [domainToEdit, setDomainToEdit] = useState<any | null>(null);
    const [isAddingDomain, setIsAddingDomain] = useState(false);
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
    const newDomainInputRef = useRef<HTMLInputElement>(null);

    const { getStatusStyle } = useStatusStyles();

    const { data, loading, error } = useApiV4('/domains', apiKey, {}, refetchIndex);
    const refetch = () => {
        setRefetchIndex(i => i + 1);
    }

    const handleNewDomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
            .trim()
            .replace(/^(https?:\/\/)?(www\.)?/i, '')
            .split('/')[0];
        setNewDomain(value);
    };

    const handleAddDomain = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDomain) return;
        setIsSubmitting(true);
        try {
            await apiFetchV4('/domains', apiKey, { method: 'POST', body: { Domain: newDomain } });
            addToast(t('domainAddedSuccess', { domain: newDomain }), 'success');
            setNewDomain('');
            setIsAddingDomain(false);
            refetch();
        } catch (err: any) {
            addToast(t('domainAddedError', { error: err.message }), 'error');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const confirmDeleteDomain = async () => {
        if (!domainToDelete) return;
        try {
            await apiFetchV4(`/domains/${encodeURIComponent(domainToDelete)}`, apiKey, { method: 'DELETE' });
            addToast(t('domainDeletedSuccess', { domainName: domainToDelete }), 'success');
            refetch();
        } catch (err: any) {
            addToast(t('domainDeletedError', { error: err.message }), 'error');
        } finally {
            setDomainToDelete(null);
        }
    };
    
    const domainsList = Array.isArray(data) ? data : (data && Array.isArray(data.Data)) ? data.Data : [];
    const isNotFoundError = error && (error.message.includes('Not Found') || error.message.includes('not found'));
    const showNoDomainsMessage = !loading && !error && domainsList.length === 0;

    return (
        <div className="domains-view-container">
            <ConfirmModal
                isOpen={!!domainToDelete}
                onClose={() => setDomainToDelete(null)}
                onConfirm={confirmDeleteDomain}
                title={t('deleteDomain', { domainName: domainToDelete })}
            >
                <p>{t('confirmDeleteDomain', { domainName: domainToDelete })}</p>
            </ConfirmModal>
            {domainToEdit && (
                <SetDefaultSenderModal
                    isOpen={!!domainToEdit}
                    onClose={() => setDomainToEdit(null)}
                    domain={domainToEdit}
                    apiKey={apiKey}
                    onSuccess={() => {
                        setDomainToEdit(null);
                        refetch();
                    }}
                />
            )}
            <HowToModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} />

            <div className="domains-description-header">
                <h2>{t('sendingDomains', {ns: 'domains'})}</h2>
                <p>{t('sendingDomainsDesc', {ns: 'domains'})}</p>
            </div>

            {loading && <CenteredMessage><Loader /></CenteredMessage>}
            {error && !isNotFoundError && <ErrorMessage error={error} />}
            
            {!loading && !error && domainsList.length > 0 && 
            <div className="table-container">
                <table className="simple-table">
                    <thead>
                        <tr>
                            <th>{t('domains')}</th>
                            <th>{t('fromEmail')}</th>
                            <th>{t('status')}</th>
                            <th style={{ width: '1%', whiteSpace: 'nowrap', textAlign: i18n.dir() === 'rtl' ? 'left' : 'right' }}>{t('action')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {domainsList.map((domain: any) => {
                             const domainName = domain.Domain || domain.domain;
                             if (!domainName) return null;

                             const defaultSender = domain.DefaultSender || domain.defaultsender;
                             
                             const getVerificationStyle = (isVerified: boolean) => isVerified ? getStatusStyle('Verified') : getStatusStyle('Missing');
                             
                             const isSpfVerified = String(domain.Spf || domain.spf).toLowerCase() === 'true';
                             const isDkimVerified = String(domain.Dkim || domain.dkim).toLowerCase() === 'true';
                             const isMxVerified = String(domain.MX || domain.mx).toLowerCase() === 'true';
                             const trackingStatus = domain.TrackingStatus || domain.trackingstatus;
                             const isTrackingVerified = String(trackingStatus).toLowerCase() === 'validated';
                             
                             return (
                                <React.Fragment key={domainName}>
                                <tr>
                                    <td><strong>{domainName}</strong></td>
                                    <td>
                                        <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                                            <span>{defaultSender || t('notSet')}</span>
                                            <button className="btn-icon" onClick={() => setDomainToEdit(domain)}><Icon>{ICONS.PENCIL}</Icon></button>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="domain-status-pills">
                                            <Badge text="SPF" type={getVerificationStyle(isSpfVerified).type} />
                                            <Badge text="DKIM" type={getVerificationStyle(isDkimVerified).type} />
                                            <Badge text="Tracking" type={getVerificationStyle(isTrackingVerified).type} />
                                            <Badge text="MX" type={getVerificationStyle(isMxVerified).type} />
                                        </div>
                                    </td>
                                    <td>
                                        <div className="action-buttons" style={{ justifyContent: 'flex-end' }}>
                                            <Button 
                                                className="btn-secondary" 
                                                onClick={() => setView('DomainVerification', { domain: domainName })}
                                            >
                                                <Icon>{ICONS.VERIFY}</Icon>
                                                <span>{t('verify')}</span>
                                            </Button>
                                            <Button 
                                                className="btn-icon-danger" 
                                                onClick={() => setDomainToDelete(domainName)} 
                                                aria-label={t('deleteDomain', { domainName })}
                                            >
                                                <Icon>{ICONS.DELETE}</Icon>
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                                </React.Fragment>
                             )
                        })}
                    </tbody>
                </table>
            </div>}
            
            <div className="add-domain-section">
                {isAddingDomain ? (
                    <form className="add-domain-form" onSubmit={handleAddDomain}>
                        <input
                            ref={newDomainInputRef}
                            type="text"
                            placeholder="example.com"
                            value={newDomain}
                            onChange={handleNewDomainChange}
                            disabled={isSubmitting}
                            autoFocus
                        />
                        <Button type="submit" className="btn-primary" disabled={!newDomain || isSubmitting} action="add_domain">
                            {isSubmitting ? <Loader /> : <>{t('addDomain')}</>}
                        </Button>
                    </form>
                ) : (
                    <Button className="btn-primary" onClick={() => setIsAddingDomain(true)} action="add_domain" style={{ padding: '0.75rem 2rem' }}>
                        <Icon>{ICONS.PLUS}</Icon> {t('newDomainButton', {ns: 'domains'})}
                    </Button>
                )}
                <button className="link-button" onClick={() => setIsHelpModalOpen(true)}>{t('howToAddDomainLink', {ns: 'domains'})}</button>
            </div>

        </div>
    );
};

export default DomainsView;
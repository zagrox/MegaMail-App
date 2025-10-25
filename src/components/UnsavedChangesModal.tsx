
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';
import Loader from './Loader';
import Button from './Button';

interface UnsavedChangesModalProps {
    isOpen: boolean;
    onCancel: () => void;
    onLeave: () => void;
    onSaveAndLeave: () => Promise<void>;
}

const UnsavedChangesModal = ({
    isOpen,
    onCancel,
    onLeave,
    onSaveAndLeave,
}: UnsavedChangesModalProps) => {
    const { t } = useTranslation('emailBuilder');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        await onSaveAndLeave();
        setIsSaving(false);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onCancel}
            title={t('unsavedChangesTitle')}
        >
            <div className="modal-form">
                <p style={{ marginBottom: '2rem' }}>{t('unsavedChangesMessage')}</p>
                <div className="form-actions" style={{ justifyContent: 'space-between' }}>
                    <Button type="button" className="btn-danger" onClick={onLeave}>
                        {t('leave')}
                    </Button>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <Button type="button" className="btn" onClick={onCancel} disabled={isSaving}>
                            {t('cancel', { ns: 'common' })}
                        </Button>
                        <Button type="button" className="btn-primary" onClick={handleSave} disabled={isSaving}>
                            {isSaving ? <Loader /> : t('saveAndClose')}
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default UnsavedChangesModal;

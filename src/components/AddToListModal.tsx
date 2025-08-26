import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import useApiV4 from '../hooks/useApiV4';
import { List } from '../api/types';
import Modal from './Modal';
import Loader from './Loader';

interface AddToListModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (listName: string) => Promise<void>;
    apiKey: string;
}

const AddToListModal: React.FC<AddToListModalProps> = ({ isOpen, onClose, onConfirm, apiKey }) => {
    const { t } = useTranslation();
    const { data: lists, loading: listsLoading } = useApiV4('/lists', apiKey, {}, isOpen ? 1 : 0);
    const [selectedList, setSelectedList] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    React.useEffect(() => {
        if (lists && lists.length > 0 && !selectedList) {
            setSelectedList(lists[0].ListName);
        }
    }, [lists, selectedList]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedList) return;
        setIsSubmitting(true);
        await onConfirm(selectedList);
        setIsSubmitting(false);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('addToListOptional')}>
            <form onSubmit={handleSubmit} className="modal-form">
                <div className="form-group">
                    <label htmlFor="list-select">{t('selectList')}</label>
                    {listsLoading ? <Loader /> : (
                        <select
                            id="list-select"
                            value={selectedList}
                            onChange={(e) => setSelectedList(e.target.value)}
                            disabled={!lists || lists.length === 0}
                        >
                            {lists && lists.map((list: List) => (
                                <option key={list.ListName} value={list.ListName}>{list.ListName}</option>
                            ))}
                        </select>
                    )}
                    {(!listsLoading && (!lists || lists.length === 0)) && <p>{t('noListsFound')}</p>}
                </div>

                <div className="form-actions" style={{ marginTop: '1.5rem' }}>
                    <button type="button" className="btn" onClick={onClose} disabled={isSubmitting}>{t('cancel')}</button>
                    <button type="submit" className="btn btn-primary" disabled={isSubmitting || !selectedList || listsLoading}>
                        {isSubmitting ? <Loader /> : t('add')}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default AddToListModal;

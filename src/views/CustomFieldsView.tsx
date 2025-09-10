import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import useApiV4 from '../hooks/useApiV4';
import { CustomField } from '../api/types';
import CenteredMessage from '../components/CenteredMessage';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import Icon, { ICONS } from '../components/Icon';
import { formatDateRelative } from '../utils/helpers';
import Button from '../components/Button';

const CustomFieldsView = ({ apiKey, setView }: { apiKey: string; setView: (view: string) => void; }) => {
    const { t, i18n } = useTranslation(['customFields', 'common']);
    const [refetchIndex, setRefetchIndex] = useState(0);
    const { data: contactsData, loading, error } = useApiV4('/contacts', apiKey, { limit: 250 }, refetchIndex);
    
    const fieldsList: CustomField[] = useMemo(() => {
        if (!Array.isArray(contactsData)) return [];
        const discoveredFields = new Map<string, CustomField>();
        contactsData.forEach(contact => {
            if (contact.CustomFields) {
                Object.keys(contact.CustomFields).forEach(key => {
                    if (!discoveredFields.has(key)) {
                        const value = contact.CustomFields[key];
                        let dataType: CustomField['DataType'] = 'String';
                        if (typeof value === 'number') dataType = 'Number';
                        else if (typeof value === 'boolean') dataType = 'Boolean';
                        
                        discoveredFields.set(key, {
                            Name: key,
                            DataType: dataType
                        });
                    }
                });
            }
        });
        return Array.from(discoveredFields.values());
    }, [contactsData]);

    return (
        <div>
             <div className="view-header">
                <div style={{ flexGrow: 1 }}>
                    <h2>{t('manageCustomFields')}</h2>
                    <p className="view-subtitle">{t('discoveredFieldsDesc')}</p>
                </div>
            </div>

            {loading && <CenteredMessage><Loader /></CenteredMessage>}
            {error && <ErrorMessage error={error} />}
            
            {!loading && !error && (
                fieldsList.length === 0 ? (
                    <CenteredMessage>
                        <div className="info-message">
                            <strong>{t('noCustomFields')}</strong>
                            <p>{t('noCustomFieldsDesc')}</p>
                        </div>
                    </CenteredMessage>
                ) : (
                    <div className="table-container">
                        <table className="simple-table">
                            <thead>
                                <tr>
                                    <th>{t('fieldName')}</th>
                                    <th>{t('fieldType')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {fieldsList.map((field: CustomField) => (
                                    <tr key={field.Name}>
                                        <td><strong>{field.Name}</strong></td>
                                        <td>{t(field.DataType.toLowerCase())}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            )}
        </div>
    );
};

export default CustomFieldsView;
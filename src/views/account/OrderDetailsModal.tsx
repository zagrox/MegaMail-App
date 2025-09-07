import React from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../../components/Modal';
import { formatDateForDisplay } from '../../utils/helpers';
import Badge from '../../components/Badge';
import Icon, { ICONS } from '../../components/Icon';
import { useOrderStatuses } from '../../hooks/useOrderStatuses';
import { useStatusStyles } from '../../hooks/useStatusStyles';

const OrderDetailsModal = ({ isOpen, onClose, order, onContinueOrder, onGoToOfflineForm }: { isOpen: boolean, onClose: () => void, order: any, onContinueOrder?: (order: any) => void, onGoToOfflineForm?: (order: any) => void }) => {
    const { t, i18n } = useTranslation(['orders', 'buyCredits', 'common']);
    const { statusesMap, loading: statusesLoading } = useOrderStatuses();
    const { getStatusStyle } = useStatusStyles();
    
    const valueCellStyle: React.CSSProperties = { textAlign: i18n.dir() === 'rtl' ? 'left' : 'right' };

    const showPayButton = ['pending', 'failed'].includes(order.order_status);
    const lastTransaction = order.transactions?.length > 0 ? order.transactions[order.transactions.length - 1] : null;
    const paymentUrl = lastTransaction ? `https://gateway.zibal.ir/start/${lastTransaction.trackid}` : '#';

    const orderStatus = order.order_status;
    const statusInfo = !statusesLoading ? statusesMap[orderStatus] : null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`${t('orderDetails')}`}>
            <div className="table-container-simple" style={{ marginBottom: '1.5rem' }}>
                <table className="simple-table">
                    <tbody>
                        <tr><td>{t('orderId')}</td><td style={valueCellStyle}><strong>#{order.id}</strong></td></tr>
                        <tr><td>{t('date')}</td><td style={valueCellStyle}>{formatDateForDisplay(order.date_created, i18n.language)}</td></tr>
                        <tr><td>{t('description')}</td><td style={valueCellStyle}>{order.order_note}</td></tr>
                        <tr><td>{t('totalAmount')}</td><td style={valueCellStyle}><strong>{order.order_total.toLocaleString(i18n.language)} {t('buyCredits:priceIRT')}</strong></td></tr>
                        <tr>
                            <td>{t('status')}</td>
                            <td style={valueCellStyle}>
                                {statusInfo ? (
                                    <Badge text={statusInfo.text} color={statusInfo.color} iconPath={statusInfo.iconPath} />
                                ) : (
                                    (() => {
                                        const fallbackStyle = getStatusStyle(orderStatus);
                                        return <Badge text={fallbackStyle.text} type={fallbackStyle.type} iconPath={fallbackStyle.iconPath} />;
                                    })()
                                )}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="form-actions" style={{ justifyContent: 'space-between', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)', marginTop: '1.5rem' }}>
                <button className="btn" onClick={onClose}>{t('close')}</button>
                
                {showPayButton && onContinueOrder && (
                    <button className="btn btn-primary" onClick={() => onContinueOrder(order)}>
                        <Icon>{ICONS.LOCK_OPEN}</Icon>
                        <span>{t('continueOrder')}</span>
                    </button>
                )}
                {order.order_status === 'processing' && onGoToOfflineForm && (
                    <button className="btn btn-primary" onClick={() => onGoToOfflineForm(order)}>
                        <Icon>{ICONS.PENCIL}</Icon>
                        <span>{t('submitBankInfo', { ns: 'buyCredits' })}</span>
                    </button>
                )}
            </div>
        </Modal>
    );
};

export default OrderDetailsModal;


import React, { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import Icon, { ICONS } from '../Icon';
import Loader from '../Loader';
import Button from '../Button';
import { AppActions } from '../../config/actions';

interface WizardLayoutProps {
    title: string;
    children: ReactNode;
    onNext?: () => void;
    onBack: () => void;
    backButtonText?: string;
    nextDisabled?: boolean;
    isLastStep?: boolean;
    isSubmitting?: boolean;
    nextAction?: string;
}

const WizardLayout = ({
    title,
    children,
    onNext,
    onBack,
    backButtonText,
    nextDisabled = false,
    isLastStep = false,
    isSubmitting = false,
    nextAction = AppActions.WIZARD_NEXT_STEP,
}: WizardLayoutProps) => {
    const { t, i18n } = useTranslation(['send-wizard', 'common', 'sendEmail']);
    const isRTL = i18n.dir() === 'rtl';

    return (
        <div className="wizard-content-card">
            <div className="wizard-card-header">
                <h2>{title}</h2>
            </div>
            <div className="wizard-card-body">
                {children}
            </div>
            <div className="wizard-card-footer">
                <button
                    className="btn btn-secondary"
                    onClick={onBack}
                    disabled={isSubmitting}
                >
                    {isRTL ? (
                        <>
                            <span>{backButtonText || t('back')}</span>
                            <Icon>{ICONS.CHEVRON_RIGHT}</Icon>
                        </>
                    ) : (
                        <>
                            <Icon>{ICONS.CHEVRON_LEFT}</Icon>
                            <span>{backButtonText || t('back')}</span>
                        </>
                    )}
                </button>
                {!isLastStep ? (
                    <Button
                        className="btn-primary"
                        onClick={onNext}
                        disabled={nextDisabled || isSubmitting}
                        action={nextAction}
                    >
                        {isRTL ? (
                            <>
                                <Icon>{ICONS.CHEVRON_LEFT}</Icon>
                                <span>{t('next')}</span>
                            </>
                        ) : (
                            <>
                                <span>{t('next')}</span>
                                <Icon>{ICONS.CHEVRON_RIGHT}</Icon>
                            </>
                        )}
                    </Button>
                ) : (
                    <Button
                        className="btn-primary"
                        onClick={onNext}
                        disabled={nextDisabled || isSubmitting}
                        action={nextAction}
                    >
                        {isSubmitting ? <Loader /> : (
                            <>
                                <Icon>{ICONS.SEND_EMAIL}</Icon>
                                <span>{t('submit', { ns: 'sendEmail' })}</span>
                            </>
                        )}
                    </Button>
                )}
            </div>
        </div>
    );
};

export default WizardLayout;

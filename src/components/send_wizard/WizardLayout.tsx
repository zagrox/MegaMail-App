
import React, { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import Icon, { ICONS } from '../Icon';
import Loader from '../Loader';
import Button from '../Button';
import { AppActions } from '../../config/actions';

interface WizardLayoutProps {
    step: number;
    title: string;
    children: ReactNode;
    onNext?: () => void;
    onBack: () => void;
    nextDisabled?: boolean;
    isLastStep?: boolean;
    isSubmitting?: boolean;
    nextAction?: string;
    hideBackButton?: boolean;
}

const WizardLayout = ({
    step,
    title,
    children,
    onNext,
    onBack,
    nextDisabled = false,
    isLastStep = false,
    isSubmitting = false,
    nextAction = AppActions.WIZARD_NEXT_STEP,
    hideBackButton = false,
}: WizardLayoutProps) => {
    const { t, i18n } = useTranslation(['send-wizard', 'common', 'sendEmail']);
    const isRTL = i18n.dir() === 'rtl';

    return (
        <div className="wizard-main">
            <div className="wizard-step-header active">
                {`${step}. ${title}`}
            </div>
            <div className="wizard-content-box">
                {children}
            </div>
            <div className="wizard-footer">
                {!hideBackButton && (
                    <button
                        className="btn btn-secondary"
                        onClick={onBack}
                        disabled={isSubmitting}
                    >
                        {isRTL ? (
                            <>
                                <span>{t('back')}</span>
                                <Icon>{ICONS.CHEVRON_RIGHT}</Icon>
                            </>
                        ) : (
                            <>
                                <Icon>{ICONS.CHEVRON_LEFT}</Icon>
                                <span>{t('back')}</span>
                            </>
                        )}
                    </button>
                )}
                {!isLastStep ? (
                    <Button
                        className="btn-primary"
                        onClick={onNext}
                        disabled={nextDisabled || isSubmitting}
                        action={nextAction}
                        style={{ marginLeft: hideBackButton ? 'auto' : undefined }}
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
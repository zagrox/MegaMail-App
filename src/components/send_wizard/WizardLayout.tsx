





import React, { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import Icon, { ICONS } from '../../components/Icon';
import Loader from '../../components/Loader';
import Button from '../../components/Button';
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
                            {/* FIX: Explicitly pass children to Icon component */}
                            <Icon>{ICONS.CHEVRON_RIGHT}</Icon>
                        </>
                    ) : (
                        <>
                            {/* FIX: Explicitly pass children to Icon component */}
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
                                {/* FIX: Explicitly pass children to Icon component */}
                                <Icon>{ICONS.CHEVRON_LEFT}</Icon>
                                <span>{t('next')}</span>
                            </>
                        ) : (
                            <>
                                <span>{t('next')}</span>
                                {/* FIX: Explicitly pass children to Icon component */}
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
                                {/* FIX: Explicitly pass children to Icon component */}
                                <Icon>{ICONS.VERIFY}</Icon>
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

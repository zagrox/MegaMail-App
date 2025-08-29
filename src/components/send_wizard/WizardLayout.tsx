import React, { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import Icon, { ICONS } from '../Icon';
import Loader from '../Loader';

interface WizardLayoutProps {
    step: number;
    title: string;
    children: ReactNode;
    onNext?: () => void;
    onBack: () => void;
    nextDisabled?: boolean;
    isLastStep?: boolean;
    isSubmitting?: boolean;
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
}: WizardLayoutProps) => {
    const { t } = useTranslation();

    const steps = [
        "Select Type", "Recipients", "Content", "Settings", "Sending"
    ];

    return (
        <div className="wizard-main">
            <div className="wizard-step-header active">
                {`${step}. ${title}`}
            </div>
            <div className="wizard-content-box">
                {children}
            </div>
            <div className="wizard-footer">
                <button
                    className="btn btn-secondary"
                    onClick={onBack}
                    disabled={isSubmitting}
                >
                    <Icon path={ICONS.CHEVRON_LEFT} />
                    <span>{t('back')}</span>
                </button>
                {!isLastStep ? (
                    <button
                        className="btn btn-primary"
                        onClick={onNext}
                        disabled={nextDisabled || isSubmitting}
                    >
                        <span>{t('next')}</span>
                        <Icon path={ICONS.CHEVRON_RIGHT} />
                    </button>
                ) : (
                    <button
                        className="btn btn-primary"
                        onClick={onNext} // In last step, onNext is the submit handler
                        disabled={nextDisabled || isSubmitting}
                    >
                        {isSubmitting ? <Loader /> : (
                            <>
                                <Icon path={ICONS.SEND_EMAIL} />
                                <span>{t('submit')}</span>
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
};

export default WizardLayout;

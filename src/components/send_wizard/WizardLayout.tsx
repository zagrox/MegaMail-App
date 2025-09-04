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
}: WizardLayoutProps) => {
    const { t } = useTranslation();

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
                    {/* FIX: Changed path prop to children for Icon component */}
                    <Icon>{ICONS.CHEVRON_LEFT}</Icon>
                    <span>{t('back')}</span>
                </button>
                {!isLastStep ? (
                    <Button
                        className="btn-primary"
                        onClick={onNext}
                        disabled={nextDisabled || isSubmitting}
                        action={nextAction}
                    >
                        <span>{t('next')}</span>
                        {/* FIX: Changed path prop to children for Icon component */}
                        <Icon>{ICONS.CHEVRON_RIGHT}</Icon>
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
                                {/* FIX: Changed path prop to children for Icon component */}
                                <Icon>{ICONS.SEND_EMAIL}</Icon>
                                <span>{t('submit')}</span>
                            </>
                        )}
                    </Button>
                )}
            </div>
        </div>
    );
};

export default WizardLayout;
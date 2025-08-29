import React from 'react';
import WizardLayout from './WizardLayout';

const Step1SelectType = ({ onNext, onBack, data, updateData }: { onNext: () => void; onBack: () => void; data: any; updateData: (d: any) => void; }) => {

    const handleSelect = (type: string) => {
        updateData({ type });
    };

    return (
        <WizardLayout
            step={1}
            title="Select Type"
            onNext={onNext}
            onBack={onBack}
            nextDisabled={!data.type}
        >
            <div className="selection-grid">
                <div
                    className={`selection-card ${data.type === 'regular' ? 'selected' : ''}`}
                    onClick={() => handleSelect('regular')}
                >
                    <h3>REGULAR<br />CAMPAIGN</h3>
                    <div className="selection-card-radio"></div>
                </div>
                <div
                    className="selection-card disabled"
                    title="Coming Soon!"
                >
                    <h3>A/B TEST<br />CAMPAIGN</h3>
                    <div className="selection-card-radio"></div>
                </div>
            </div>
        </WizardLayout>
    );
};

export default Step1SelectType;

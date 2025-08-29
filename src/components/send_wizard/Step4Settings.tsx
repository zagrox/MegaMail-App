import React from 'react';
import WizardLayout from './WizardLayout';
import { useTranslation } from 'react-i18next';

const Step4Settings = ({ onNext, onBack, data, updateData }: { onNext: () => void; onBack: () => void; data: any; updateData: (d: any) => void; }) => {
    const { t } = useTranslation();

    const handleSimpleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        updateData({ [name]: type === 'checkbox' ? checked : value });
    };

    const handleUtmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const utmField = name.replace('utm_', ''); // e.g., utm_Source -> Source
        updateData({
            utm: {
                ...data.utm,
                [utmField]: value
            }
        });
    };

    const handleOptimizationToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
        const isEnabled = e.target.checked;
        if (isEnabled) {
            // Default to the first option when enabling
            updateData({
                sendTimeOptimization: true,
                deliveryOptimization: 'ToEngagedFirst',
                enableSendTimeOptimization: false,
            });
        } else {
            // Reset everything when disabling
            updateData({
                sendTimeOptimization: false,
                deliveryOptimization: 'None',
                enableSendTimeOptimization: false,
            });
        }
    };

    const handleOptimizationChoiceChange = (choice: 'engaged' | 'optimal') => {
        if (choice === 'engaged') {
            updateData({
                deliveryOptimization: 'ToEngagedFirst',
                enableSendTimeOptimization: false,
            });
        } else if (choice === 'optimal') {
            updateData({
                deliveryOptimization: 'None',
                enableSendTimeOptimization: true,
            });
        }
    };

    const optimizationChoice = data.enableSendTimeOptimization ? 'optimal' : 'engaged';

    return (
        <WizardLayout
            step={4}
            title={t('settings')}
            onNext={onNext}
            onBack={onBack}
            nextDisabled={!data.campaignName}
        >
            <div className="wizard-settings-container">
                <div className="form-group">
                    <label htmlFor="campaignName">{t('campaignName')}</label>
                    <input type="text" id="campaignName" name="campaignName" value={data.campaignName} onChange={handleSimpleChange} placeholder="Welcome to our app" />
                </div>

                <hr className="form-separator" />
                
                <div className="wizard-settings-section">
                    <h4>{t('sending')}</h4>
                    <div className="wizard-settings-toggle-group">
                        <label className="toggle-switch">
                            <input type="checkbox" name="sendTimeOptimization" checked={!!data.sendTimeOptimization} onChange={handleOptimizationToggle} />
                            <span className="toggle-slider"></span>
                        </label>
                        <label htmlFor="sendTimeOptimization" style={{ fontWeight: 500 }}>{t('sendTimeOptimization')}</label>
                    </div>
                    {data.sendTimeOptimization && (
                        <div className="optimization-options">
                            <label className="custom-radio">
                                <input type="radio" name="optimizationChoice" value="engaged" checked={optimizationChoice === 'engaged'} onChange={() => handleOptimizationChoiceChange('engaged')} />
                                <span className="radio-checkmark"></span>
                                <span className="radio-label">{t('sendToEngagedFirst')}</span>
                                <p className="radio-description">{t('sendToEngagedFirstDesc')}</p>
                            </label>
                            <label className="custom-radio">
                                <input type="radio" name="optimizationChoice" value="optimal" checked={optimizationChoice === 'optimal'} onChange={() => handleOptimizationChoiceChange('optimal')} />
                                <span className="radio-checkmark"></span>
                                <span className="radio-label">{t('sendAtOptimalTime')}</span>
                                <p className="radio-description">{t('sendAtOptimalTimeDesc')}</p>
                            </label>
                        </div>
                    )}
                </div>

                <hr className="form-separator" />

                <div className="wizard-settings-section">
                    <h4>{t('tracking')}</h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <label className="custom-checkbox">
                            <input type="checkbox" name="trackOpens" checked={!!data.trackOpens} onChange={handleSimpleChange} />
                            <span className="checkbox-checkmark"></span>
                            <span className="checkbox-label">{t('trackOpens')}</span>
                        </label>
                        <label className="custom-checkbox">
                            <input type="checkbox" name="trackClicks" checked={!!data.trackClicks} onChange={handleSimpleChange} />
                            <span className="checkbox-checkmark"></span>
                            <span className="checkbox-label">{t('trackClicks')}</span>
                        </label>
                    </div>
                </div>
                
                <hr className="form-separator" />

                <div className="wizard-settings-section">
                    <label className="custom-checkbox">
                        <input type="checkbox" name="utmEnabled" checked={!!data.utmEnabled} onChange={handleSimpleChange} />
                        <span className="checkbox-checkmark"></span>
                        <h4 className="checkbox-label" style={{ display: 'inline' }}>{t('googleAnalytics')}</h4>
                    </label>

                    {data.utmEnabled && (
                        <div className="utm-fields-container">
                            <p>{t('utmDescription')}</p>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label htmlFor="utm_Source">UTM_Source</label>
                                    <input type="text" id="utm_Source" name="utm_Source" value={data.utm.Source} onChange={handleUtmChange} />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="utm_Medium">UTM_Medium</label>
                                    <input type="text" id="utm_Medium" name="utm_Medium" value={data.utm.Medium} onChange={handleUtmChange} />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="utm_Campaign">UTM_Campaign</label>
                                    <input type="text" id="utm_Campaign" name="utm_Campaign" value={data.utm.Campaign} onChange={handleUtmChange} />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="utm_Content">UTM_Content</label>
                                    <input type="text" id="utm_Content" name="utm_Content" value={data.utm.Content} onChange={handleUtmChange} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </WizardLayout>
    );
};

export default Step4Settings;
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '../api/elasticEmail';
import { useToast } from '../contexts/ToastContext';
import Loader from '../components/Loader';
import Icon, { ICONS } from '../components/Icon';
import { useConfiguration } from '../contexts/ConfigurationContext';

const TOTAL_STEPS = 4;

const Step1 = ({ config, loading }: { config: any, loading: boolean }) => {
    const { t } = useTranslation(['onboarding', 'common']);
    const appName = t('appName');
    const logoUrl = config?.app_logo && config?.app_backend ? `${config.app_backend}/assets/${config.app_logo}` : '';

    return (
        <div className="onboarding-step">
            {loading ? (
                <div style={{ height: '80px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <Loader />
                </div>
            ) : (
                logoUrl && <img src={logoUrl} alt={`${appName} Logo`} className="onboarding-logo" />
            )}
            <h2>{t('welcomeTitle', { appName })}</h2>
            <p>{t('welcomeSubtitle')}</p>
        </div>
    );
};

const Step2 = () => {
    const { t } = useTranslation(['onboarding', 'common', 'dashboard']);
    const [activeFeatureIndex, setActiveFeatureIndex] = useState(0);

    const features = [
        { icon: ICONS.SEND_EMAIL, title: t('emailBuilder', { ns: 'common' }), desc: t('emailBuilderDesc', { ns: 'dashboard' }) },
        { icon: ICONS.ACCOUNT, title: t('contacts', { ns: 'common' }), desc: t('contactsDesc', { ns: 'dashboard' }) },
        { icon: ICONS.TRENDING_UP, title: t('statistics', { ns: 'common' }), desc: t('statisticsDesc', { ns: 'dashboard' }) },
        { icon: ICONS.BELL, title: t('campaigns', { ns: 'common' }), desc: t('campaignsDesc', { ns: 'dashboard' }) },
        { icon: ICONS.SEGMENTS, title: t('segments', { ns: 'common' }), desc: t('segmentsDesc', { ns: 'dashboard' }) },
        { icon: ICONS.EMAIL_LISTS, title: t('emailLists', { ns: 'common' }), desc: t('emailListsDesc', { ns: 'dashboard' }) },
        { icon: ICONS.AI_ICON, title: t('aiAssistant'), desc: t('aiAssistantDesc'), isComingSoon: true },
        { icon: ICONS.VERIFY, title: t('validation'), desc: t('validationDesc'), isComingSoon: true },
    ];

    const activeFeature = features[activeFeatureIndex];

    const handleFeatureSelect = (index: number) => {
        // Allow selecting "coming soon" features to view their description,
        // but the button itself will appear disabled.
        setActiveFeatureIndex(index);
    };

    return (
        <div className="onboarding-step">
            <h2>{t('featuresTitle')}</h2>
            <p>{t('featuresSubtitle')}</p>
            <div className="onboarding-features-layout">
                <div className="features-list">
                    {features.map((feature, index) => (
                        <button
                            key={feature.title}
                            className={`feature-trigger ${index === activeFeatureIndex ? 'active' : ''} ${feature.isComingSoon ? 'coming-soon' : ''}`}
                            onClick={() => handleFeatureSelect(index)}
                        >
                            <Icon>{feature.icon}</Icon>
                            <div className="feature-trigger-text">
                                <span>{feature.title}</span>
                                {feature.isComingSoon && <span className="soon-badge">{t('soon')}</span>}
                            </div>
                        </button>
                    ))}
                </div>
                <div className="feature-display-panel">
                    {activeFeature && (
                        <div className="feature-display-content" key={activeFeature.title}>
                            <div className="feature-display-icon">
                                <Icon>{activeFeature.icon}</Icon>
                            </div>
                            <h3>{activeFeature.title}</h3>
                            <p>{activeFeature.desc}</p>
                            {activeFeature.isComingSoon && (
                                <>
                                    <div className="onboarding-feature-separator"></div>
                                    <button className="btn btn-soon" disabled>{t('comingSoon')}</button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const Step3 = ({ data, setData }: { data: any, setData: Function }) => {
    const { t } = useTranslation(['onboarding', 'common', 'account']);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setData({ ...data, [e.target.name]: e.target.value });
    };

    const handleTypeChange = (type: 'personal' | 'business') => {
        setData({ ...data, type });
    };

    return (
        <div className="onboarding-step">
            <h2>{t('profileTitle')}</h2>
            <p>{t('profileSubtitle')}</p>
            <form className="auth-form" style={{maxWidth: '550px', margin: '0 auto', textAlign: 'start'}}>
                <div className="form-group">
                    <label>{t('accountType')}</label>
                    <div className="segmented-control" style={{width: '100%'}}>
                        <button type="button" onClick={() => handleTypeChange('personal')} className={data.type === 'personal' ? 'active' : ''}>{t('personal')}</button>
                        <button type="button" onClick={() => handleTypeChange('business')} className={data.type === 'business' ? 'active' : ''}>{t('business')}</button>
                    </div>
                </div>

                <div className="form-grid">
                    <div className="form-group">
                        <label htmlFor="mobile">{t('mobile', { ns: 'account' })}*</label>
                        <input id="mobile" name="mobile" type="tel" placeholder="09123456789" value={data.mobile} onChange={handleChange} required />
                    </div>
                     <div className="form-group">
                        <label htmlFor="language">{t('appLanguage')}*</label>
                        <select id="language" name="language" value={data.language} onChange={handleChange} required>
                            <option value="en-US">{t('english')}</option>
                            <option value="fa-IR">{t('persian')}</option>
                        </select>
                    </div>
                </div>
                
                 {data.type === 'business' && (
                    <div className="form-group full-width">
                        <label htmlFor="company">{t('company', { ns: 'account' })}</label>
                        <input id="company" name="company" type="text" placeholder={t('company', { ns: 'account' })} value={data.company} onChange={handleChange} />
                    </div>
                )}

                <div className="form-grid">
                     <div className="form-group">
                        <label htmlFor="website">{t('website', { ns: 'account' })}</label>
                        <input id="website" name="website" type="url" placeholder="https://example.com" value={data.website} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="display">{t('displayMode')}</label>
                        <select id="display" name="display" value={data.display} onChange={handleChange}>
                            <option value="auto">{t('auto')}</option>
                            <option value="light">{t('light')}</option>
                            <option value="dark">{t('dark')}</option>
                        </select>
                    </div>
                </div>
            </form>
        </div>
    );
};

const Step4 = () => {
    const { t } = useTranslation(['onboarding', 'common']);
    return (
        <div className="onboarding-step">
            <div className="feature-display-icon">
                <Icon>{ICONS.VERIFY}</Icon>
            </div>
            <h2>{t('finalizeSetupTitle')}</h2>
            <p>{t('finalizeSetupSubtitle')}</p>
        </div>
    );
};

const OnboardingFlowView = ({ onComplete }: { onComplete: () => void }) => {
    const { t } = useTranslation(['onboarding', 'common', 'account']);
    const { user, updateUser, createElasticSubaccount } = useAuth();
    const { addToast } = useToast();
    const { config, loading: configLoading } = useConfiguration();
    
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [demoLoading, setDemoLoading] = useState(false);

    // Step 3 state
    const [profileData, setProfileData] = useState({
        type: 'personal',
        mobile: user?.mobile || '',
        language: 'fa-IR',
        display: 'auto',
        website: user?.website || '',
        company: user?.company || '',
    });

    // Step 4 state (including fallback)
    const [apiKey, setApiKey] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [newUserFlowFailed, setNewUserFlowFailed] = useState(false);

    const handleNext = () => setStep(s => Math.min(s + 1, TOTAL_STEPS));
    const handleBack = () => setStep(s => Math.max(s - 1, 1));

    const handleProfileSubmit = async () => {
        if (!profileData.type || !profileData.mobile || !profileData.language) {
            addToast(t('pleaseFillRequiredFields', { ns: 'common' }), 'error');
            return;
        }
        setLoading(true);
        try {
            await updateUser(profileData);
            addToast(t('profileUpdateSuccess', { ns: 'account' }), 'success');
            handleNext();
        } catch (err: any) {
            addToast(t('profileUpdateError', { error: err.message, ns: 'account' }), 'error');
        } finally {
            setLoading(false);
        }
    };
    
    // This is the manual API key submission for the *fallback* case.
    const handleApiKeySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await apiFetch('/account/load', apiKey); // Validate key
            await updateUser({ elastickey: apiKey });
            addToast(t('apiKeyUpdateSuccess', { ns: 'account' }), 'success');
            onComplete();
        } catch (err: any) {
            addToast(err.message || t('invalidApiKey'), 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDemoLogin = async () => {
        setDemoLoading(true);
        const DEMO_API_KEY = 'CAA7DE853FEDA01F7D314E018B78FFD163F0C328F93352CAF663C2BDA732CBE91C7E0A6E218464A17EDD5A474668EBE5';
        try {
            await apiFetch('/account/load', DEMO_API_KEY); // Validate key
            await updateUser({ elastickey: DEMO_API_KEY });
            addToast(t('welcomeToDemo'), 'success');
            onComplete();
        } catch (err: any) {
            addToast(err.message || t('invalidApiKey'), 'error');
        } finally {
            setDemoLoading(false);
        }
    };

    // This is the primary action for step 4, triggering the unified backend flow.
    const handleFinalizeSetup = async () => {
        if (!user || !user.email) {
            addToast(t('userEmailNotFound'), 'error');
            return;
        }

        setLoading(true);
        setNewUserFlowFailed(false); // Reset on new attempt
        try {
            // This password is for the new Elastic Email subaccount, not the user's Directus password.
            // It's temporary and the user will use an API key to interact with the system.
            const randomPassword = Math.random().toString(36).slice(-12);
            await createElasticSubaccount(user.email, randomPassword);
            // The createElasticSubaccount function in AuthContext handles refreshing the user data,
            // which will make the user?.elastickey available and exit the onboarding flow.
            addToast(t('accountConnectedSuccess'), 'success');
        } catch (err: any) {
            addToast(err.message, 'error');
            setNewUserFlowFailed(true);
        } finally {
            setLoading(false);
        }
    };
    
    const isProfileStepComplete = profileData.type && profileData.mobile && profileData.language;

    return (
        <div className="onboarding-container">
            <div className="onboarding-box">
                <div className="onboarding-progress">
                    <div className="progress-bar-wrapper">
                        <div className="progress-bar-inner" style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}></div>
                    </div>
                </div>
                <div className="onboarding-content">
                    {step === 1 && <Step1 config={config} loading={configLoading} />}
                    {step === 2 && <Step2 />}
                    {step === 3 && <Step3 data={profileData} setData={setProfileData} />}
                    {step === 4 && (
                        <div className="onboarding-step">
                            <Step4 />
                            {newUserFlowFailed && (
                                <form className="onboarding-api-key-form" onSubmit={handleApiKeySubmit}>
                                    <div className="info-message warning" style={{textAlign: 'left', maxWidth: '400px', margin: '2rem auto 0'}}>
                                        <strong>{t('setupFailed')}</strong>
                                        <p>{t('setupFailedManualPrompt')}</p>
                                    </div>
                                    <div className="input-group has-btn" style={{ maxWidth: '400px', margin: '1rem auto 0' }}>
                                        <span className="input-icon"><Icon>{ICONS.KEY}</Icon></span>
                                        <input name="apikey" type={showPassword ? "text" : "password"} placeholder={t('enterYourApiKey')} required value={apiKey} onChange={e => setApiKey(e.target.value)} />
                                        <button type="button" className="input-icon-btn" onClick={() => setShowPassword(!showPassword)}>
                                            <Icon>{showPassword ? ICONS.EYE_OFF : ICONS.EYE}</Icon>
                                        </button>
                                    </div>
                                    <div className="form-actions" style={{ justifyContent: 'center', border: 'none', padding: '1rem 0 0', flexDirection: 'column', maxWidth: '400px', margin: '0 auto' }}>
                                        <button type="submit" className="btn btn-primary full-width" disabled={loading || demoLoading} style={{ marginBottom: '0.75rem' }}>
                                            {loading ? <Loader /> : t('verifyAndFinish')}
                                        </button>
                                        <button type="button" className="btn btn-secondary full-width" onClick={handleDemoLogin} disabled={loading || demoLoading}>
                                            {demoLoading ? <Loader /> : t('visitDemo')}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    )}
                </div>
                <div className="onboarding-actions">
                    <button className="btn btn-secondary" onClick={handleBack} disabled={step === 1 || loading || demoLoading} style={{ visibility: step > 1 ? 'visible' : 'hidden' }}>
                        {t('back')}
                    </button>
                    {step < 3 && <button className="btn btn-primary" onClick={handleNext}>{step === 1 ? t('getStarted') : t('nextStep')}</button>}
                    {step === 3 && <button className="btn btn-primary" onClick={handleProfileSubmit} disabled={loading || !isProfileStepComplete}>{loading ? <Loader/> : t('saveAndContinue')}</button>}
                    {step === 4 && !newUserFlowFailed && (
                        <button className="btn btn-primary" onClick={handleFinalizeSetup} disabled={loading}>
                            {loading ? <Loader /> : t('finishSetup')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OnboardingFlowView;
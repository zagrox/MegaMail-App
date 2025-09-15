
import React, { useState, useEffect, useCallback, ReactNode, createContext, useContext } from 'react';
// FIX: Removed `updateUser as sdkUpdateUser` as it was causing argument mismatch errors and is replaced by a raw request.
// FIX: Added AuthenticationData type for use with raw login request.
import { readMe, registerUser, updateMe, createItem, readItems, updateItem, type AuthenticationData } from '@directus/sdk';
// FIX: Import storage to manually handle authentication tokens.
import sdk, { storage } from '../api/directus';
import { apiFetch } from '../api/elasticEmail';
import type { Module } from '../api/types';
import { AppActions } from '../config/actions';
import { DIRECTUS_CRM_URL } from '../api/config';

interface User {
    id: string;
    first_name?: string;
    last_name?: string;
    email: string;
    avatar?: string;
    language?: string;
    status: string;
    role: any;
    last_access?: string;
    email_notifications: boolean;
    theme_dark: boolean;
    theme_light: boolean;
    text_direction: string;
    company?: string;
    website?: string;
    mobile?: string;
    elastickey?: string;
    elasticid?: string;
    isApiKeyUser?: boolean;
    profileId?: string;
    purchasedModules: string[];
    type?: string;
    display?: 'light' | 'dark' | 'auto';
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    loading: boolean;
    login: (credentials: any, recaptchaToken?: string) => Promise<void>;
    loginWithApiKey: (apiKey: string) => Promise<void>;
    register: (details: any, recaptchaToken?: string) => Promise<any>;
    logout: () => void;
    updateUser: (data: any) => Promise<void>;
    updateUserEmail: (newEmail: string) => Promise<void>;
    changePassword: (passwords: { old: string; new: string }) => Promise<void>;
    requestPasswordReset: (email: string, recaptchaToken?: string) => Promise<void>;
    resetPassword: (token: string, password: string) => Promise<void>;
    createElasticSubaccount: (email: string, password: string) => Promise<any>;
    hasModuleAccess: (moduleName: string, allModules: Module[] | null) => boolean;
    canPerformAction: (actionName: string) => boolean;
    purchaseModule: (moduleId: string) => Promise<void>;
    allModules: Module[] | null;
    moduleToUnlock: Module | null;
    setModuleToUnlock: (module: Module | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [allModules, setAllModules] = useState<Module[] | null>(null);
    const [moduleToUnlock, setModuleToUnlock] = useState<Module | null>(null);

    // This function ONLY handles fetching and setting a Directus user.
    const getMe = useCallback(async () => {
        try {
            // If allModules is already populated, modulesPromise resolves instantly.
            // Otherwise, it starts the network request in the background.
            const modulesPromise = allModules
                ? Promise.resolve(allModules)
                : sdk.request(readItems('modules', { 
                    fields: ['id', 'modulename', 'moduleprice', 'moduledetails', 'status', 'modulepro', 'modulediscount', 'modulecore', 'locked_actions'], 
                    limit: -1,
                    filter: { status: { _eq: 'published' } } 
                }));

            // 1. Get Directus user data
            const me = await sdk.request(readMe({
                fields: [
                    'id', 'first_name', 'last_name', 'email', 'avatar', 'language',
                    'status', 'role.*', 'last_access', 'email_notifications',
                    'theme_dark', 'theme_light', 'text_direction'
                ]
            }));

            // 2. Get the associated user profile from the 'profiles' collection
            const profiles = await sdk.request(readItems('profiles', {
                filter: { user_created: { _eq: me.id } },
                fields: ['id', 'company', 'website', 'mobile', 'elastickey', 'elasticid', 'type', 'display', 'language'],
                limit: 1
            }));
            
            let profileData = profiles?.[0];

            if (!profileData) {
                profileData = await sdk.request(createItem('profiles', { status: 'published', user_created: me.id }));
            }

            // 3. Initiate fetching purchased modules based on the profile ID.
            const purchasedModulesPromise = profileData.id
                ? sdk.request(readItems('profiles_modules', {
                    filter: { profile_id: { _eq: profileData.id } },
                    fields: ['module_id'],
                    limit: -1
                }))
                : Promise.resolve([]);

            // 4. Await the modules (which may have been fetching in the background) and purchased modules.
            const [fetchedModules, purchasedModulesResponse] = await Promise.all([
                modulesPromise,
                purchasedModulesPromise
            ]);

            // 5. Update the state for all modules if it was the first time fetching them.
            if (!allModules) {
                setAllModules(fetchedModules as Module[]);
            }
            
            // 6. Process the purchased modules
            const purchasedModuleIds = new Set(purchasedModulesResponse.map((pm: any) => String(pm.module_id)));
            const purchasedModules = (fetchedModules as Module[])
                .filter((module: any) => purchasedModuleIds.has(String(module.id)))
                .map((module: any) => module.modulename);

            // 7. Combine data and set the user state
            const mergedUser: User = {
                ...me,
                ...profileData,
                id: me.id,
                email: me.email,
                status: me.status,
                role: me.role,
                email_notifications: me.email_notifications,
                theme_dark: me.theme_dark,
                theme_light: me.theme_light,
                text_direction: me.text_direction,
                profileId: profileData.id as string,
                purchasedModules,
                isApiKeyUser: false,
            };
            
            setUser(mergedUser);

        } catch (error) {
            console.error("Directus session refresh failed:", error);
            await sdk.logout();
            setUser(null);
        }
    }, [allModules]);

    // This function ONLY handles fetching and setting an API Key user.
    const getApiKeyUser = useCallback(async (apiKey: string) => {
         try {
            const accountData = await apiFetch('/account/load', apiKey);
            setUser({
                id: accountData.publicaccountid || `api-user-${apiKey.slice(0, 5)}`,
                email: accountData.email,
                elastickey: apiKey,
                isApiKeyUser: true,
                purchasedModules: [], // API key users have no Directus-managed modules
                first_name: accountData.firstname,
                last_name: accountData.lastname,
                status: 'Active',
                role: { name: 'API User' },
                last_access: new Date().toISOString(),
                email_notifications: false,
                theme_dark: false,
                theme_light: true,
                text_direction: 'ltr',
            });
        } catch (error) {
            console.error("API Key validation failed:", error);
            localStorage.removeItem('elastic_email_api_key');
            setUser(null);
        }
    }, []);

    // On initial app load, determine auth state
    useEffect(() => {
        const initializeAuth = async () => {
            setLoading(true);
            const directusToken = await sdk.getToken();
            const apiKey = localStorage.getItem('elastic_email_api_key');

            if (directusToken) {
                await getMe();
            } else if (apiKey) {
                await getApiKeyUser(apiKey);
            } else {
                setUser(null);
            }
            setLoading(false);
        };
        initializeAuth();
    }, [getMe, getApiKeyUser]);
    
    const login = async (credentials: any, recaptchaToken?: string) => {
        setLoading(true);
        try {
            // FIX: The original sdk.login call caused a parameter count error (line 199).
            // Replaced with a raw request to the login endpoint to reliably include the reCAPTCHA token,
            // which is consistent with other auth methods in this file.
            const authData = await sdk.request<AuthenticationData>(() => ({
                method: 'POST',
                path: '/auth/login',
                body: JSON.stringify({
                    email: credentials.email.toLowerCase(),
                    password: credentials.password,
                    'g-recaptcha-response': recaptchaToken,
                }),
                headers: { 'Content-Type': 'application/json' },
            }));

            // Manually set the authentication data in storage, which the SDK's
            // internal request interceptor will then use for subsequent requests.
            await storage.set(authData);

            localStorage.removeItem('elastic_email_api_key');
            await getMe();
        } finally {
            setLoading(false);
        }
    };
    
    const loginWithApiKey = async (apiKey: string) => {
        setLoading(true);
        await sdk.logout();
        localStorage.setItem('elastic_email_api_key', apiKey);
        await getApiKeyUser(apiKey);
        setLoading(false);
    };

    const register = async (details: any, recaptchaToken?: string) => {
        const { email, password, ...otherDetails } = details;
        return await sdk.request(() => ({
            method: 'POST',
            path: '/users',
            body: JSON.stringify({
                email: email.toLowerCase(),
                password: password,
                ...otherDetails,
                'g-recaptcha-response': recaptchaToken,
            }),
            headers: { 'Content-Type': 'application/json' },
        }));
    };

    const logout = async () => {
        setLoading(true);
        try {
            await sdk.logout();
        } catch (error) {
            console.warn("Directus SDK logout failed, likely already logged out.", error);
        } finally {
            localStorage.removeItem('elastic_email_api_key');
            setUser(null);
            setLoading(false);
        }
    };

    const updateUser = async (data: any) => {
        if (!user || !user.id || user.isApiKeyUser) throw new Error("User not authenticated for this action");

        try {
            const meFields: { [key: string]: any } = {};
            const profileFields: { [key: string]: any } = {};
            const allowedMeFields = ['first_name', 'last_name', 'language', 'theme_dark', 'theme_light', 'text_direction'];
            const allowedProfileFields = ['company', 'website', 'mobile', 'elastickey', 'elasticid', 'type', 'display'];

            for (const key in data) {
                if (allowedMeFields.includes(key)) meFields[key] = data[key];
                else if (allowedProfileFields.includes(key)) profileFields[key] = data[key];
            }

            if (Object.keys(meFields).length > 0) {
                await sdk.request(updateMe(meFields));
            }

            if (Object.keys(profileFields).length > 0 && user.profileId) {
                await sdk.request(updateItem('profiles', user.profileId, profileFields));
            }
            
            // Re-fetch to get the canonical state from the server AFTER a successful update.
            await getMe();

        } catch (error) {
            console.error("Failed to update user:", error);
            // No optimistic state to revert, just re-throw the error
            throw error;
        }
    };

    const updateUserEmail = async (newEmail: string) => {
        if (!user || user.isApiKeyUser) throw new Error("User not authenticated.");
        await sdk.request(updateMe({ email: newEmail.toLowerCase() }));
        await getMe();
    };

    const changePassword = async (passwords: { old: string; new: string }) => {
        if (!user) throw new Error("User not authenticated");
        // FIX: Replaced deprecated SDK call (`sdk.users.me.update`) and removed @ts-ignore
        // with a raw request to the correct password change endpoint.
        await sdk.request(() => ({
            method: 'PATCH',
            path: '/users/me/password',
            body: JSON.stringify({
                password: passwords.new,
                old_password: passwords.old,
            }),
            headers: { 'Content-Type': 'application/json' },
        }));
    };
    
    const requestPasswordReset = async (email: string, recaptchaToken?: string) => {
        const reset_url = `${window.location.origin}${window.location.pathname}#/reset-password`;
        const requestPayload = {
            email: email.toLowerCase(),
            reset_url: reset_url,
        };
    
        // Use a raw request to include the reCAPTCHA token in the body, which the SDK doesn't directly support here.
        await sdk.request(() => ({
            method: 'POST',
            path: '/auth/password/request',
            body: JSON.stringify({ ...requestPayload, 'g-recaptcha-response': recaptchaToken }),
            headers: { 'Content-Type': 'application/json' },
        }));
    };

    const resetPassword = async (token: string, password: string) => {
        // FIX: The `sdk.passwordReset` method does not exist. Replaced with a raw request to the password reset endpoint.
        await sdk.request(() => ({
            method: 'POST',
            path: '/auth/password/reset',
            body: JSON.stringify({ token, password }),
            headers: { 'Content-Type': 'application/json' },
        }));
    };

    const createElasticSubaccount = async (email: string, password: string) => {
        if (!user || user.isApiKeyUser || !user.elastickey) throw new Error("Main account API key not found.");
        
        const subaccountData = await apiFetch('/account/addsubaccount', user.elastickey, {
            method: 'POST',
            params: { email, password }
        });

        await updateUser({
            elastickey: subaccountData.apikey,
            elasticid: subaccountData.publicaccountid,
        });

        return subaccountData;
    };

    const hasModuleAccess = (moduleName: string, allModules: Module[] | null): boolean => {
        if (!allModules) return false;
        const moduleData = allModules.find(m => m.modulename === moduleName);
        if (!moduleData) return true; // If module isn't in DB, it's a core feature
        if (moduleData.modulecore) return true; // Core modules are always accessible
        return user?.purchasedModules.includes(moduleName) ?? false;
    };
    
    const canPerformAction = (actionName: string): boolean => {
        if (!allModules || !user) return false;
        
        const normalize = (str: string) => str.toLowerCase().replace(/_/g, '');
        const normalizedActionName = normalize(actionName);
        
        const moduleThatLocksAction = allModules.find(m => 
            Array.isArray(m.locked_actions) && 
            m.locked_actions.some(lockedAction => normalize(lockedAction) === normalizedActionName)
        );

        if (!moduleThatLocksAction) return true;
        return hasModuleAccess(moduleThatLocksAction.modulename, allModules);
    };

    const purchaseModule = (moduleId: string): Promise<void> => {
        return new Promise(async (resolve, reject) => {
            if (!user || !user.profileId) {
                return reject(new Error("User profile not found."));
            }
    
            const moduleToBuy = allModules?.find(m => String(m.id) === String(moduleId));
            if (!moduleToBuy) {
                return reject(new Error("Module not found."));
            }
    
            const webhookUrl = `${DIRECTUS_CRM_URL}/flows/trigger/974adeab-789f-428d-9433-b056e1c6da9b`;
    
            try {
                // Step 1: Trigger the webhook. The flow handles all backend logic.
                const response = await fetch(webhookUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${await sdk.getToken()}`
                    },
                    body: JSON.stringify({ module_id: moduleId })
                });
    
                if (!response.ok) {
                    try {
                        const errorBody = await response.json();
                        // Customize error for insufficient balance based on your flow's potential response
                        if (errorBody.message?.toLowerCase().includes('balance')) {
                            throw new Error("Insufficient credits.");
                        }
                        throw new Error(errorBody.message || `Webhook trigger failed with status ${response.status}`);
                    } catch {
                        throw new Error(`Webhook trigger failed with status ${response.status}`);
                    }
                }
    
                // Step 2: Poll for the result of the flow: the 'profiles_modules' item creation.
                const pollForModuleUnlock = async (timeout = 15000, interval = 2000): Promise<boolean> => {
                    const endTime = Date.now() + timeout;
                    while (Date.now() < endTime) {
                        try {
                            const result = await sdk.request(readItems('profiles_modules', {
                                filter: {
                                    profile_id: { _eq: user.profileId },
                                    module_id: { _eq: moduleId }
                                },
                                limit: 1
                            }));
                            if (result && result.length > 0) {
                                return true; // Success!
                            }
                        } catch (pollError) {
                            console.warn("Polling for module unlock encountered an error, retrying...", pollError);
                        }
                        await new Promise(res => setTimeout(res, interval));
                    }
                    return false; // Timeout
                };
    
                const isUnlocked = await pollForModuleUnlock();
    
                if (isUnlocked) {
                    // Success: refresh user data. The server-side flow is responsible for notifications.
                    await getMe();
                    resolve();
                } else {
                    // Failure: timeout
                    await getMe(); // Refresh state just in case
                    reject(new Error("Unlocking the module timed out. The transaction may still be processing. Please check your modules page again shortly or contact support."));
                }
    
            } catch (error: any) {
                console.error("Module purchase failed:", error);
                return reject(new Error(error.message || "Could not initiate module purchase. Please contact support."));
            }
        });
    };

    const value = {
        user,
        isAuthenticated: !!user,
        loading,
        login,
        loginWithApiKey,
        register,
        logout,
        updateUser,
        updateUserEmail,
        changePassword,
        requestPasswordReset,
        resetPassword,
        createElasticSubaccount,
        hasModuleAccess,
        canPerformAction,
        purchaseModule,
        allModules,
        moduleToUnlock,
        setModuleToUnlock
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

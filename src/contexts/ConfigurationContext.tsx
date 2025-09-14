import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { readSingleton } from '@directus/sdk';
import sdk from '../api/directus';
import { Configuration } from '../api/types';

interface ConfigurationContextType {
    config: Configuration | null;
    loading: boolean;
    error: string | null;
}

const ConfigurationContext = createContext<ConfigurationContextType | undefined>(undefined);

export const ConfigurationProvider = ({ children }: { children: ReactNode }) => {
    const [config, setConfig] = useState<Configuration | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                // Using the Directus SDK to fetch the singleton configuration item.
                // This ensures consistency with other API calls and may better handle
                // authentication or CORS policies configured in the SDK.
                const configData = await sdk.request(readSingleton('configuration'));
                
                if (configData) {
                    setConfig(configData as Configuration);
                } else {
                     throw new Error('Configuration data not found in response');
                }
            } catch (err: any) {
                let errorMessage = 'Failed to fetch app configuration';
                // Directus SDK errors have a specific structure
                if (err.errors && err.errors[0] && err.errors[0].message) {
                    errorMessage = err.errors[0].message;
                } else if (err.message) {
                    errorMessage = err.message;
                }
                setError(errorMessage);
                console.error("Configuration fetch error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchConfig();
    }, []);

    const value = { config, loading, error };

    return (
        <ConfigurationContext.Provider value={value}>
            {children}
        </ConfigurationContext.Provider>
    );
};

export const useConfiguration = () => {
    const context = useContext(ConfigurationContext);
    if (context === undefined) {
        throw new Error('useConfiguration must be used within a ConfigurationProvider');
    }
    return context;
};

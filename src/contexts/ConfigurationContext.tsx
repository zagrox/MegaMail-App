import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { DIRECTUS_CRM_URL } from '../api/config';
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
                const response = await fetch(`${DIRECTUS_CRM_URL}/items/configuration`);
                if (!response.ok) {
                    throw new Error('Failed to fetch app configuration');
                }
                const result = await response.json();
                if (result.data) {
                    setConfig(result.data);
                } else {
                     throw new Error('Configuration data not found in response');
                }
            } catch (err: any) {
                setError(err.message);
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

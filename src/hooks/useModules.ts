import { useState, useEffect } from 'react';
import { Module } from '../api/types';

let cachedModules: Module[] | null = null;

const useModules = (backendUrl?: string) => {
    const [modules, setModules] = useState<Module[] | null>(cachedModules);
    const [loading, setLoading] = useState(!cachedModules);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (cachedModules || !backendUrl) {
            return;
        }

        const fetchModules = async () => {
            try {
                const response = await fetch(`${backendUrl}/items/modules?fields=id,modulename,moduleprice,moduledetails,status,modulepro,modulediscount,modulecore`);
                if (!response.ok) {
                    throw new Error('Failed to fetch modules');
                }
                const data = await response.json();
                cachedModules = data.data;
                setModules(cachedModules);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchModules();
    }, [backendUrl]);

    return { modules, loading, error };
};

export default useModules;
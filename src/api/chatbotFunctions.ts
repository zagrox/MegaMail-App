import { apiFetch, apiFetchV4 } from './elasticEmail';

/**
 * Fetches the user's current credit balance.
 */
export async function getCreditBalance(apiKey: string): Promise<number> {
    try {
        const accountData = await apiFetch('/account/load', apiKey);
        return accountData.emailcredits;
    } catch (error) {
        console.error("Chatbot function getCreditBalance failed:", error);
        throw new Error("Could not retrieve credit balance.");
    }
}

/**
 * Fetches the total number of contacts in the user's account.
 */
export async function getTotalContactCount(apiKey: string): Promise<number> {
    try {
        const count = await apiFetch('/contact/count', apiKey, { params: { allContacts: true } });
        return count;
    } catch (error) {
        console.error("Chatbot function getTotalContactCount failed:", error);
        throw new Error("Could not retrieve total contact count.");
    }
}

/**
 * Fetches a list of verified domains.
 */
export async function listVerifiedDomains(apiKey: string): Promise<string[]> {
    try {
        const domains = await apiFetchV4('/domains', apiKey);
        if (Array.isArray(domains)) {
            return domains
                .filter(d => d.Spf === true && d.Dkim === true)
                .map(d => d.Domain);
        }
        return [];
    } catch (error) {
        console.error("Chatbot function listVerifiedDomains failed:", error);
        throw new Error("Could not retrieve the list of domains.");
    }
}

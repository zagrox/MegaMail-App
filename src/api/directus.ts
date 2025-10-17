import { createDirectus, rest, authentication, AuthenticationStorage, AuthenticationData } from '@directus/sdk';
import { DIRECTUS_URL } from './config';
import emitter from './eventEmitter';

// The Directus SDK expects a storage object with get and set methods.
// We'll create a simple adapter for window.localStorage.
export const storage: AuthenticationStorage = {
    get: () => {
        const data = window.localStorage.getItem('directus_storage');
        try {
            return data ? (JSON.parse(data) as AuthenticationData) : null;
        } catch {
            return null;
        }
    },
    set: (value) => {
        if (value) {
            window.localStorage.setItem('directus_storage', JSON.stringify(value));
        } else {
            window.localStorage.removeItem('directus_storage');
        }
    },
};

// Create a client with REST and Authentication modules
// FIX: Enabled `autoRefresh` to automatically handle access token expiration
// using the long-lived refresh token, extending the user's session seamlessly.
const sdk = createDirectus(DIRECTUS_URL)
    .with(rest())
    .with(authentication('json', { storage, autoRefresh: true }));

/**
 * A wrapper for all authenticated Directus SDK requests.
 * It catches token expiration errors and dispatches a global event,
 * allowing the UI to handle session termination gracefully.
 * @param request A function that returns a Directus SDK request promise.
 * @returns The result of the request.
 * @throws Throws an error if the request fails, and dispatches an event if it's a token error.
 */
export const authenticatedRequest = async <T>(request: any): Promise<T> => {
    try {
        // The SDK's `request` method automatically handles the function-based request payload.
        return await sdk.request(request);
    } catch (error: any) {
        // The Directus SDK wraps errors. We check for specific token expiration messages.
        // FIX: Also check for "Invalid refresh token" to handle cases where the long-lived
        // token expires, ensuring a graceful logout in all session-ending scenarios.
        const errorMessage = error?.errors?.[0]?.message;
        if (errorMessage === 'Token expired.' || errorMessage === 'Invalid refresh token.') {
            // Dispatch a global event that the main App component can listen for.
            emitter.dispatchEvent(new CustomEvent('auth:tokenExpired'));
        }
        // Re-throw the error so that the original calling function's catch block can still handle it
        // (e.g., to show a specific error message to the user).
        throw error;
    }
};


export default sdk;
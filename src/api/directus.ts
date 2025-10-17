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
        // The SDK's request method automatically handles token refreshing.
        return await sdk.request(request);
    } catch (error: any) {
        // The Directus SDK wraps errors. We only need to catch the final,
        // unrecoverable error when the refresh token itself is invalid.
        const errorMessage = error?.errors?.[0]?.message;
        if (errorMessage === 'Invalid refresh token.') {
            // Dispatch a global event to trigger logout.
            emitter.dispatchEvent(new CustomEvent('auth:tokenExpired'));
            // By not re-throwing, we prevent downstream catch blocks from
            // firing and showing duplicate/unnecessary error messages. The app
            // will log out, so hanging this promise is acceptable.
            return new Promise(() => {});
        }
        // Re-throw all other errors for component-level handling.
        throw error;
    }
};


export default sdk;
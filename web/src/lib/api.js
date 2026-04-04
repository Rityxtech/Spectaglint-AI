import { supabase } from './supabase';

const API_BASE = import.meta.env.VITE_API_URL || 'https://spectaglint-ai-production.up.railway.app';

/**
 * Core API fetch wrapper.
 * Automatically attaches the Supabase JWT token to authenticate with the Railway/Local backend.
 */
export const apiFetch = async (endpoint, options = {}) => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
        throw new Error('UNAUTHORIZED: No active sequence token');
    }

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        ...options.headers,
    };

    const config = { ...options, headers };

    const response = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
        const errorMsg = data.error || 'UPLINK_FAILURE: Backend refused connection';
        const details = data.details ? ` (${data.details})` : '';
        throw new Error(`${errorMsg}${details}`);
    }

    return data;
};

// ==========================================
// API RESOURCE METHODS
// ==========================================

export const api = {
    // Config & Profile
    getConfig: () => apiFetch('/config'),
    updateConfig: (payload) => apiFetch('/config', { method: 'PUT', body: JSON.stringify(payload) }),

    getProfile: () => apiFetch('/config/profile'),
    updateProfile: (payload) => apiFetch('/config/profile', { method: 'PUT', body: JSON.stringify(payload) }),
    uploadResume: async (formData) => {
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch(`${API_BASE}/config/profile/resume`, {
            method: 'POST',
            body: formData,
            headers: {
                'Authorization': `Bearer ${session?.access_token || ''}`,
            }
        });
        return response.json();
    },

    // Wallet
    getWallet: () => apiFetch('/wallet'),
    purchaseCoins: (packageId) => apiFetch('/wallet/purchase', { method: 'POST', body: JSON.stringify({ packageId }) }),

    // Meetings
    getMeetings: (page = 1, limit = 20) => apiFetch(`/meetings?page=${page}&limit=${limit}`),

    // AI Responses Feed
    getAIResponses: (page = 1, limit = 50) => apiFetch(`/ai/responses?page=${page}&limit=${limit}`),
};

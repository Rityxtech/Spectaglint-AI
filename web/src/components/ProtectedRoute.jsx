import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const ProtectedRoute = () => {
    // undefined = still resolving, null = no session, object = valid session
    const [session, setSession] = useState(undefined);

    useEffect(() => {
        // supabase.auth.onAuthStateChange fires IMMEDIATELY with
        // an INITIAL_SESSION event on mount — this is the single source
        // of truth and avoids getSession() race conditions entirely.
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, currentSession) => {
                setSession(currentSession);
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    // Still waiting for the INITIAL_SESSION event
    if (session === undefined) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div
                        className="w-10 h-10 border-2 border-t-[#8eff71] rounded-full animate-spin"
                        style={{ borderColor: 'rgba(142,255,113,0.15)', borderTopColor: '#8eff71' }}
                    />
                    <span style={{
                        fontFamily: 'monospace',
                        fontSize: '10px',
                        color: '#8eff71',
                        letterSpacing: '0.35em',
                        textTransform: 'uppercase'
                    }}>
                        AUTHENTICATING...
                    </span>
                </div>
            </div>
        );
    }

    // No session or email not confirmed → redirect to login
    if (!session || !session.user?.email_confirmed_at) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;

import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import TechLoader from './TechLoader';

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
            <TechLoader
                title="AUTHENTICATING_SESSION"
                subtitle="VERIFYING_NEURAL_CREDENTIALS..."
                size="small"
                progress={40}
            />
        );
    }

    // No session or email not confirmed → redirect to login
    if (!session || !session.user?.email_confirmed_at) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;

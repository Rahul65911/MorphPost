import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '@/lib/api';
import type { User, LoginRequest, SignupRequest } from '@/types';

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (data: LoginRequest) => Promise<void>;
    googleLogin: (token: string) => Promise<void>;
    signup: (data: SignupRequest) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check if user is already logged in
        const token = localStorage.getItem('access_token');
        if (token) {
            // Fetch real user info
            api.getProfile()
                .then(user => {
                    setUser(user);
                })
                .catch(err => {
                    console.error("Failed to fetch user profile", err);
                    // Optionally clear token if invalid, but let's be safe for now
                    // api.clearToken(); 
                    // setUser(null);
                    // Fallback to temp user if API fails (e.g. backend down) but we have a token?
                    // Better to just not set user so it redirects to login eventually?
                    // For now, let's fallback to temp if strictly needed by UI, or just null.
                    // If we leave it null, isAuthenticated is false, so user goes to login.
                })
                .finally(() => {
                    setIsLoading(false);
                });
        } else {
            setIsLoading(false);
        }
    }, []);

    const login = async (data: LoginRequest) => {
        const response = await api.login(data);
        api.setToken(response.access_token);

        // Fetch user details immediately after login
        try {
            const user = await api.getProfile();
            setUser(user);
        } catch (error) {
            console.error("Failed to fetch profile after login", error);
            // Fallback (shouldn't happen if login succeeded)
            setUser({ id: 'temp', username: 'User', email: data.email, is_onboarded: false });
        }
    };

    const googleLogin = async (token: string) => {
        const response = await api.googleLogin(token);
        api.setToken(response.access_token);

        // Fetch user details immediately after login
        try {
            const user = await api.getProfile();
            setUser(user);
        } catch (error) {
            console.error("Failed to fetch profile after google login", error);
        }
    };

    const signup = async (data: SignupRequest) => {
        const response = await api.signup(data);
        api.setToken(response.access_token);
        setUser({ id: 'temp', username: data.username, email: data.email, is_onboarded: false });
    };

    const logout = () => {
        api.clearToken();
        setUser(null);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                isLoading,
                login,
                googleLogin,
                signup,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

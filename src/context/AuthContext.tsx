import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { PlayerProfile } from '../types/player';
import {
  registerPlayer,
  loginPlayer,
  loginAnonymously,
  loginWithGoogle,
  logoutPlayer,
  sendPasswordRecovery,
  checkUsernameAvailability,
  updatePermittedProfile,
} from '../services/authService';

interface AuthContextValue {
  user: User | null;
  profile: PlayerProfile | null;
  loading: boolean;
  isAuthModalOpen: boolean;
  authModalTab: 'login' | 'register';
  openAuthModal: (defaultTab?: 'login' | 'register') => void;
  closeAuthModal: () => void;
  register: (email: string, pass: string, username: string) => Promise<void>;
  login: (email: string, pass: string) => Promise<void>;
  signInAsGuest: (username: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfileData: (updates: {
    username?: string;
    avatarId?: string;
    bio?: string;
    equippedCosmetics?: PlayerProfile['equippedCosmetics'];
  }) => Promise<void>;
  checkUsername: (username: string) => Promise<{ available: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login');

  const openAuthModal = useCallback((defaultTab: 'login' | 'register' = 'login') => {
    setAuthModalTab(defaultTab);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  // Subscribe to Firebase Auth state & Cloud Firestore real-time profile snapshot
  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        // Realtime subscription to the user's profile document
        const profileRef = doc(db, 'users', currentUser.uid);
        unsubscribeProfile = onSnapshot(
          profileRef,
          (docSnap) => {
            if (docSnap.exists()) {
              setProfile(docSnap.data() as PlayerProfile);
            } else {
              setProfile(null);
            }
            setLoading(false);
          },
          (err) => {
            console.warn('Error reading profile snapshot:', err);
            setLoading(false);
          }
        );
      } else {
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const register = async (email: string, pass: string, username: string) => {
    setLoading(true);
    try {
      const { user: newUser, profile: newProfile } = await registerPlayer(email, pass, username);
      setUser(newUser);
      setProfile(newProfile);
      closeAuthModal();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const loggedUser = await loginPlayer(email, pass);
      setUser(loggedUser);
      closeAuthModal();
    } finally {
      setLoading(false);
    }
  };

  const signInAsGuest = async (guestUsername: string) => {
    setLoading(true);
    try {
      const { user: guestUser, profile: guestProfile } = await loginAnonymously(guestUsername);
      setUser(guestUser);
      setProfile(guestProfile);
      closeAuthModal();
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const { user: googleUser, profile: googleProfile } = await loginWithGoogle();
      setUser(googleUser);
      setProfile(googleProfile);
      closeAuthModal();
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await logoutPlayer();
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    await sendPasswordRecovery(email);
  };

  const updateProfileData = async (updates: {
    username?: string;
    avatarId?: string;
    bio?: string;
    equippedCosmetics?: PlayerProfile['equippedCosmetics'];
  }) => {
    if (!user || !profile) throw new Error('No hunter is currently signed in.');
    await updatePermittedProfile(user.uid, profile.normalizedUsername, updates);
  };

  const checkUsername = async (username: string) => {
    return await checkUsernameAvailability(username);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAuthModalOpen,
        authModalTab,
        openAuthModal,
        closeAuthModal,
        register,
        login,
        signInAsGuest,
        signInWithGoogle,
        logout,
        resetPassword,
        updateProfileData,
        checkUsername,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

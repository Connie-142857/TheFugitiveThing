import React, { useState, useEffect } from 'react';
import { ManuscriptModal } from '../ui/Modal';
import { ManuscriptInput } from '../ui/Input';
import { Button } from '../ui/Button';
import { BookTabs } from '../ui/BookTabs';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { validateUsername } from '../../utils/usernameValidation';
import { Shield, KeyRound, Mail, User, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    authModalTab,
    closeAuthModal,
    login,
    register,
    signInAsGuest,
    signInWithGoogle,
    resetPassword,
    checkUsername,
  } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'guest' | 'forgot'>('login');

  useEffect(() => {
    if (isAuthModalOpen) {
      setActiveTab(authModalTab || 'login');
    }
  }, [isAuthModalOpen, authModalTab]);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<{
    checking: boolean;
    available?: boolean;
    error?: string;
  }>({ checking: false });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Debounced username availability checking
  useEffect(() => {
    if (activeTab !== 'register' || !username.trim()) {
      setUsernameStatus({ checking: false });
      return;
    }

    const timer = setTimeout(async () => {
      setUsernameStatus({ checking: true });
      const result = await checkUsername(username);
      setUsernameStatus({
        checking: false,
        available: result.available,
        error: result.error,
      });
    }, 400);

    return () => clearTimeout(timer);
  }, [username, activeTab, checkUsername]);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setUsername('');
    setAuthError(null);
    setUsernameStatus({ checking: false });
  };

  const handleClose = () => {
    resetForm();
    closeAuthModal();
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!email.trim() || !password) {
      setAuthError('Please inscribe both email and secret phrase.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
      showToast('Welcome back to the Citadel, hunter.', 'success', 'Gates Opened');
      handleClose();
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Invalid credentials provided.';
      if (msg.includes('operation-not-allowed')) {
        setAuthError('Email/Password authentication is not yet enabled in Firebase Console (Authentication → Sign-in method → Email/Password → Enable). Use the "Guest (Instant)" tab to enter immediately!');
      } else if (msg.includes('user-not-found') || msg.includes('wrong-password') || msg.includes('invalid-credential')) {
        setAuthError('No record found matching this email and passphrase.');
      } else {
        setAuthError(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!username.trim()) {
      setAuthError('A unique hunter moniker is required.');
      return;
    }
    if (usernameStatus.error || usernameStatus.available === false) {
      setAuthError(usernameStatus.error || 'Moniker is unavailable.');
      return;
    }
    if (!email.trim()) {
      setAuthError('A valid email dispatch address is required.');
      return;
    }
    if (password.length < 6) {
      setAuthError('Secret passphrase must be at least 6 characters in length.');
      return;
    }
    if (password !== confirmPassword) {
      setAuthError('The passphrases do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await register(email.trim(), password, username.trim());
      showToast('Your name has been inscribed in the Great Ledger of Hunters.', 'success', 'Registry Sealed');
      handleClose();
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Registration failed.';
      if (msg.includes('operation-not-allowed')) {
        setAuthError('Email/Password authentication is not yet enabled in Firebase Console (Authentication → Sign-in method → Email/Password → Enable). Use the "Guest (Instant)" tab to enter immediately!');
      } else if (msg.includes('email-already-in-use')) {
        setAuthError('A hunter with this email is already inscribed.');
      } else {
        setAuthError(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const guestMoniker = username.trim() || `Hunter_${Math.floor(100 + Math.random() * 900)}`;
    if (username.trim()) {
      const val = validateUsername(username.trim());
      if (!val.valid) {
        setAuthError(val.error || 'Invalid moniker format.');
        return;
      }
      if (usernameStatus.available === false || usernameStatus.error) {
        setAuthError(usernameStatus.error || 'Moniker is unavailable.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await signInAsGuest(guestMoniker);
      showToast(`Inscribed in the Great Ledger as ${guestMoniker}!`, 'success', 'Gates Opened');
      handleClose();
    } catch (err: unknown) {
      console.error(err);
      setAuthError(err instanceof Error ? err.message : 'Guest inscription failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!email.trim()) {
      setAuthError('Please inscribe your email dispatch address.');
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword(email.trim());
      showToast('A recovery seal has been dispatched to your email.', 'info', 'Epistle Sent');
      setActiveTab('login');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not dispatch recovery.';
      setAuthError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    setAuthError(null);
    try {
      await signInWithGoogle();
      showToast('Authenticated via Imperial Seal.', 'success', 'Gates Opened');
      handleClose();
    } catch (err: unknown) {
      console.error(err);
      setAuthError(err instanceof Error ? err.message : 'Google authentication failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ManuscriptModal
      isOpen={isAuthModalOpen}
      onClose={handleClose}
      title={
        activeTab === 'login'
          ? 'Enter the Citadel'
          : activeTab === 'register'
          ? 'Inscribe New Hunter'
          : activeTab === 'guest'
          ? 'Instant Guest Inscription'
          : 'Recover Your Seal'
      }
      subtitle="Identity & Registry of The Fugitive"
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <BookTabs
          activeTab={activeTab}
          onChange={(tab) => {
            setAuthError(null);
            setActiveTab(tab as 'login' | 'register' | 'guest' | 'forgot');
          }}
          tabs={[
            { id: 'register', label: 'Inscribe (Register)' },
            { id: 'login', label: 'Enter Citadel' },
            { id: 'guest', label: 'Guest (Instant)' },
            { id: 'forgot', label: 'Recover' },
          ]}
        />

        {/* Error Proclamation */}
        {authError && (
          <div className="p-3 bg-red-950/15 border border-red-800 text-red-950 rounded text-xs font-serif flex items-start gap-2 shadow-xs">
            <AlertCircle className="w-4 h-4 text-red-800 flex-shrink-0 mt-0.5" />
            <span className="font-semibold">{authError}</span>
          </div>
        )}

        {/* TAB 1: LOGIN */}
        {activeTab === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-3">
            <ManuscriptInput
              label="Email Dispatch"
              type="email"
              placeholder="hunter@citadel.realm"
              icon={<Mail className="w-4 h-4" />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <ManuscriptInput
              label="Secret Passphrase"
              type="password"
              placeholder="••••••••"
              icon={<KeyRound className="w-4 h-4" />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setActiveTab('forgot')}
                className="text-xs font-serif text-manuscript-burgundy hover:underline"
              >
                Forgot your secret passphrase?
              </button>
            </div>

            <Button
              type="submit"
              variant="wax"
              className="w-full mt-2"
              loading={isSubmitting}
            >
              Enter the Citadel
            </Button>
          </form>
        )}

        {/* TAB 2: REGISTER */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3">
            <div>
              <ManuscriptInput
                label="Unique Hunter Moniker (Username)"
                placeholder="e.g. Iron_Inquisitor"
                icon={<User className="w-4 h-4" />}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={20}
                required
              />
              <div className="text-[11px] font-serif mt-1 flex items-center justify-between">
                <span className="text-ink-light">3-20 letters, numbers, underscores</span>
                {usernameStatus.checking ? (
                  <span className="text-manuscript-gold italic">Consulting registry...</span>
                ) : usernameStatus.available ? (
                  <span className="text-emerald-800 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Moniker Available
                  </span>
                ) : usernameStatus.error ? (
                  <span className="text-red-800 font-bold">{usernameStatus.error}</span>
                ) : null}
              </div>
            </div>

            <ManuscriptInput
              label="Email Dispatch"
              type="email"
              placeholder="hunter@citadel.realm"
              icon={<Mail className="w-4 h-4" />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <ManuscriptInput
              label="Secret Passphrase"
              type="password"
              placeholder="Minimum 6 characters"
              icon={<KeyRound className="w-4 h-4" />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <ManuscriptInput
              label="Confirm Passphrase"
              type="password"
              placeholder="Repeat secret passphrase"
              icon={<KeyRound className="w-4 h-4" />}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <Button
              type="submit"
              variant="wax"
              className="w-full mt-2"
              loading={isSubmitting}
              disabled={usernameStatus.available === false || usernameStatus.checking}
            >
              Inscribe in Great Ledger
            </Button>
          </form>
        )}

        {/* TAB 3: GUEST (INSTANT ENTRY) */}
        {activeTab === 'guest' && (
          <form onSubmit={handleGuestSubmit} className="space-y-3">
            <div className="p-3 bg-parchment-200 border border-parchment-400 rounded text-xs font-body text-ink-light space-y-1">
              <div className="font-serif font-bold text-ink flex items-center gap-1.5 text-manuscript-forest">
                <Sparkles className="w-4 h-4 text-manuscript-gold" />
                Frictionless Anonymous Inscription
              </div>
              <p>
                Enter the realm immediately as an anonymous hunter. Perfect for quick testing and private multiplayer rounds with friends.
              </p>
            </div>

            <div>
              <ManuscriptInput
                label="Hunter Moniker (Username)"
                placeholder="e.g. Iron_Sentinel"
                icon={<User className="w-4 h-4" />}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={20}
              />
              <div className="text-[11px] font-serif mt-1 flex items-center justify-between">
                <span className="text-ink-light">Leave blank for automatic hunter title</span>
                {usernameStatus.checking ? (
                  <span className="text-manuscript-gold italic">Consulting registry...</span>
                ) : usernameStatus.available ? (
                  <span className="text-emerald-800 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Moniker Available
                  </span>
                ) : usernameStatus.error ? (
                  <span className="text-red-800 font-bold">{usernameStatus.error}</span>
                ) : null}
              </div>
            </div>

            <Button
              type="submit"
              variant="wax"
              className="w-full mt-2"
              loading={isSubmitting}
              disabled={username.trim().length > 0 && (usernameStatus.available === false || usernameStatus.checking)}
            >
              Enter Citadel as Guest Hunter
            </Button>
          </form>
        )}

        {/* TAB 4: FORGOT PASSWORD */}
        {activeTab === 'forgot' && (
          <form onSubmit={handleForgotSubmit} className="space-y-3">
            <p className="text-xs font-body text-ink-light leading-relaxed">
              Inscribe your registered email dispatch. An authoritative raven bearing password reset instructions will be sent.
            </p>

            <ManuscriptInput
              label="Email Dispatch"
              type="email"
              placeholder="hunter@citadel.realm"
              icon={<Mail className="w-4 h-4" />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Button
              type="submit"
              variant="parchment"
              className="w-full mt-2"
              loading={isSubmitting}
            >
              Dispatch Recovery Epistle
            </Button>
          </form>
        )}

        {/* Optional Google Authentication Divider */}
        <div className="relative flex items-center justify-center my-4">
          <div className="w-full border-t border-parchment-400" />
          <span className="relative bg-parchment-100 px-3 text-[10px] font-serif uppercase tracking-widest text-ink-light">
            Or By Imperial Seal
          </span>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full text-xs font-serif"
          icon={<Shield className="w-4 h-4 text-manuscript-gold" />}
          onClick={handleGoogleSignIn}
          disabled={isSubmitting}
        >
          Sign In with Imperial Seal (Google)
        </Button>
      </div>
    </ManuscriptModal>
  );
};

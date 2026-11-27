import React, { useState, useEffect } from 'react';
import { ManuscriptModal } from '../ui/Modal';
import { ManuscriptInput } from '../ui/Input';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { STANDARD_AVATARS } from '../../types/player';
import { User, CheckCircle2, AlertCircle } from 'lucide-react';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose }) => {
  const { profile, updateProfileData, checkUsername } = useAuth();
  const { showToast } = useToast();

  const [username, setUsername] = useState(profile?.username || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [selectedAvatar, setSelectedAvatar] = useState(profile?.avatarId || 'avatar_inquisitor');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [usernameStatus, setUsernameStatus] = useState<{
    checking: boolean;
    available?: boolean;
    error?: string;
  }>({ checking: false });

  useEffect(() => {
    if (profile) {
      setUsername(profile.username);
      setBio(profile.bio || '');
      setSelectedAvatar(profile.avatarId || 'avatar_inquisitor');
    }
  }, [profile, isOpen]);

  // Debounced check if username changed
  useEffect(() => {
    if (!profile || username.trim() === profile.username) {
      setUsernameStatus({ checking: false, available: true });
      return;
    }

    if (!username.trim()) {
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
  }, [username, profile, checkUsername]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (usernameStatus.available === false || usernameStatus.error) {
      setError(usernameStatus.error || 'Chosen moniker is not available.');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateProfileData({
        username: username.trim(),
        avatarId: selectedAvatar,
        bio: bio.trim(),
      });
      showToast('Your dossier has been updated in the Citadel Registry.', 'success', 'Dossier Sealed');
      onClose();
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Could not save modifications.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ManuscriptModal
      isOpen={isOpen}
      onClose={onClose}
      title="Modify Hunter Dossier"
      subtitle="Update permitted records in the Great Ledger"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="wax"
            size="sm"
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={usernameStatus.available === false || usernameStatus.checking}
          >
            Save Modifications
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-950/15 border border-red-800 text-red-950 rounded text-xs font-serif flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-800 flex-shrink-0 mt-0.5" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {/* Username */}
        <div>
          <ManuscriptInput
            label="Hunter Moniker (Username)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            icon={<User className="w-4 h-4" />}
            maxLength={20}
            required
          />
          {username !== profile?.username && (
            <div className="text-[11px] font-serif mt-1 flex items-center justify-between">
              <span className="text-ink-light">Altering name transfers ownership of old seal.</span>
              {usernameStatus.checking ? (
                <span className="text-manuscript-gold italic">Checking availability...</span>
              ) : usernameStatus.available ? (
                <span className="text-emerald-800 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Moniker Available
                </span>
              ) : usernameStatus.error ? (
                <span className="text-red-800 font-bold">{usernameStatus.error}</span>
              ) : null}
            </div>
          )}
        </div>

        {/* Avatar Selection */}
        <div>
          <label className="block text-xs font-serif font-bold text-ink uppercase tracking-wider mb-1.5">
            Select Portrait Emblem
          </label>
          <div className="grid grid-cols-4 gap-2">
            {STANDARD_AVATARS.map((av) => (
              <button
                type="button"
                key={av.id}
                onClick={() => setSelectedAvatar(av.id)}
                className={`p-2 rounded border text-center transition-all ${
                  selectedAvatar === av.id
                    ? 'bg-amber-100 border-2 border-manuscript-gold shadow-sm scale-102 ring-1 ring-manuscript-gold'
                    : 'bg-parchment-50 border-parchment-400 hover:bg-parchment-200'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-parchment-300 border border-parchment-600 mx-auto flex items-center justify-center font-serif font-black text-xs text-ink mb-1">
                  {av.name[0]}
                </div>
                <span className="text-[10px] font-serif font-semibold text-ink block truncate">
                  {av.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Bio / Motto */}
        <div>
          <label className="block text-xs font-serif font-bold text-ink uppercase tracking-wider mb-1">
            Personal Creed / Motto
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={140}
            rows={3}
            className="w-full bg-parchment-50 border border-parchment-500 rounded px-3 py-2 text-sm text-ink font-body focus:outline-none focus:ring-2 focus:ring-manuscript-gold shadow-inner"
            placeholder="Inscribe a personal maxim or investigator motto..."
          />
          <div className="text-[10px] text-ink-light text-right font-mono">
            {bio.length} / 140
          </div>
        </div>
      </form>
    </ManuscriptModal>
  );
};

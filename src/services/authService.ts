import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
  signOut,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile as updateFirebaseProfile,
  User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  updateDoc,
  runTransaction,
} from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { PlayerProfile, createDefaultProfile } from '../types/player';
import { validateUsername, normalizeUsername, USERNAME_REGEX } from '../utils/usernameValidation';

export { validateUsername, normalizeUsername, USERNAME_REGEX };

/**
 * Checks if a normalized username is available in Cloud Firestore
 */
export async function checkUsernameAvailability(username: string): Promise<{ available: boolean; error?: string }> {
  const validation = validateUsername(username);
  if (!validation.valid) {
    return { available: false, error: validation.error };
  }

  const normalized = normalizeUsername(username);
  try {
    const userRef = doc(db, 'usernames', normalized);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return { available: false, error: 'This hunter moniker is already claimed by another.' };
    }
    return { available: true };
  } catch (err) {
    console.warn('Could not verify username uniqueness against Firestore:', err);
    return { available: true };
  }
}

/**
 * Registers a new player with email, password, and validated unique username
 */
export async function registerPlayer(
  email: string,
  pass: string,
  username: string
): Promise<{ user: User; profile: PlayerProfile }> {
  const validation = validateUsername(username);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const normalized = normalizeUsername(username);

  // Atomic check and user creation
  const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
  const user = userCredential.user;

  try {
    // Transactional reservation of unique normalized username
    await runTransaction(db, async (transaction) => {
      const usernameDocRef = doc(db, 'usernames', normalized);
      const usernameSnap = await transaction.get(usernameDocRef);

      if (usernameSnap.exists()) {
        throw new Error('This hunter moniker has just been claimed by another. Choose another.');
      }

      // Reserve username
      transaction.set(usernameDocRef, {
        uid: user.uid,
        username: username.trim(),
        createdAt: Date.now(),
      });

      // Inscribe full player profile
      const newProfile = createDefaultProfile(user.uid, user.email || email, username.trim());
      const profileDocRef = doc(db, 'users', user.uid);
      transaction.set(profileDocRef, newProfile);
    });

    // Update Firebase Auth Display Name
    await updateFirebaseProfile(user, {
      displayName: username.trim(),
    });

    const profileSnap = await getDoc(doc(db, 'users', user.uid));
    const profile = profileSnap.data() as PlayerProfile;
    return { user, profile };
  } catch (err: unknown) {
    console.error('Registration profile transaction error:', err);
    throw err;
  }
}

/**
 * Logs in player with email & password
 */
export async function loginPlayer(email: string, pass: string): Promise<User> {
  const userCredential = await signInWithEmailAndPassword(auth, email, pass);
  const user = userCredential.user;

  try {
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, {
      lastLoginAt: Date.now(),
    });
  } catch (e) {
    console.warn('Could not update lastLoginAt timestamp:', e);
  }

  return user;
}

/**
 * Signs in anonymously as a Guest Hunter with a validated unique username
 */
export async function loginAnonymously(username: string): Promise<{ user: User; profile: PlayerProfile }> {
  const validation = validateUsername(username);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const normalized = normalizeUsername(username);
  const userCredential = await signInAnonymously(auth);
  const user = userCredential.user;

  try {
    await runTransaction(db, async (transaction) => {
      const usernameDocRef = doc(db, 'usernames', normalized);
      const usernameSnap = await transaction.get(usernameDocRef);

      if (usernameSnap.exists()) {
        throw new Error('This hunter moniker has just been claimed by another. Choose another.');
      }

      transaction.set(usernameDocRef, {
        uid: user.uid,
        username: username.trim(),
        createdAt: Date.now(),
      });

      const newProfile = createDefaultProfile(user.uid, `guest_${user.uid.slice(0, 6)}@citadel.local`, username.trim());
      const profileDocRef = doc(db, 'users', user.uid);
      transaction.set(profileDocRef, newProfile);
    });

    await updateFirebaseProfile(user, {
      displayName: username.trim(),
    });

    const profileSnap = await getDoc(doc(db, 'users', user.uid));
    const profile = profileSnap.data() as PlayerProfile;
    return { user, profile };
  } catch (err) {
    console.error('Anonymous guest registration error:', err);
    throw err;
  }
}

/**
 * Signs in using Google Auth provider (Optional provider)
 */
export async function loginWithGoogle(): Promise<{ user: User; profile: PlayerProfile }> {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  const user = result.user;

  const profileRef = doc(db, 'users', user.uid);
  const profileSnap = await getDoc(profileRef);

  if (!profileSnap.exists()) {
    // Inscribe default profile with unique generated name
    const rawName = user.displayName?.replace(/[^a-zA-Z0-9_]/g, '_') || 'Hunter';
    let chosenName = rawName.slice(0, 14);
    let chosenNormalized = normalizeUsername(chosenName);

    // Check collision and append random digits if necessary
    const existingNameSnap = await getDoc(doc(db, 'usernames', chosenNormalized));
    if (existingNameSnap.exists()) {
      const suffix = Math.floor(1000 + Math.random() * 9000);
      chosenName = `${chosenName.slice(0, 10)}_${suffix}`;
      chosenNormalized = normalizeUsername(chosenName);
    }

    const defaultProfile = createDefaultProfile(user.uid, user.email || '', chosenName);

    await runTransaction(db, async (transaction) => {
      transaction.set(doc(db, 'usernames', chosenNormalized), {
        uid: user.uid,
        username: chosenName,
        createdAt: Date.now(),
      });
      transaction.set(profileRef, defaultProfile);
    });

    return { user, profile: defaultProfile };
  }

  // Update last login
  await updateDoc(profileRef, {
    lastLoginAt: Date.now(),
  });

  return { user, profile: profileSnap.data() as PlayerProfile };
}

/**
 * Logs out the current player
 */
export async function logoutPlayer(): Promise<void> {
  await signOut(auth);
}

/**
 * Sends password recovery epistle
 */
export async function sendPasswordRecovery(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

/**
 * Retrieves the profile of a player from Cloud Firestore
 */
export async function fetchPlayerProfile(uid: string): Promise<PlayerProfile | null> {
  try {
    const profileRef = doc(db, 'users', uid);
    const snap = await getDoc(profileRef);
    if (!snap.exists()) {
      return null;
    }
    return snap.data() as PlayerProfile;
  } catch (err) {
    console.error('Error fetching player profile from Firestore:', err);
    return null;
  }
}

/**
 * Updates permitted profile fields (username, avatar, bio, equipped cosmetics)
 * Strictly guards progression fields (coins, xp, level, stats) from client tampering
 */
export async function updatePermittedProfile(
  uid: string,
  currentNormalized: string,
  updates: {
    username?: string;
    avatarId?: string;
    bio?: string;
    equippedCosmetics?: PlayerProfile['equippedCosmetics'];
  }
): Promise<void> {
  const profileRef = doc(db, 'users', uid);

  // If changing username, atomic reservation swap is required
  if (updates.username && normalizeUsername(updates.username) !== currentNormalized) {
    const validation = validateUsername(updates.username);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    const newNormalized = normalizeUsername(updates.username);

    await runTransaction(db, async (transaction) => {
      const newNameRef = doc(db, 'usernames', newNormalized);
      const newNameSnap = await transaction.get(newNameRef);

      if (newNameSnap.exists()) {
        throw new Error('This hunter moniker is already claimed by another.');
      }

      // Claim new name
      transaction.set(newNameRef, {
        uid,
        username: updates.username!.trim(),
        createdAt: Date.now(),
      });

      // Release old name
      if (currentNormalized) {
        transaction.delete(doc(db, 'usernames', currentNormalized));
      }

      // Update user document
      transaction.update(profileRef, {
        username: updates.username!.trim(),
        normalizedUsername: newNormalized,
        ...(updates.avatarId && { avatarId: updates.avatarId }),
        ...(updates.bio !== undefined && { bio: updates.bio }),
        ...(updates.equippedCosmetics && { equippedCosmetics: updates.equippedCosmetics }),
        updatedAt: Date.now(),
      });
    });

    if (auth.currentUser) {
      await updateFirebaseProfile(auth.currentUser, {
        displayName: updates.username.trim(),
      });
    }
    return;
  }

  // Update only allowed fields
  const safePayload: Record<string, any> = {
    updatedAt: Date.now(),
  };
  if (updates.avatarId) safePayload.avatarId = updates.avatarId;
  if (updates.bio !== undefined) safePayload.bio = updates.bio;
  if (updates.equippedCosmetics) safePayload.equippedCosmetics = updates.equippedCosmetics;

  await updateDoc(profileRef, safePayload);
}

# Deployment & Production Preparation Guide — The Fugitive

## 1. Prerequisites
- Node.js 20+ and npm
- Firebase CLI (`npm install -g firebase-tools`)
- Authenticated Firebase CLI session (`firebase login`)

## 2. Firebase Project Setup
1. Select or create your Firebase project (`the-fugitive-6aeea` by default).
2. Enable **Authentication**:
   - Enable **Email/Password** provider in Firebase Console -> Authentication -> Sign-in method.
   - Add your production domain to **Authorized domains**.
3. Enable **Cloud Firestore**:
   - Create Firestore database in production mode.
   - Ensure composite indexes are created if prompted by Firestore console errors (e.g. `users/{uid}/matchHistory` ordered by `date desc`).
4. Enable **Firebase App Check** (Recommended):
   - Register your web app with **reCAPTCHA v3** in Firebase Console -> App Check.
   - Copy the reCAPTCHA v3 **Site Key** into `.env.local` as `VITE_FIREBASE_APP_CHECK_SITE_KEY`.
   - Enforce App Check on Firestore and Authentication once verified.

## 3. Environment Variables & Secrets Management
- Copy `.env.example` to `.env.local` for local or CI builds.
- Never commit `.env.local` or service-account JSON keys to version control.
- `VITE_FIREBASE_*` keys are public client identifiers; true secrets (such as future Cloud Functions HMAC secrets or admin keys) must be stored in **Google Cloud Secret Manager** (`firebase functions:secrets:set`).

## 4. Build & Deploy Commands
```bash
# 1. Install dependencies
npm ci

# 2. Run all verification suites (Phases 2-11)
for f in scripts/test-phase*.js; do node "$f"; done

# 3. TypeScript check & production Vite PWA bundle
npm run build

# 4. Deploy Firestore Security Rules
firebase deploy --only firestore:rules

# 5. Deploy Hosting (dist/)
firebase deploy --only hosting
```

## 5. Cloud Functions Status & Required IAM Permissions
- **Current Beta Architecture**: No `functions/` directory is deployed yet; match initialization, phase transitions, economy purchases, daily claims, and progression claims run inside authenticated Firestore `runTransaction` calls guarded by `firestore.rules`.
- **Upgrading to Cloud Functions (Recommended for Public Launch)**:
  - Initialize `firebase init functions` (TypeScript, Node 20).
  - Move `matchInitService`, `matchActionService`, `progressionService`, `shopService`, and `dailyRewardService` into HTTPS Callable Cloud Functions so `rooms/{roomId}` and `users/{uid}` protected fields can be locked down to `allow write: if false` for clients.
  - Required deployer IAM roles: **Firebase Admin** (or **Cloud Functions Admin**, **Firestore Rules Admin**, **Firebase Hosting Admin**).

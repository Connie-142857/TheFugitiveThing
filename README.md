# Firebase Project Configuration & Setup Guide

This document contains the project credentials and setup instructions for an AI agent or developer to connect and interact with the configured Firebase project.

---

## 1. Project Credentials

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyAftf72GCs5HLimScDekNp_yj_RsnuVUsU",
  authDomain: "the-fugitive-6aeea.firebaseapp.com",
  databaseURL: "https://the-fugitive-6aeea-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "the-fugitive-6aeea",
  storageBucket: "the-fugitive-6aeea.firebasestorage.app",
  messagingSenderId: "587069936597",
  appId: "1:587069936597:web:daf93c7453b7e4c170235c",
  measurementId: "G-DY6103PYYN"
};
```

---

## 2. Configured Firebase Services & Region

- **Project ID**: `the-fugitive-6aeea`
- **Cloud Firestore**:
  - Location: `eur3` (`europe-west`)
  - Status: Active (`(default)` database created)
- **Realtime Database**:
  - Location: `europe-west1`
  - URL: `https://the-fugitive-6aeea-default-rtdb.europe-west1.firebasedatabase.app`
- **Authentication**:
  - Recommended provider: Anonymous auth enabled for frictionless client sessions

---

## 3. Installation

To install the Firebase SDK in a Node.js / web application:

```bash
npm install firebase
```

---

## 4. Initialization Snippet (Modular SDK v9 / v10+)

```javascript
// firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAftf72GCs5HLimScDekNp_yj_RsnuVUsU",
  authDomain: "the-fugitive-6aeea.firebaseapp.com",
  databaseURL: "https://the-fugitive-6aeea-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "the-fugitive-6aeea",
  storageBucket: "the-fugitive-6aeea.firebasestorage.app",
  messagingSenderId: "587069936597",
  appId: "1:587069936597:web:daf93c7453b7e4c170235c",
  measurementId: "G-DY6103PYYN"
};

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore (Primary Database)
export const db = getFirestore(app);

// Initialize Authentication
export const auth = getAuth(app);

// Initialize Realtime Database (if needed)
export const realtimeDb = getDatabase(app);

// Helper for quick anonymous authentication
export async function authenticateUser() {
  try {
    const userCredential = await signInAnonymously(auth);
    return userCredential.user;
  } catch (error) {
    console.error("Firebase auth error:", error);
    throw error;
  }
}
```

---

## 5. Security Rules Note

- Ensure appropriate security rules are deployed in Firebase Console or via Firebase CLI (`firebase.json`, `firestore.rules`).
- During initial development / testing mode:
  ```
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /{document=**} {
        allow read, write: if request.auth != null;
      }
    }
  }
  ```

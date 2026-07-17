import type { FirebaseOptions } from 'firebase/app';

/**
 * Paste your Firebase web app config here to enable cloud sync + Google sign-in.
 * While this is null the app runs in LOCAL MODE (everything saved in this browser only).
 *
 * Firebase console -> Project settings -> Your apps -> SDK setup and configuration.
 * Example:
 *
 * export const firebaseConfig: FirebaseOptions | null = {
 *   apiKey: '...',
 *   authDomain: 'your-project.firebaseapp.com',
 *   projectId: 'your-project',
 *   storageBucket: 'your-project.appspot.com',
 *   messagingSenderId: '...',
 *   appId: '...'
 * };
 */
export const firebaseConfig: FirebaseOptions | null = null;

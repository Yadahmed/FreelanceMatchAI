import admin from 'firebase-admin';

// Initialize Firebase Admin SDK if environment variables are provided
let app: admin.app.App | undefined;

try {
  if (process.env.VITE_FIREBASE_PROJECT_ID) {
    const firebaseConfig = {
      projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    };
    
    // For local development, use a service account if provided
    if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      // Add credential data if available
      Object.assign(firebaseConfig, {
        credential: admin.credential.cert({
          projectId: process.env.VITE_FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
        })
      });
    }
    
    // Check if Firebase Admin is already initialized
    try {
      app = admin.app();
    } catch (e) {
      // Not initialized yet, so initialize it
      app = admin.initializeApp(firebaseConfig);
    }
    
    console.log('Firebase Admin SDK initialized successfully');
  } else {
    console.warn('Firebase credentials not provided, authentication will be limited');
  }
} catch (error) {
  console.error('Error initializing Firebase Admin:', error);
}

export const auth = app ? app.auth() : null;
export default app;
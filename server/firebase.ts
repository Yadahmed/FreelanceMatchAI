import admin from 'firebase-admin';

// Initialize Firebase Admin SDK if environment variables are provided
let app: admin.app.App | undefined;

// Function to properly format the private key
const formatPrivateKey = (key: string | undefined): string | undefined => {
  if (!key) return undefined;
  
  // Handle various formats of private keys in environment variables
  if (key.includes('\\n')) {
    return key.replace(/\\n/g, '\n');
  } else if (!key.includes('-----BEGIN PRIVATE KEY-----')) {
    // If key doesn't have the proper formatting, it might be missing newlines
    if (!key.startsWith('"') && !key.endsWith('"')) {
      // Add quotes if they're missing (common in some environment variable systems)
      key = `"${key}"`;
    }
    try {
      // Try to parse it as JSON in case it's a JSON-escaped string
      return JSON.parse(key);
    } catch (e) {
      // If parsing fails, return as is
      return key;
    }
  }
  
  return key;
};

try {
  if (process.env.VITE_FIREBASE_PROJECT_ID) {
    const firebaseConfig: admin.AppOptions = {
      projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    };
    
    // For local development, use a service account if provided
    if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      // Format the private key properly
      const privateKey = formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY);
      
      if (!privateKey) {
        throw new Error('Firebase private key is invalid or improperly formatted');
      }
      
      // Check if the private key has the proper PEM format
      if (!privateKey.includes('-----BEGIN PRIVATE KEY-----') || !privateKey.includes('-----END PRIVATE KEY-----')) {
        console.warn('WARNING: Firebase private key does not appear to have the correct PEM format');
        console.warn('Private key should include both BEGIN and END markers');
      }
      
      console.log('Creating Firebase Admin with service account credentials');
      console.log(`Client email: ${process.env.FIREBASE_CLIENT_EMAIL}`);
      console.log(`Private key length: ${privateKey.length} characters`);
      console.log(`Private key valid format: ${privateKey.includes('-----BEGIN PRIVATE KEY-----')}`);
      
      // Print just the first part of the key for debugging (avoid logging the full key)
      const keyPreview = privateKey.substring(0, 40) + '...';
      console.log(`Private key preview: ${keyPreview}`);
      
      // Build the credential object
      Object.assign(firebaseConfig, {
        credential: admin.credential.cert({
          projectId: process.env.VITE_FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey
        })
      });
    } else {
      console.warn('Firebase service account credentials missing, using app credentials only');
    }
    
    // Check if Firebase Admin is already initialized
    try {
      app = admin.app();
      console.log('Using existing Firebase Admin app instance');
    } catch (e) {
      // Not initialized yet, so initialize it
      console.log('Initializing new Firebase Admin app instance');
      app = admin.initializeApp(firebaseConfig);
    }
    
    // Verify authentication functionality
    if (app) {
      try {
        // Test auth instance
        const auth = app.auth();
        console.log('Firebase Admin SDK initialized successfully with auth capabilities');
      } catch (authError) {
        console.error('Firebase Admin SDK initialized but auth is not working:', authError);
      }
    }
  } else {
    console.warn('Firebase credentials not provided, authentication will be limited');
  }
} catch (error) {
  console.error('Error initializing Firebase Admin:', error);
  if (error instanceof Error) {
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

export const auth = app ? app.auth() : null;
export default app;
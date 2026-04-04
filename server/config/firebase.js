const admin = require('firebase-admin');

let firebaseApp = null;

/**
 * Initialize Firebase Admin SDK
 * Supports both service account file and environment variables
 */
function initializeFirebase() {
  if (firebaseApp) {
    return firebaseApp;
  }

  try {
    // Check if Firebase is already initialized
    if (admin.apps.length > 0) {
      firebaseApp = admin.apps[0];
      return firebaseApp;
    }

    // Option 1: Use service account file
    if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('Firebase initialized with service account file');
      return firebaseApp;
    }

    // Option 2: Use environment variables
    if (process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_PRIVATE_KEY &&
        process.env.FIREBASE_CLIENT_EMAIL) {

      const serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL
      };

      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('Firebase initialized with environment variables');
      return firebaseApp;
    }

    console.log('Firebase not configured - push notifications will be disabled');
    return null;

  } catch (error) {
    console.error('Firebase initialization error:', error.message);
    return null;
  }
}

/**
 * Get Firebase Messaging instance
 */
function getMessaging() {
  const app = initializeFirebase();
  if (!app) {
    return null;
  }
  return admin.messaging();
}

/**
 * Send push notification via FCM
 * @param {string} token - FCM device token
 * @param {object} notification - { title, body }
 * @param {object} data - Additional data payload
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
async function sendFCMNotification(token, { title, body }, data = {}) {
  const messaging = getMessaging();

  if (!messaging) {
    console.log('FCM not configured, skipping push notification');
    return { success: false, error: 'FCM not configured' };
  }

  if (!token) {
    return { success: false, error: 'No FCM token provided' };
  }

  try {
    const message = {
      token,
      notification: {
        title,
        body
      },
      data: {
        ...data,
        // Ensure all data values are strings (FCM requirement)
        ...Object.fromEntries(
          Object.entries(data).map(([k, v]) => [k, String(v)])
        )
      },
      // Android specific configuration
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          clickAction: 'FLUTTER_NOTIFICATION_CLICK',
          channelId: 'mediflow_notifications'
        }
      },
      // iOS specific configuration
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            contentAvailable: true
          }
        }
      },
      // Web push configuration
      webpush: {
        notification: {
          icon: '/logo192.png',
          badge: '/badge.png',
          vibrate: [200, 100, 200]
        },
        fcmOptions: {
          link: data.link || '/'
        }
      }
    };

    const response = await messaging.send(message);
    console.log('FCM notification sent successfully:', response);

    return {
      success: true,
      messageId: response
    };

  } catch (error) {
    console.error('FCM send error:', error.code, error.message);

    // Handle specific FCM errors
    if (error.code === 'messaging/invalid-registration-token' ||
        error.code === 'messaging/registration-token-not-registered') {
      return {
        success: false,
        error: 'Invalid token',
        shouldRemoveToken: true
      };
    }

    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Send push notification to multiple devices
 * @param {string[]} tokens - Array of FCM tokens
 * @param {object} notification - { title, body }
 * @param {object} data - Additional data payload
 * @returns {Promise<{success: boolean, successCount: number, failureCount: number, failedTokens: string[]}>}
 */
async function sendMulticastFCMNotification(tokens, { title, body }, data = {}) {
  const messaging = getMessaging();

  if (!messaging) {
    return { success: false, error: 'FCM not configured' };
  }

  if (!tokens || tokens.length === 0) {
    return { success: false, error: 'No tokens provided' };
  }

  // Filter out null/undefined tokens
  const validTokens = tokens.filter(t => t);

  if (validTokens.length === 0) {
    return { success: false, error: 'No valid tokens' };
  }

  try {
    const message = {
      tokens: validTokens,
      notification: {
        title,
        body
      },
      data: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      ),
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'mediflow_notifications'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      }
    };

    const response = await messaging.sendEachForMulticast(message);

    // Collect failed tokens for cleanup
    const failedTokens = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        failedTokens.push(validTokens[idx]);
      }
    });

    console.log(`FCM multicast: ${response.successCount} success, ${response.failureCount} failed`);

    return {
      success: response.successCount > 0,
      successCount: response.successCount,
      failureCount: response.failureCount,
      failedTokens
    };

  } catch (error) {
    console.error('FCM multicast error:', error.message);
    return {
      success: false,
      error: error.message,
      successCount: 0,
      failureCount: tokens.length,
      failedTokens: tokens
    };
  }
}

/**
 * Subscribe tokens to a topic for broadcast notifications
 * @param {string[]} tokens - FCM tokens
 * @param {string} topic - Topic name (e.g., 'hospital_123', 'all_patients')
 */
async function subscribeToTopic(tokens, topic) {
  const messaging = getMessaging();
  if (!messaging) return { success: false };

  try {
    const response = await messaging.subscribeToTopic(tokens, topic);
    return {
      success: true,
      successCount: response.successCount
    };
  } catch (error) {
    console.error('Topic subscription error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send notification to all subscribers of a topic
 * @param {string} topic - Topic name
 * @param {object} notification - { title, body }
 * @param {object} data - Additional data
 */
async function sendToTopic(topic, { title, body }, data = {}) {
  const messaging = getMessaging();
  if (!messaging) return { success: false, error: 'FCM not configured' };

  try {
    const message = {
      topic,
      notification: { title, body },
      data: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      ),
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'mediflow_notifications'
        }
      },
      apns: {
        payload: {
          aps: { sound: 'default' }
        }
      }
    };

    const response = await messaging.send(message);
    return { success: true, messageId: response };
  } catch (error) {
    console.error('Topic send error:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  initializeFirebase,
  getMessaging,
  sendFCMNotification,
  sendMulticastFCMNotification,
  subscribeToTopic,
  sendToTopic
};

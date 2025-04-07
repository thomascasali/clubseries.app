const admin = require('firebase-admin');
const logger = require('../config/logger');
const path = require('path');

// Inizializza l'app Firebase Admin con le credenziali
try {
  const serviceAccountPath = path.resolve(__dirname, '../config/clubseriesfinals-firebase-adminsdk.json');
  
  admin.initializeApp({
    credential: admin.credential.cert(require(serviceAccountPath))
  });
  
  logger.info('Firebase Admin initialized successfully');
} catch (error) {
  logger.error(`Firebase Admin initialization failed: ${error.message}`);
}

/**
 * Invia una notifica FCM a un singolo dispositivo
 * @param {string} token - Token FCM del dispositivo
 * @param {object} notification - Oggetto notifica con title e body
 * @param {object} data - Dati aggiuntivi per la notifica
 * @returns {Promise<string>} - Message ID della notifica inviata
 */
const sendToDevice = async (token, notification, data = {}) => {
  try {
    const message = {
      token,
      notification,
      data: convertToStringValues(data),
      android: {
        priority: 'high'
      },
      apns: {
        payload: {
          aps: {
            contentAvailable: true
          }
        },
        headers: {
          'apns-priority': '10'
        }
      },
      webpush: {
        headers: {
          Urgency: 'high'
        },
        notification: {
          title: notification.title,
          body: notification.body
        }
      }
    };

    const response = await admin.messaging().send(message);
    logger.info(`Notification sent to device ${token.substring(0, 10)}...`);
    return response;
  } catch (error) {
    logger.error(`Error sending notification to device: ${error.message}`);
    throw error;
  }
};

/**
 * Invia una notifica FCM a più dispositivi
 * @param {Array<string>} tokens - Array di token FCM
 * @param {object} notification - Oggetto notifica con title e body
 * @param {object} data - Dati aggiuntivi per la notifica
 * @returns {Promise<object>} - Risultato dell'invio in massa
 */
const sendToDevices = async (tokens, notification, data = {}, userId = null) => {
  try {
    if (!tokens || tokens.length === 0) {
      logger.warn('No FCM tokens provided for sendToDevices');
      return { successCount: 0, failureCount: 0 };
    }

    // Invia le notifiche individualmente a ciascun token
    let successCount = 0;
    let failureCount = 0;
    const responses = [];
    const invalidTokens = [];

    // Converti i dati in stringhe una sola volta
    const stringData = convertToStringValues(data);
    
    // Invio sequenziale a ogni token
    for (const token of tokens) {
      try {
        const message = {
          token,
          notification,
          data: stringData,
          android: {
            priority: 'high'
          },
          apns: {
            payload: {
              aps: {
                contentAvailable: true
              }
            }
          },
          webpush: {
            headers: {
              Urgency: 'high'
            }
          }
        };

        const response = await admin.messaging().send(message);
        responses.push({ success: true, messageId: response });
        successCount++;
        logger.debug(`Sent notification to token: ${token.substring(0, 10)}...`);
      } catch (tokenError) {
        responses.push({ success: false, error: tokenError.message });
        failureCount++;
        
        // Controlla se il token è invalido
        if (tokenError.message.includes("Requested entity was not found") || 
            tokenError.code === 'messaging/invalid-registration-token' ||
            tokenError.code === 'messaging/registration-token-not-registered') {
          invalidTokens.push(token);
          logger.warn(`Invalid token detected: ${token.substring(0, 10)}...`);
        }
        
        logger.error(`Error sending to token ${token.substring(0, 10)}...: ${tokenError.message}`);
      }
    }

    // Se abbiamo un userId e ci sono token invalidi, li rimuoviamo dal database
    if (userId && invalidTokens.length > 0) {
      try {
        const User = require('../models/User');
        await User.findByIdAndUpdate(
          userId,
          { $pull: { fcmTokens: { $in: invalidTokens } } },
          { new: true }
        );
        logger.info(`Removed ${invalidTokens.length} invalid tokens for user ${userId}`);
      } catch (cleanupError) {
        logger.error(`Error removing invalid tokens: ${cleanupError.message}`);
      }
    }

    logger.info(`Sent notifications to ${successCount} devices, failed: ${failureCount}`);
    return { successCount, failureCount, responses, invalidTokens };
  } catch (error) {
    logger.error(`Error sending notifications to devices: ${error.message}`, { stack: error.stack });
    throw error;
  }
};

/**
 * Funzione di supporto per inviare a un chunk di token
 * @private
 */
const sendChunkToDevices = async (tokens, notification, data = {}) => {
  // Crea un singolo oggetto MulticastMessage
  const message = {
    tokens: tokens, 
    notification: notification,
    data: convertToStringValues(data),
    android: {
      priority: 'high'
    },
    apns: {
      payload: {
        aps: {
          'content-available': 1 
        }
      },
      headers: {
        'apns-priority': '10'
      }
    },
    webpush: {
      headers: {
        Urgency: 'high'
      },
      notification: {
        title: notification.title,
        body: notification.body
      }
    }
  };

  const messaging = admin.messaging();
  const response = await messaging.sendMulticast(message);

  logger.info(`Sent multicast notification to ${tokens.length} tokens. Success: ${response.successCount}, Failure: ${response.failureCount}`);

  // Logga gli errori per i token falliti
  if (response.failureCount > 0) {
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        logger.error(`Failed to send to token ${tokens[idx].substring(0, 10)}... Error: ${resp.error ? resp.error.message : 'Unknown error'}`);
      }
    });
  }

  return response;
};

/**
 * Invia una notifica a un topic FCM
 * @param {string} topic - Nome del topic 
 * @param {object} notification - Oggetto notifica con title e body
 * @param {object} data - Dati aggiuntivi per la notifica
 * @returns {Promise<string>} - Message ID della notifica inviata
 */
const sendToTopic = async (topic, notification, data = {}) => {
  try {
    const message = {
      topic,
      notification,
      data: convertToStringValues(data),
      android: {
        priority: 'high'
      },
      apns: {
        payload: {
          aps: {
            contentAvailable: true
          }
        },
        headers: {
          'apns-priority': '10'
        }
      },
      webpush: {
        headers: {
          Urgency: 'high'
        },
        notification: {
          title: notification.title,
          body: notification.body
        }
      }
    };

    const response = await admin.messaging().send(message);
    logger.info(`Notification sent to topic ${topic}`);
    return response;
  } catch (error) {
    logger.error(`Error sending notification to topic: ${error.message}`);
    throw error;
  }
};

/**
 * Iscrive token a un topic FCM
 * @param {string|Array<string>} tokens - Token o array di token da iscrivere
 * @param {string} topic - Nome del topic
 * @returns {Promise<object>} - Risultato dell'operazione
 */
const subscribeToTopic = async (tokens, topic) => {
  try {
    // Assicurati che tokens sia un array
    const tokenArray = Array.isArray(tokens) ? tokens : [tokens];
    
    const response = await admin.messaging().subscribeToTopic(tokenArray, topic);
    logger.info(`${response.successCount} tokens subscribed to topic ${topic}`);
    return response;
  } catch (error) {
    logger.error(`Error subscribing to topic: ${error.message}`);
    throw error;
  }
};

/**
 * Cancella iscrizione di token da un topic FCM
 * @param {string|Array<string>} tokens - Token o array di token da disiscrivere
 * @param {string} topic - Nome del topic
 * @returns {Promise<object>} - Risultato dell'operazione
 */
const unsubscribeFromTopic = async (tokens, topic) => {
  try {
    // Assicurati che tokens sia un array
    const tokenArray = Array.isArray(tokens) ? tokens : [tokens];
    
    const response = await admin.messaging().unsubscribeFromTopic(tokenArray, topic);
    logger.info(`${response.successCount} tokens unsubscribed from topic ${topic}`);
    return response;
  } catch (error) {
    logger.error(`Error unsubscribing from topic: ${error.message}`);
    throw error;
  }
};

/**
 * Converte tutti i valori di un oggetto in stringhe (richiesto da FCM)
 * @param {object} data - Oggetto con dati
 * @returns {object} - Oggetto con tutti i valori convertiti in stringhe
 */
const convertToStringValues = (data) => {
  if (!data) return {}; // Gestisce il caso in cui data sia null o undefined
  const result = {};
  Object.keys(data).forEach(key => {
    // Assicurati che il valore non sia null o undefined prima di convertirlo
    result[key] = data[key] === null || data[key] === undefined ? '' : String(data[key]);
  });
  return result;
};

module.exports = {
  sendToDevice,
  sendToDevices,
  subscribeToTopic,
  unsubscribeFromTopic,
  sendToTopic
};
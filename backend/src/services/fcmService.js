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
        }
      },
      webpush: {
        headers: {
          Urgency: 'high'
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
const sendToDevices = async (tokens, notification, data = {}) => {
  try {
    if (!tokens || tokens.length === 0) {
      logger.warn('No FCM tokens provided for sendToDevices');
      return { successCount: 0, failureCount: 0 };
    }

    const message = {
      tokens,
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
        }
      }
    };

    const response = await admin.messaging().sendMulticast(message);
    logger.info(`Sent notification to ${response.successCount} devices, failed: ${response.failureCount}`);
    return response;
  } catch (error) {
    logger.error(`Error sending notification to multiple devices: ${error.message}`);
    throw error;
  }
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
      data: convertToStringValues(data)
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
  const result = {};
  Object.keys(data).forEach(key => {
    result[key] = String(data[key]);
  });
  return result;
};

module.exports = {
  sendToDevice,
  sendToDevices,
  sendToTopic,
  subscribeToTopic,
  unsubscribeFromTopic
};
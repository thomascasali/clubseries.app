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
const sendToDevices = async (tokens, notification, data = {}) => {
  try {
    if (!tokens || tokens.length === 0) {
      logger.warn('No FCM tokens provided for sendToDevices');
      // Restituisce un oggetto simile a BatchResponse per coerenza
      return { successCount: 0, failureCount: 0, responses: [] };
    }

    // Gestione limite di 500 token per chiamata
    if (tokens.length > 500) {
      logger.warn(`Attempting to send to ${tokens.length} tokens, but the limit is 500 per call. Processing in chunks.`);
      
      // Dividi l'array dei token in chunk da 500
      const chunks = [];
      for (let i = 0; i < tokens.length; i += 500) {
        chunks.push(tokens.slice(i, i + 500));
      }
      
      // Traccia i risultati complessivi
      let totalSuccessCount = 0;
      let totalFailureCount = 0;
      let allResponses = [];
      
      // Invia a ogni chunk separatamente
      for (const chunk of chunks) {
        const chunkResponse = await sendChunkToDevices(chunk, notification, data);
        totalSuccessCount += chunkResponse.successCount;
        totalFailureCount += chunkResponse.failureCount;
        allResponses = allResponses.concat(chunkResponse.responses || []);
      }
      
      return {
        successCount: totalSuccessCount,
        failureCount: totalFailureCount,
        responses: allResponses
      };
    }
    
    // Se il numero di token è minore o uguale a 500, invia con una singola chiamata
    return await sendChunkToDevices(tokens, notification, data);
  } catch (error) {
    // Logga l'errore completo per il debug
    logger.error(`Error sending multicast notification: ${error.message}`, { stack: error.stack });
    // Rilancia l'errore per permettere al chiamante di gestirlo
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
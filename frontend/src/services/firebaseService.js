import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage, deleteToken } from "firebase/messaging";
import api from './api';

// Configurazione Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBbusGb9GtqbRbdasjmMCuDJ9IImkzgR4c",
  authDomain: "clubseriesfinals.firebaseapp.com",
  projectId: "clubseriesfinals",
  storageBucket: "clubseriesfinals.firebasestorage.app",
  messagingSenderId: "616223603086",
  appId: "1:616223603086:web:e075b03c92efb678444cdf",
  measurementId: "G-R3PPYD2ED8"
};

// Inizializza Firebase
const app = initializeApp(firebaseConfig);

// Ottieni istanza Messaging
let messaging;
try {
  messaging = getMessaging(app);
  console.log('Firebase Messaging initialized');
} catch (error) {
  console.error('Error initializing Firebase Messaging:', error);
}

// Callback per le notifiche in foreground
let onMessageCallback = null;

// Gestire messaggi in foreground (solo se il messaging è stato inizializzato)
if (messaging) {
  onMessage(messaging, (payload) => {
    console.log('Messaggio ricevuto in foreground:', payload);
    
    if (onMessageCallback) {
      onMessageCallback(payload);
    }
  });
}

/**
 * Richiede il permesso per le notifiche e registra il token FCM
 * @returns {Promise<string|null>} - Token FCM o null in caso di errore
 */
export const requestNotificationPermission = async () => {
  if (!messaging) {
    console.error('Firebase Messaging not initialized');
    return null;
  }

  try {
    console.log('Richiesta permesso notifiche...');
    
    // Richiedi permesso
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Permesso notifiche non concesso');
      return null;
    }
    
    try {
      // Ottieni token FCM
      const token = await getToken(messaging, {
        vapidKey: 'BODRY8fDnAtp52kFmmY5zeYpaEB1eRuW1salcgoI8mQuAd_G24bxxGjCoKv6pMMVeVfRHX8COCZEC_RFBzwUYTg' // Usa la chiave che hai copiato
      });
      
      if (token) {
        console.log('Token FCM ottenuto:', token);
        
        // Registra il token sul server
        await registerTokenWithServer(token);
        
        return token;
      } else {
        console.log('Impossibile ottenere token FCM');
        return null;
      }
    } catch (tokenError) {
      console.error('Errore nell\'ottenimento del token FCM:', tokenError);
      // Manda un alert all'utente per migliorare il feedback
      if (tokenError.code === 'messaging/token-subscribe-failed') {
        console.warn('Problema con la configurazione FCM. Controlla le impostazioni del progetto Firebase.');
      }
      return null;
    }
  } catch (error) {
    console.error('Errore nella richiesta permesso notifiche:', error);
    return null;
  }
};
/**
 * Registra un token FCM sul server
 * @param {string} token - Token FCM da registrare
 */
export const registerTokenWithServer = async (token) => {
  try {
    await api.post('/users/fcm-token', { token });
    console.log('Token FCM registrato sul server');
    return true;
  } catch (error) {
    console.error('Errore nella registrazione del token:', error);
    return false;
  }
};

/**
 * Elimina il token FCM corrente
 */
export const unregisterToken = async () => {
  if (!messaging) {
    console.error('Firebase Messaging not initialized');
    return false;
  }

  try {
    // Ottieni il token corrente
    const currentToken = await getToken(messaging);
    
    if (currentToken) {
      // Elimina il token da Firebase
      await deleteToken(messaging);
      
      // Elimina il token dal server
      await api.delete('/api/users/fcm-token', { 
        data: { token: currentToken } 
      });
      
      console.log('Token FCM eliminato');
      return true;
    }
    return false;
  } catch (error) {
    console.error('Errore nell\'eliminazione del token:', error);
    return false;
  }
};

/**
 * Imposta un callback per la gestione delle notifiche in foreground
 * @param {function} callback - Funzione da chiamare quando arriva una notifica
 */
export const setOnMessageHandler = (callback) => {
  onMessageCallback = callback;
};

export default {
  requestNotificationPermission,
  registerTokenWithServer,
  unregisterToken,
  setOnMessageHandler
};

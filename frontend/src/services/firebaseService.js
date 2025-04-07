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

// Verifica prerequisiti per le notifiche
const checkNotificationPrerequisites = () => {
  if (!('Notification' in window)) {
    console.error('Questo browser non supporta le notifiche desktop');
    return false;
  }
  
  if (!('serviceWorker' in navigator)) {
    console.error('Questo browser non supporta i service worker');
    return false;
  }
  
  return true;
};

// Inizializza Firebase
let app;
let messaging;

try {
  app = initializeApp(firebaseConfig);
  console.log('Firebase App initialized');
  
  if (checkNotificationPrerequisites()) {
    messaging = getMessaging(app);
    console.log('Firebase Messaging initialized');
  }
} catch (error) {
  console.error('Error initializing Firebase:', error);
}

// VAPID key per web push
const VAPID_KEY = 'BODRY8fDnAtp52kFmmY5zeYpaEB1eRuW1salcgoI8mQuAd_G24bxxGjCoKv6pMMVeVfRHX8COCZEC_RFBzwUYTg';

// Callback per le notifiche in foreground
let onMessageCallback = null;

// Gestire messaggi in foreground (solo se il messaging è stato inizializzato)
if (messaging) {
  onMessage(messaging, (payload) => {
    console.log('Messaggio ricevuto in foreground:', payload);
    
    // Mostra notifica browser se non c'è un handler personalizzato
    if (onMessageCallback) {
      onMessageCallback(payload);
    } else {
      // Handler di default - mostra una notifica browser
      if (Notification.permission === 'granted' && payload.notification) {
        const { title, body } = payload.notification;
        // Usa nuova API Notification nativa del browser
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification(title, {
            body,
            icon: '/aibvc.png',
            badge: '/aibvc.png',
            data: payload.data
          });
        });
      }
    }
  });
}

/**
 * Registra il service worker
 * @returns {Promise<ServiceWorkerRegistration|null>}
 */
const registerServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) {
    console.error('Service Worker non supportato');
    return null;
  }
  
  try {
    // Prima controlla se esiste già
    let registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
    
    if (!registration) {
      console.log('Service worker non trovato, registrazione in corso...');
      registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/'
      });
      console.log('Service worker registrato con successo:', registration);
    } else {
      console.log('Service worker già registrato:', registration);
    }
    
    return registration;
  } catch (error) {
    console.error('Errore nella registrazione del service worker:', error);
    return null;
  }
};

/**
 * Richiede il permesso per le notifiche e registra il token FCM
 * @returns {Promise<string|null>} - Token FCM o null in caso di errore
 */
export const requestNotificationPermission = async () => {
  if (!checkNotificationPrerequisites()) {
    return null;
  }

  try {
    console.log('Richiesta permesso notifiche...');
    
    // Richiedi permesso
    const permission = await Notification.requestPermission();
    console.log('Risultato richiesta permessi:', permission);
    
    if (permission !== 'granted') {
      console.log('Permesso notifiche non concesso');
      return null;
    }
    
    // Prima registra il service worker
    const swRegistration = await registerServiceWorker();
    if (!swRegistration) {
      console.warn('Continuo senza service worker registrato');
    }
    
    // Attendi che il service worker sia attivo
    if (swRegistration && swRegistration.installing) {
      console.log('Service worker in installazione, attendo...');
      await new Promise(resolve => {
        swRegistration.installing.addEventListener('statechange', e => {
          if (e.target.state === 'activated') {
            console.log('Service worker attivato');
            resolve();
          }
        });
      });
    }
    
    // Controlla che il messaging sia inizializzato
    if (!messaging) {
      console.error('Firebase Messaging non inizializzato');
      return null;
    }
    
    try {
      // Ottieni token FCM
      console.log('Richiesta token FCM in corso...');
      const tokenOptions = {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: swRegistration
      };
      
      const token = await getToken(messaging, tokenOptions);
      
      if (token) {
        console.log('Token FCM ottenuto:', token.substring(0, 20) + '...');
        
        // Registra il token sul server
        await registerTokenWithServer(token);
        
        return token;
      } else {
        console.error('Impossibile ottenere token FCM: nessun token restituito');
        return null;
      }
    } catch (tokenError) {
      console.error('Errore nell\'ottenimento del token FCM:', tokenError);
      // Log dettagliato dell'errore
      console.error('Dettagli errore:', JSON.stringify(tokenError));
      
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
    // Usa il nuovo endpoint FCM che abbiamo creato
    await api.post('/fcm/register', { token });
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
      // Elimina il token dal server
      await api.post('/fcm/unregister', { token: currentToken });
      
      // Elimina il token da Firebase
      await deleteToken(messaging);
      
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

/**
 * Quando un utente si iscrive a una squadra, sottoscrive il token al topic
 * @param {string} teamId - ID della squadra 
 */
export const subscribeToTeam = async (teamId) => {
  try {
    await api.post('/fcm/subscribe-team', { teamId });
    console.log(`Iscritto alle notifiche per la squadra ${teamId}`);
    return true;
  } catch (error) {
    console.error('Errore nella sottoscrizione alla squadra:', error);
    return false;
  }
};

/**
 * Quando un utente si disiscrive da una squadra, annulla la sottoscrizione al topic
 * @param {string} teamId - ID della squadra
 */
export const unsubscribeFromTeam = async (teamId) => {
  try {
    await api.post('/fcm/unsubscribe-team', { teamId });
    console.log(`Disiscritto dalle notifiche per la squadra ${teamId}`);
    return true;
  } catch (error) {
    console.error('Errore nella disiscrizione dalla squadra:', error);
    return false;
  }
};

export default {
  requestNotificationPermission,
  registerTokenWithServer,
  unregisterToken,
  setOnMessageHandler,
  subscribeToTeam,
  unsubscribeFromTeam
};
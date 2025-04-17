import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage, deleteToken, isSupported } from "firebase/messaging";
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

// Rileva se è un dispositivo iOS
export const isIOSDevice = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
};

// Rileva se stiamo usando Safari
export const isSafariBrowser = () => {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
};

// Verifica se siamo su iOS + Safari (la combinazione problematica)
export const isIOSSafari = () => {
  return isIOSDevice() && isSafariBrowser();
};

// Verifica prerequisiti per le notifiche
const checkNotificationPrerequisites = async () => {
  if (!('Notification' in window)) {
    console.error('Questo browser non supporta le notifiche desktop');
    return false;
  }
  
  if (!('serviceWorker' in navigator)) {
    console.error('Questo browser non supporta i service worker');
    return false;
  }
  
  // Per iOS Safari, possiamo evitare il check di Firebase Messaging
  // che potrebbe fallire, e usare un approccio alternativo
  if (isIOSSafari()) {
    console.log('Dispositivo iOS con Safari rilevato, useremo meccanismo alternativo per le notifiche');
    return true;
  }
  
  try {
    // Verifica se Firebase Messaging è supportato su questo browser
    const isMessagingSupported = await isSupported();
    if (!isMessagingSupported) {
      console.error('Firebase Messaging non è supportato in questo browser');
      return false;
    }
  } catch (error) {
    console.error('Errore nella verifica del supporto per Firebase Messaging:', error);
    return false;
  }
  
  return true;
};

// Esporta la funzione per verificare il supporto per le notifiche
export const isNotificationsSupported = async () => {
  return await checkNotificationPrerequisites();
};

// Inizializza Firebase
let app;
let messaging = null;

try {
  app = initializeApp(firebaseConfig);
  console.log('Firebase App initialized');
  
  // Inizializza messaging solo se necessario
  checkNotificationPrerequisites().then(supported => {
    if (supported && !isIOSSafari()) {
      try {
        messaging = getMessaging(app);
        console.log('Firebase Messaging initialized');
        
        // Configura l'handler per messaggi in foreground
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
                  data: payload.data,
                  vibrate: [200, 100, 200], // Aggiunto per migliorare l'esperienza mobile
                  requireInteraction: true // Le notifiche rimangono finché l'utente non interagisce
                });
              });
            }
          }
        });
      } catch (error) {
        console.error('Error initializing Firebase Messaging:', error);
      }
    }
  }).catch(error => {
    console.error('Error checking notification prerequisites:', error);
  });
} catch (error) {
  console.error('Error initializing Firebase:', error);
}

// VAPID key per web push
const VAPID_KEY = 'BODRY8fDnAtp52kFmmY5zeYpaEB1eRuW1salcgoI8mQuAd_G24bxxGjCoKv6pMMVeVfRHX8COCZEC_RFBzwUYTg';

// Callback per le notifiche in foreground
let onMessageCallback = null;

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
      
      // Per iOS, attiva il service worker immediatamente
      if (isIOSDevice()) {
        await registration.update();
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      }
    } else {
      console.log('Service worker già registrato:', registration);
      
      // Aggiorna e attiva il service worker
      await registration.update();
    }
    
    return registration;
  } catch (error) {
    console.error('Errore nella registrazione del service worker:', error);
    return null;
  }
};

/**
 * Genera un ID dispositivo univoco per iOS
 * @returns {string} ID dispositivo
 */
const generateIOSDeviceId = () => {
  let deviceId = localStorage.getItem('ios_device_id');
  
  if (!deviceId) {
    // Genera un nuovo ID univoco
    deviceId = 'ios_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('ios_device_id', deviceId);
  }
  
  return deviceId;
};

/**
 * Registra un dispositivo iOS per notifiche alternative
 * @returns {Promise<boolean>} Successo o fallimento
 */
const registerIOSDevice = async () => {
  try {
    const deviceId = generateIOSDeviceId();
    
    // Registra il dispositivo iOS al backend
    await api.post('/users/ios-device-register', { 
      deviceId,
      deviceInfo: {
        model: navigator.platform || 'iOS Device',
        userAgent: navigator.userAgent,
        timestamp: Date.now()
      }
    });
    
    console.log('Dispositivo iOS registrato per notifiche alternative');
    return true;
  } catch (error) {
    console.error('Errore nella registrazione del dispositivo iOS:', error);
    return false;
  }
};

/**
 * Richiede il permesso per le notifiche e registra il token FCM
 * @returns {Promise<string|object|null>} - Token FCM o info iOS o null in caso di errore
 */
export const requestNotificationPermission = async () => {
  // Verifica se le notifiche sono supportate
  const supported = await checkNotificationPrerequisites();
  if (!supported) {
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
    
    // Percorso speciale per iOS Safari
    if (isIOSSafari()) {
      console.log('Utilizzo flusso iOS per le notifiche');
      
      // Registra dispositivo iOS
      const success = await registerIOSDevice();
      
      // Crea una notifica di test per verificare che funzioni
      if (success && swRegistration) {
        try {
          await swRegistration.showNotification('Notifiche attivate', {
            body: 'Ora riceverai le notifiche di Club Series',
            icon: '/aibvc.png'
          });
        } catch (notifError) {
          console.warn('Impossibile mostrare notifica di test su iOS:', notifError);
        }
      }
      
      return { isIOS: true, deviceId: generateIOSDeviceId() };
    }
    
    // Controlla che il messaging sia inizializzato (solo per non-iOS)
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
  // Per iOS, rimuovi il device ID
  if (isIOSSafari()) {
    try {
      const deviceId = localStorage.getItem('ios_device_id');
      if (deviceId) {
        await api.post('/users/ios-device-unregister', { deviceId });
        localStorage.removeItem('ios_device_id');
        console.log('Dispositivo iOS rimosso');
      }
      return true;
    } catch (error) {
      console.error('Errore nella rimozione del dispositivo iOS:', error);
      return false;
    }
  }

  // Per altri browser, procedi con FCM
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
    // Per iOS, aggiungi il deviceId alla richiesta
    const payload = { teamId };
    if (isIOSSafari()) {
      payload.deviceId = generateIOSDeviceId();
      payload.isIOS = true;
    }
    
    await api.post('/fcm/subscribe-team', payload);
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
    // Per iOS, aggiungi il deviceId alla richiesta
    const payload = { teamId };
    if (isIOSSafari()) {
      payload.deviceId = generateIOSDeviceId();
      payload.isIOS = true;
    }
    
    await api.post('/fcm/unsubscribe-team', payload);
    console.log(`Disiscritto dalle notifiche per la squadra ${teamId}`);
    return true;
  } catch (error) {
    console.error('Errore nella disiscrizione dalla squadra:', error);
    return false;
  }
};

/**
 * Inizia polling per notifiche (solo per iOS)
 */
export const startNotificationPolling = async () => {
  if (!isIOSSafari()) return;
  
  const POLLING_INTERVAL = 60000; // 1 minuto
  
  // Salva l'ID dell'intervallo per poterlo fermare in futuro
  const intervalId = setInterval(async () => {
    try {
      // Controlla se ci sono nuove notifiche
      const deviceId = generateIOSDeviceId();
      const response = await api.get(`/notifications/ios-poll?deviceId=${deviceId}&timestamp=${Date.now()}`);
      
      if (response.data && response.data.notifications && response.data.notifications.length > 0) {
        console.log(`Ricevute ${response.data.notifications.length} notifiche via polling`);
        
        // Processa ogni notifica
        for (const notification of response.data.notifications) {
          // Mostra la notifica nativa
          if (Notification.permission === 'granted') {
            const notif = new Notification(notification.title || 'Club Series', {
              body: notification.body || notification.message,
              icon: '/aibvc.png',
              badge: '/aibvc.png',
              tag: notification.id || `ios-notif-${Date.now()}`
            });
            
            // Gestione click (se supportata)
            notif.onclick = () => {
              window.focus();
              if (notification.matchId) {
                window.location.href = `/matches/${notification.matchId}`;
              } else {
                window.location.href = '/notifications';
              }
            };
          }
          
          // Segna la notifica come consegnata
          await api.post('/notifications/ios-delivered', {
            deviceId,
            notificationIds: [notification.id]
          });
        }
      }
    } catch (error) {
      console.error('Errore nel polling delle notifiche:', error);
    }
  }, POLLING_INTERVAL);
  
  // Salva l'ID dell'intervallo
  window.iosPollingIntervalId = intervalId;
  console.log('Polling notifiche iOS avviato');
  
  return intervalId;
};

/**
 * Ferma polling per notifiche
 */
export const stopNotificationPolling = () => {
  if (window.iosPollingIntervalId) {
    clearInterval(window.iosPollingIntervalId);
    delete window.iosPollingIntervalId;
    console.log('Polling notifiche iOS fermato');
  }
};

export default {
  requestNotificationPermission,
  registerTokenWithServer,
  unregisterToken,
  setOnMessageHandler,
  subscribeToTeam,
  unsubscribeFromTeam,
  isIOSDevice,
  isSafariBrowser,
  isIOSSafari,
  startNotificationPolling,
  stopNotificationPolling
};
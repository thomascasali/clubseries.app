// Scripts for firebase and firebase messaging
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Maggiore visibilità nei log per il debug
console.log('Firebase Messaging Service Worker Loaded - Version 3.0 (iOS Enhanced)');

// Inizializza l'app Firebase con le tue credenziali
firebase.initializeApp({
  apiKey: "AIzaSyBbusGb9GtqbRbdasjmMCuDJ9IImkzgR4c",
  authDomain: "clubseriesfinals.firebaseapp.com",
  projectId: "clubseriesfinals",
  storageBucket: "clubseriesfinals.firebasestorage.app",
  messagingSenderId: "616223603086",
  appId: "1:616223603086:web:e075b03c92efb678444cdf"
});

// Inizializza Firebase Messaging
const messaging = firebase.messaging();
console.log('Firebase Messaging initialized in Service Worker');

// Gestisce messaggi in background
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Ricevuta notifica in background:', payload);

  // Estrai informazioni dalla notifica
  const notificationTitle = payload.notification?.title || 'Club Series';
  const notificationBody = payload.notification?.body || '';
  
  // Genera un ID univoco per la notifica per evitare duplicati
  const notificationId = `clubseries-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  
  // Prepara le opzioni della notifica
  const notificationOptions = {
    body: notificationBody,
    icon: '/aibvc.png', // Usa l'icona AIBVC
    badge: '/aibvc.png',
    // Usa un tag univoco per evitare duplicati ma mantieni coerenza per notifiche simili
    tag: payload.data?.notificationId || notificationId,
    // Aggiungi vibrazione per dispositivi mobili
    vibrate: [200, 100, 200],
    // Imposta l'importanza a massima per iOS
    importance: 'high',
    // Includi eventuali dati aggiuntivi dalla notifica
    data: {
      ...payload.data,
      // Aggiungi un timestamp univoco per evitare cache delle notifiche
      timestamp: Date.now(),
      // Flag per iOS
      forceShow: 'true'
    },
    // Questi campi sono specifici per iOS
    actions: [{
      action: 'view',
      title: 'Visualizza'
    }],
    // Per iOS: aggiunge il badge
    badge: 1,
    // Richiede l'interazione dell'utente
    requireInteraction: true
  };

  console.log('[firebase-messaging-sw.js] Mostrando notifica:', notificationTitle, notificationOptions);
  
  // Controlla se c'è già una notifica con lo stesso contenuto
  self.registration.getNotifications().then(notifications => {
    // Per iOS, forziamo sempre la visualizzazione della notifica
    const isIOS = /iPad|iPhone|iPod/.test(self.navigator?.userAgent || '') && !self.MSStream;
    
    const isDuplicate = notifications.some(notification => 
      notification.title === notificationTitle && 
      notification.body === notificationBody
    );
    
    if (!isDuplicate || isIOS) {
      // Mostra la notifica - per iOS mostriamo sempre, anche se è un duplicato
      return self.registration.showNotification(notificationTitle, notificationOptions);
    } else {
      console.log('[firebase-messaging-sw.js] Notifica duplicata ignorata');
    }
  });
});

// Gestisce il click sulla notifica
self.addEventListener('notificationclick', function(event) {
  console.log('[firebase-messaging-sw.js] Click su notifica', event);
  
  // Chiude la notifica quando si fa clic su di essa
  event.notification.close();
  
  // Estrai i dati dalla notifica
  const notificationData = event.notification.data || {};
  
  // Url da aprire quando si clicca sulla notifica
  let url = '/notifications';
  
  // Se c'è un matchId, reindirizza alla pagina del match
  if (notificationData.matchId) {
    url = `/matches/${notificationData.matchId}`;
  }
  
  // Aggiungi parametro per iOS per forzare l'apertura
  const isIOS = /iPad|iPhone|iPod/.test(self.navigator?.userAgent || '') && !self.MSStream;
  if (isIOS) {
    url = url + (url.includes('?') ? '&' : '?') + 'from_notification=true';
  }
  
  // Assicurati che l'URL sia completo
  const urlToOpen = new URL(url, self.location.origin).href;
  console.log('[firebase-messaging-sw.js] Apertura URL:', urlToOpen);
  
  const promiseChain = clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  })
  .then((windowClients) => {
    // Verifica se la finestra è già aperta
    let existingClient = null;
    for (let i = 0; i < windowClients.length; i++) {
      const client = windowClients[i];
      // Su iOS, tendiamo a forzare sempre l'apertura di una nuova tab
      if (!isIOS && client.url.startsWith(self.location.origin) && 'focus' in client) {
        existingClient = client;
        break;
      }
    }
    
    if (existingClient) {
      // Aggiorna URL e porta in primo piano la tab esistente
      return existingClient.navigate(urlToOpen).then((client) => client.focus());
    } else {
      // Altrimenti apri una nuova finestra
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    }
  });
  
  event.waitUntil(promiseChain);
});

// Gestisce notifiche push dirette (questo è importante per iOS)
self.addEventListener('push', function(event) {
  console.log('[firebase-messaging-sw.js] Push ricevuto:', event);
  
  // Se non c'è payload, usa valori predefiniti
  if (!event.data) {
    console.log('[firebase-messaging-sw.js] Push ricevuto senza payload');
    return;
  }
  
  try {
    // Tenta di analizzare il payload
    const payload = event.data.json();
    console.log('[firebase-messaging-sw.js] Push payload:', payload);
    
    // Estrai informazioni dalla notifica
    const notificationTitle = payload.notification?.title || 'Club Series';
    const notificationBody = payload.notification?.body || '';
    
    // Opzioni di notifica simili a quelle definite sopra
    const notificationOptions = {
      body: notificationBody,
      icon: '/aibvc.png',
      badge: '/aibvc.png',
      vibrate: [200, 100, 200],
      data: payload.data || {},
      requireInteraction: true
    };
    
    // Mostra notifica
    event.waitUntil(
      self.registration.showNotification(notificationTitle, notificationOptions)
    );
  } catch (error) {
    console.error('[firebase-messaging-sw.js] Errore nell\'elaborazione del push:', error);
    
    // Tentativo di notifica anche in caso di errore
    event.waitUntil(
      self.registration.showNotification('Club Series', {
        body: 'Nuova notifica disponibile',
        icon: '/aibvc.png'
      })
    );
  }
});

// Gestisce gli eventi di installazione del service worker
self.addEventListener('install', (event) => {
  console.log('[firebase-messaging-sw.js] Service Worker installato');
  // Forza l'attivazione immediata del service worker
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  console.log('[firebase-messaging-sw.js] Service Worker attivato');
  // Forza la presa di controllo immediata delle pagine
  event.waitUntil(self.clients.claim());
});

// Evento aggiuntivo per debug su iOS
self.addEventListener('message', (event) => {
  console.log('[firebase-messaging-sw.js] Messaggio ricevuto:', event.data);
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
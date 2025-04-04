// Scripts for firebase and firebase messaging
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

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

// Gestisce messaggi in background
messaging.onBackgroundMessage(function(payload) {
  console.log('Ricevuta notifica in background:', payload);

  const notificationTitle = payload.notification.title || 'Club Series';
  const notificationOptions = {
    body: payload.notification.body || '',
    icon: '/favicon.png'
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Gestisce il click sulla notifica
self.addEventListener('notificationclick', function(event) {
  console.log('Click su notifica', event);
  
  event.notification.close();
  
  // Url da aprire quando si clicca sulla notifica
  let url = '/notifications';
  
  // Assicurati che l'URL sia completo
  const urlToOpen = new URL(url, self.location.origin).href;
  
  const promiseChain = clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  })
  .then((windowClients) => {
    // Verifica se la finestra è già aperta
    for (let i = 0; i < windowClients.length; i++) {
      const client = windowClients[i];
      if (client.url === urlToOpen && 'focus' in client) {
        return client.focus();
      }
    }
    
    // Altrimenti apri una nuova finestra
    if (clients.openWindow) {
      return clients.openWindow(urlToOpen);
    }
  });
  
  event.waitUntil(promiseChain);
});
require('dotenv').config();
const admin = require('firebase-admin');
const path = require('path');
const logger = require('./src/config/logger');

// Token FCM di test - sostituiscilo con un token valido dal tuo client
const testToken = process.argv[2]; // Passa il token come parametro da riga di comando
if (!testToken) {
  console.error('Specificare un token FCM come parametro. Esempio: node test-fcm-only.js TOKEN_FCM');
  process.exit(1);
}

async function testFCM() {
  try {
    // Inizializza Firebase Admin (solo se non è già inizializzato)
    try {
      admin.app();
      console.log('Firebase Admin già inizializzato');
    } catch (e) {
      const serviceAccountPath = path.resolve(__dirname, './src/config/clubseriesfinals-firebase-adminsdk.json');
      admin.initializeApp({
        credential: admin.credential.cert(require(serviceAccountPath))
      });
      console.log('Firebase Admin inizializzato con successo');
    }
    
    console.log(`Invio notifica di test al token: ${testToken.substring(0, 15)}...`);
    
    // Invia una notifica di test
    const message = {
      token: testToken,
      notification: {
        title: 'Test Notifica FCM',
        body: 'Questa è una notifica di test da ClubSeries.app'
      },
      data: {
        type: 'test',
        timestamp: new Date().toISOString()
      },
      android: {
        priority: 'high'
      },
      webpush: {
        headers: {
          Urgency: 'high'
        },
        notification: {
          icon: '/favicon.png'
        }
      }
    };

    const response = await admin.messaging().send(message);
    console.log('Notifica inviata con successo:', response);
    
  } catch (error) {
    console.error('Errore nell\'invio della notifica:', error);
    if (error.code && error.code === 'messaging/invalid-registration-token') {
      console.error('Il token fornito non è valido o è scaduto. Genera un nuovo token sul client.');
    } else if (error.code && error.code === 'messaging/registration-token-not-registered') {
      console.error('Il token fornito non è più registrato. L\'app potrebbe essere stata disinstallata.');
    }
  } finally {
    process.exit(0);
  }
}

testFCM();

require('dotenv').config();
const fcmService = require('./src/services/fcmService');
const logger = require('./src/config/logger');

// Token FCM di test - sostituiscilo con un token valido dal tuo client
const testToken = process.argv[2]; // Passa il token come parametro da riga di comando
if (!testToken) {
  console.error('Specificare un token FCM come parametro. Esempio: node test-fcm.js TOKEN_FCM');
  process.exit(1);
}

async function testFCM() {
  try {
    console.log(`Invio notifica di test al token: ${testToken.substring(0, 15)}...`);
    
    const notification = {
      title: 'Test Notifica FCM',
      body: 'Questa è una notifica di test da ClubSeries.app'
    };
    
    const data = {
      type: 'test',
      timestamp: new Date().toISOString()
    };
    
    const result = await fcmService.sendToDevice(testToken, notification, data);
    console.log('Risultato invio:', result);
    console.log('Notifica inviata con successo!');
  } catch (error) {
    console.error('Errore nell\'invio della notifica:', error);
    console.error(error.stack);
  }
  
  process.exit(0);
}

testFCM();
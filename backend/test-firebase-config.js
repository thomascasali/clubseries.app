require('dotenv').config();
const admin = require('firebase-admin');
const path = require('path');

async function testFirebaseConfig() {
  try {
    // Carica lo stesso file di configurazione usato nel fcmService
    const serviceAccountPath = path.resolve(__dirname, './src/config/clubseriesfinals-firebase-adminsdk.json');
    console.log('Percorso del file service account:', serviceAccountPath);
    
    // Prova a caricare il file per vedere se ci sono errori
    const serviceAccount = require(serviceAccountPath);
    console.log('Service account caricato con successo');
    console.log('Project ID:', serviceAccount.project_id);
    
    // Verifica se l'app è già inizializzata (in caso di un'istanza esistente)
    try {
      admin.app();
      console.log('Firebase Admin è già inizializzato');
    } catch (e) {
      // Inizializza Firebase Admin
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('Firebase Admin inizializzato con successo');
    }
    
    // Verifica la connessione a Firebase
    const testDoc = await admin.firestore().collection('test').doc('test').set({
      test: true,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('Test di scrittura su Firestore eseguito con successo');
    
    // Verifica la validità del progetto FCM
    const projectInfo = await admin.projectManagement().listAppMetadata();
    console.log('Applicazioni nel progetto:', projectInfo.map(app => ({
      appId: app.appId,
      displayName: app.displayName,
      platform: app.platform
    })));
    
    console.log('Test di Firebase completato con successo!');
  } catch (error) {
    console.error('Errore nel test di configurazione Firebase:', error);
    console.error(error.stack);
  }
  
  process.exit(0);
}

testFirebaseConfig();

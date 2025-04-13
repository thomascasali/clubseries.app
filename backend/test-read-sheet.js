require('dotenv').config();
const { google } = require('googleapis');
const logger = require('./src/config/logger');
const { readMatchesFromSheet } = require('./src/services/googleSheets/readers');

// Categoria di test
const category = 'Under 21 F';
const spreadsheetId = process.env.GOOGLE_SHEETS_UNDER_21_F; // es. 1K-CXrhfplUecFL3T90cwCIAJF4U6nR68r0D4qJcGhcg

// Autenticazione con Google
const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

async function testMatchParsing() {
  try {
    console.log(`📋 Test parser partite per categoria '${category}'`);
    console.log(`🗂️ Spreadsheet ID: ${spreadsheetId}`);

    // Override auth globale di `readers.js`
    const authClient = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: authClient });
    require('./src/services/googleSheets/config').sheets = sheets;

    const matches = await readMatchesFromSheet(spreadsheetId, category);

    console.log(`\n📊 Match totali trovati: ${matches.length}`);
    const goldenSets = matches.filter(m => m.isGoldenSet);
    console.log(`🥇 Golden Sets trovati: ${goldenSets.length}`);

    // Dettagli campione
    matches.slice(0, 5).forEach((m, i) => {
      console.log(`\n--- Match #${i + 1} ---`);
      console.log(`📌 ID: ${m.matchId}`);
      console.log(`🗓️ Data: ${m.date}`);
      console.log(`⏰ Ora: ${m.time}`);
      console.log(`🏟️ Campo: ${m.court}`);
      console.log(`🎯 Fase: ${m.phase}`);
      console.log(`🤝 Squadre: ${m.teamA} (${m.teamACode}) vs ${m.teamB} (${m.teamBCode})`);
      console.log(`📈 Punteggi: ${m.officialScoreA.join(',')} - ${m.officialScoreB.join(',')}`);
      console.log(`✅ Risultato ufficiale: ${m.officialResult}`);
      console.log(`⭐ Golden Set? ${m.isGoldenSet}`);
    });

    console.log(`\n✅ Test completato!`);
  } catch (err) {
    console.error(`❌ Errore durante il test: ${err.message}`);
    if (err.response?.data) {
      console.error(JSON.stringify(err.response.data, null, 2));
    }
  }
}

testMatchParsing();

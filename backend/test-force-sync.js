require('dotenv').config();
const mongoose = require('mongoose');
const { getSheetIdForCategory } = require('./src/utils/sheetsUtils');
const googleSheetsService = require('./src/services/googleSheets');
const Team = require('./src/models/Team');
const Match = require('./src/models/Match');
const connectDB = require('./src/config/database');
const logger = require('./src/config/logger');

// Categoria da testare
const CATEGORY = 'Under 21 M';

async function testForceSync() {
  try {
    console.log('Connessione al database...');
    await connectDB();

    const spreadsheetId = getSheetIdForCategory(CATEGORY);

    if (!spreadsheetId) {
      console.error(`Nessun ID foglio configurato per la categoria ${CATEGORY}`);
      process.exit(1);
    }

    console.log(`Categoria: ${CATEGORY}`);
    console.log(`ID Foglio: ${spreadsheetId}`);

    // Sincronizzazione team
    console.log('\n[TEST] Sincronizzazione team da Google Sheets a DB...');
    const syncedTeams = await googleSheetsService.syncTeamsFromSheet(
      spreadsheetId,
      CATEGORY,
      Team
    );
    console.log(`Sincronizzati ${syncedTeams.length} team.`);

    // Sincronizzazione match
    console.log('\n[TEST] Sincronizzazione partite da Google Sheets a DB...');
    const syncedMatches = await googleSheetsService.syncMatchesFromSheet(
      spreadsheetId,
      CATEGORY,
      Match,
      Team
    );
    console.log(`Sincronizzate ${syncedMatches.length} partite.`);

    // Mostra dettagli di alcune partite
    if (syncedMatches.length > 0) {
      console.log('\nEsempio partite sincronizzate:');
      for (let i = 0; i < Math.min(3, syncedMatches.length); i++) {
        const match = syncedMatches[i];
        await match.populate('teamA', 'name');
        await match.populate('teamB', 'name');

        console.log(`${i+1}. ${match.phase}: ${match.teamA.name} vs ${match.teamB.name}`);
        console.log(`   ID: ${match._id}, MatchID: ${match.matchId}`);
        console.log(`   Data: ${match.date}, Orario: ${match.time}, Campo: ${match.court}`);
        console.log(`   Riga foglio: ${match.spreadsheetRow}, Foglio: ${match.sheetName}`);

        if (match.officialScoreA.length > 0) {
          const scores = match.officialScoreA.map((s, idx) => `${s}-${match.officialScoreB[idx]}`).join(', ');
          console.log(`   Risultati ufficiali: ${scores}, Esito ufficiale: ${match.officialResult}`);
        }
      }
    }

    console.log('\nTest completato con successo!');

  } catch (error) {
    console.error('Errore durante il test:', error.message);
    if (error.response) {
      console.error('Response error data:', error.response.data);
    }
  } finally {
    // Chiudi la connessione MongoDB
    await mongoose.connection.close();
    console.log('Connessione MongoDB chiusa.');
    process.exit(0);
  }
}

testForceSync();

require('dotenv').config();
const mongoose = require('mongoose');
const { getSheetIdForCategory } = require('./src/utils/sheetsUtils');
const googleSheetsService = require('./src/services/googleSheetsService');
const Team = require('./src/models/Team');
const Match = require('./src/models/Match');
const connectDB = require('./src/config/database');

// Categoria da testare
const CATEGORY = 'Under 21 M';

async function testSync() {
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
    
    // Test 1: Sincronizzazione team
    console.log('\n[TEST 1] Sincronizzazione team...');
    const syncedTeams = await googleSheetsService.syncTeamsFromSheet(
      spreadsheetId,
      CATEGORY,
      Team
    );
    
    console.log(`Sincronizzati ${syncedTeams.length} team:`);
    syncedTeams.forEach((team, i) => {
      console.log(`${i+1}. ${team.name} (ID: ${team._id})`);
    });
    
    // Test 2: Sincronizzazione partite
    console.log('\n[TEST 2] Sincronizzazione partite...');
    const syncedMatches = await googleSheetsService.syncMatchesFromSheet(
      spreadsheetId,
      CATEGORY,
      Match,
      Team
    );
    
    console.log(`Sincronizzate ${syncedMatches.length} partite.`);
    
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
        
        if (match.scoreA.length > 0) {
          const scores = match.scoreA.map((s, idx) => `${s}-${match.scoreB[idx]}`).join(', ');
          console.log(`   Risultati: ${scores}, Esito: ${match.result}`);
        }
      }
    }
    
    // Test 3: Modifica e sincronizzazione inversa
    if (syncedMatches.length > 0) {
      console.log('\n[TEST 3] Sincronizzazione inversa (database → Google Sheets)...');
      
      const testMatch = syncedMatches[0];
      console.log(`Aggiornamento partita ${testMatch.matchId}...`);
      
      // Modifica il punteggio
      testMatch.scoreA = ['21', '21'];
      testMatch.scoreB = ['15', '12'];
      testMatch.result = 'teamA';
      testMatch.confirmedByTeamA = true;
      testMatch.confirmedByTeamB = true;
      
      await testMatch.save();
      console.log('Partita aggiornata nel database.');
      
      // Sincronizza con Google Sheets
      await googleSheetsService.syncMatchesToSheet(
        spreadsheetId,
        CATEGORY,
        [testMatch]
      );
      
      console.log('Sincronizzazione inversa completata.');
      console.log(`Verifica il foglio "${testMatch.sheetName}" alla riga ${testMatch.spreadsheetRow}`);
    }
    
    console.log('\nTest completati con successo!');
    
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

testSync();
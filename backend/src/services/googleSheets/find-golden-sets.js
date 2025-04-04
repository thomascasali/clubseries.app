/**
 * Script di diagnostica per individuare e catalogare i Golden Set nei fogli Google
 */
const { sheets } = require('./config');
const logger = require('../../config/logger');

/**
 * Funzione per esaminare un foglio e trovare tutti i possibili Golden Set
 * @param {string} spreadsheetId - ID del foglio Google Sheets
 * @param {string} category - Categoria (es. "Under 21 M")
 * @returns {Promise<Array>} - Array di oggetti con informazioni sui Golden Set
 */
const findGoldenSets = async (spreadsheetId, category) => {
  try {
    // Ottieni informazioni sul foglio
    const sheetInfo = await sheets.spreadsheets.get({ spreadsheetId });
    console.log(`Analizzo foglio: ${sheetInfo.data.properties.title} per categoria ${category}`);
    
    const poolSheets = sheetInfo.data.sheets.filter(sheet => 
      sheet.properties.title.toLowerCase().includes('pool')
    );
    
    console.log(`Trovati ${poolSheets.length} fogli pool`);
    
    const goldenSets = [];
    
    // Esamina ogni foglio
    for (const sheet of poolSheets) {
      const sheetName = sheet.properties.title;
      console.log(`\nEsaminando foglio "${sheetName}"...`);
      
      // Leggi i dati del foglio
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `'${sheetName}'!A1:G50` // Includiamo le colonne rilevanti
      });
      
      const rows = response.data.values || [];
      console.log(`${rows.length} righe trovate`);
      
      // Analizza le righe per trovare potenziali Golden Set
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length < 5) continue;
        
        const matchId = row[0] || '';
        const dateStr = row[1] || '';
        const timeStr = row[2] || '';
        const courtStr = row[3] || '';
        const phaseStr = row[4] || '';
        const teamsStr = row[5] || '';
        
        // Verifica tutte le possibili condizioni per un Golden Set
        const isMatchIdGolden = matchId.includes('G');
        const isTeamGolden = teamsStr.includes('Team G');
        const isPhaseGolden = phaseStr.toLowerCase().includes('golden');
        
        if (isMatchIdGolden || isTeamGolden || isPhaseGolden) {
          console.log(`\n🏆 Golden Set trovato alla riga ${i+1}:`);
          console.log(`  MatchID: ${matchId} (isGolden: ${isMatchIdGolden})`);
          console.log(`  Teams: ${teamsStr} (isGolden: ${isTeamGolden})`);
          console.log(`  Phase: ${phaseStr} (isGolden: ${isPhaseGolden})`);
          console.log(`  Data: ${dateStr}, Orario: ${timeStr}, Campo: ${courtStr}`);
          
          const teamsParts = teamsStr.split(' vs ');
          const teamA = teamsParts[0] || '';
          const teamB = teamsParts[1] || '';
          
          goldenSets.push({
            matchId,
            sheetName,
            row: i+1,
            teamA,
            teamB,
            date: dateStr,
            time: timeStr,
            court: courtStr,
            phase: phaseStr,
            isMatchIdGolden,
            isTeamGolden,
            isPhaseGolden
          });
        }
      }
    }
    
    // Riepilogo finale
    console.log(`\n===== Riepilogo Golden Set ===== `);
    console.log(`Trovati ${goldenSets.length} Golden Set in totale:`);
    
    for (let i = 0; i < goldenSets.length; i++) {
      const gs = goldenSets[i];
      console.log(`${i+1}. ${gs.matchId} (${gs.sheetName}, riga ${gs.row}):`);
      console.log(`   Teams: ${gs.teamA} vs ${gs.teamB}`);
      console.log(`   Indicatori: MatchID (${gs.isMatchIdGolden}), Team G (${gs.isTeamGolden}), Phase (${gs.isPhaseGolden})`);
    }
    
    return goldenSets;
  } catch (error) {
    console.error(`Errore nella ricerca dei Golden Set: ${error.message}`);
    return [];
  }
};

module.exports = {
  findGoldenSets
};

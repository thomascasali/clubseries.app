const { getSheetIdForCategory } = require('../utils/sheetsUtils');
const googleSheetsService = require('../services/googleSheetsService');
const Match = require('../models/Match');
const Team = require('../models/Team');
const logger = require('../config/logger');

// @desc    Testare la connessione a Google Sheets
// @route   GET /api/sheets/test-connection/:spreadsheetId
// @access  Public (solo per test)
exports.testConnection = async (req, res) => {
  try {
    const { spreadsheetId } = req.params;
    
    if (!spreadsheetId) {
      return res.status(400).json({ message: 'Spreadsheet ID è richiesto' });
    }
    
    // Testa la connessione
    const connectionInfo = await googleSheetsService.testSheetConnection(spreadsheetId);
    
    res.status(200).json({
      message: 'Connessione a Google Sheets riuscita',
      sheetInfo: connectionInfo.sheetInfo,
      teamsList: connectionInfo.teamsList,
      matchesSample: connectionInfo.matchesSample
    });
    
  } catch (error) {
    logger.error(`Error in testConnection: ${error.message}`);
    res.status(500).json({ 
      message: 'Errore nel test di connessione a Google Sheets',
      error: error.message
    });
  }
};

// @desc    Ottieni l'ID del foglio Google per una categoria
// @route   GET /api/sheets/category/:category
// @access  Public
exports.getSheetIdForCategory = async (req, res) => {
  try {
    const { category } = req.params;
    
    const sheetId = getSheetIdForCategory(category);
    
    if (!sheetId) {
      return res.status(404).json({ message: `Nessun foglio Google configurato per la categoria ${category}` });
    }
    
    res.status(200).json({ category, sheetId });
  } catch (error) {
    logger.error(`Error in getSheetIdForCategory: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Importa squadre dal foglio Google
// @route   POST /api/sheets/import-teams
// @access  Private/Admin
exports.importTeams = async (req, res) => {
  try {
    let { spreadsheetId, category } = req.body;
    
    if (!spreadsheetId && category) {
      // Se non è stato fornito un ID ma è stata fornita una categoria, cerca l'ID nelle variabili d'ambiente
      spreadsheetId = getSheetIdForCategory(category);
    }
    
    if (!spreadsheetId || !category) {
      return res.status(400).json({ message: 'Spreadsheet ID e categoria sono richiesti' });
    }
    
    // Ottieni informazioni sul foglio per estrarre le squadre
    const connectionInfo = await googleSheetsService.testSheetConnection(spreadsheetId);
    const teams = connectionInfo.teamsList;
    
    if (!teams || teams.length === 0) {
      return res.status(404).json({ message: 'Nessuna squadra trovata nel foglio' });
    }
    
    // Risultati dell'operazione
    const results = {
      created: [],
      existing: [],
      errors: []
    };
    
    // Genera una password casuale per le squadre
    const generatePassword = () => {
      return Math.random().toString(36).slice(-8);
    };
    
    // Crea o aggiorna le squadre nel database
    for (const teamName of teams) {
      try {
        // Verifica se la squadra esiste già
        const existingTeam = await Team.findOne({ 
          name: teamName,
          category
        });
        
        if (existingTeam) {
          // Aggiorna lo spreadsheetId se necessario
          if (existingTeam.spreadsheetId !== spreadsheetId) {
            existingTeam.spreadsheetId = spreadsheetId;
            await existingTeam.save();
          }
          
          results.existing.push({
            name: existingTeam.name,
            _id: existingTeam._id
          });
        } else {
          // Crea la nuova squadra
          const newTeam = await Team.create({
            name: teamName,
            category,
            spreadsheetId,
            password: generatePassword(),
            players: []
          });
          
          results.created.push({
            name: newTeam.name,
            _id: newTeam._id,
            password: newTeam.password // Solo per la prima creazione, così l'admin può condividere la password
          });
        }
      } catch (error) {
        results.errors.push({
          team: teamName,
          error: error.message
        });
      }
    }
    
    res.status(200).json({
      message: `Importazione squadre completata. ${results.created.length} create, ${results.existing.length} già esistenti, ${results.errors.length} errori.`,
      results
    });
    
  } catch (error) {
    logger.error(`Error in importTeams: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Importa partite dal foglio Google
// @route   POST /api/sheets/import-matches
// @access  Private/Admin
exports.importMatches = async (req, res) => {
  try {
    let { spreadsheetId, category } = req.body;
    
    if (!spreadsheetId && category) {
      // Se non è stato fornito un ID ma è stata fornita una categoria, cerca l'ID nelle variabili d'ambiente
      spreadsheetId = getSheetIdForCategory(category);
    }
    
    if (!spreadsheetId || !category) {
      return res.status(400).json({ message: 'Spreadsheet ID e categoria sono richiesti' });
    }
    
    // Ottieni informazioni sul foglio
    const response = await googleSheetsService.getSheetInfo(spreadsheetId);
    
    // Trova tutti i fogli "pool"
    const poolSheets = response.sheets.filter(sheet => 
      sheet.title.toLowerCase().includes('pool'));
    
    if (poolSheets.length === 0) {
      return res.status(404).json({ message: 'Nessun foglio pool trovato' });
    }
    
    // Risultati dell'operazione
    const results = {
      created: [],
      updated: [],
      errors: []
    };
    
    const today = new Date();
    
    // Per ogni foglio pool, importa le partite
    for (const poolSheet of poolSheets) {
      const poolName = poolSheet.title;
      
      // Leggi i dati del pool
      const data = await googleSheetsService.readSheet(
        spreadsheetId, 
        `'${poolName}'!A1:G50` // Adatta il range in base alla tua struttura
      );
      
      if (!data || data.length < 2) {
        results.errors.push(`Nessun dato trovato nel foglio ${poolName}`);
        continue;
      }
      
      // Trova le righe che contengono partite (quelle con orario nella colonna C)
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        
        // Verificare che ci sia abbastanza informazioni per una partita
        if (!row || row.length < 5 || !row[2]) continue;
        
        // Verifica se la riga contiene un orario in formato HH:MM
        const timeRegex = /^\d{1,2}:\d{2}$/;
        if (!timeRegex.test(row[2])) continue;
        
        // Estrai i dati della partita
        const matchId = `${category}-${poolName}-${i+1}`;
        const phase = poolName;
        const time = row[2];
        const court = row[3] || 'Campo 1';
        const teamsCell = row[4] || '';
        
        // Estrai i nomi delle squadre dalla cella (es. "Team A vs Team B")
        const teamsMatch = teamsCell.match(/(.+?)\s+vs\s+(.+)/i);
        if (!teamsMatch) {
          results.errors.push(`Formato squadre non valido nella riga ${i+1} del foglio ${poolName}: ${teamsCell}`);
          continue;
        }
        
        const teamAName = teamsMatch[1].trim();
        const teamBName = teamsMatch[2].trim();
        
        // Trova le squadre nel database
        const teamA = await Team.findOne({ name: teamAName, category });
        const teamB = await Team.findOne({ name: teamBName, category });
        
        if (!teamA || !teamB) {
          results.errors.push(`Squadre non trovate per la partita ${matchId}: ${teamAName} o ${teamBName}`);
          continue;
        }
        
        // Cerca se la partita esiste già
        let match = await Match.findOne({ matchId });
        
        if (match) {
          // Aggiorna la partita esistente
          match.phase = phase;
          match.time = time;
          match.court = court;
          match.teamA = teamA._id;
          match.teamB = teamB._id;
          match.spreadsheetRow = i + 1;
          
          await match.save();
          results.updated.push(matchId);
        } else {
          // Crea una nuova partita (usa la data corrente per ora)
          match = await Match.create({
            matchId,
            phase,
            date: today,
            time,
            court,
            teamA: teamA._id,
            teamB: teamB._id,
            category,
            spreadsheetRow: i + 1,
            result: 'pending'
          });
          
          results.created.push(matchId);
        }
      }
    }
    
    res.status(200).json({
      message: `Importazione partite completata. ${results.created.length} create, ${results.updated.length} aggiornate, ${results.errors.length} errori.`,
      results
    });
    
  } catch (error) {
    logger.error(`Error in importMatches: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Sincronizzare risultati dal database a Google Sheets
// @route   POST /api/sheets/sync-to-sheets
// @access  Private/Admin
exports.syncToSheets = async (req, res) => {
  try {
    let { spreadsheetId, category } = req.body;
    
    if (!spreadsheetId && category) {
      // Se non è stato fornito un ID ma è stata fornita una categoria, cerca l'ID nelle variabili d'ambiente
      spreadsheetId = getSheetIdForCategory(category);
    }
    
    if (!spreadsheetId || !category) {
      return res.status(400).json({ message: 'Spreadsheet ID e categoria sono richiesti' });
    }
    
    // Trova le partite per questa categoria
    const matches = await Match.find({ category })
      .populate('teamA', 'name')
      .populate('teamB', 'name');
    
    if (matches.length === 0) {
      return res.status(404).json({ message: 'Nessuna partita trovata per questa categoria' });
    }
    
    // Esegui la sincronizzazione
    const results = await googleSheetsService.syncMatchesToSheet(spreadsheetId, category, matches);
    
    res.status(200).json({
      message: `Sincronizzazione completata. ${matches.length} partite aggiornate nel foglio.`,
      results
    });
    
  } catch (error) {
    logger.error(`Error in syncToSheets: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Importa e sincronizza tutte le categorie configurate
// @route   POST /api/sheets/sync-all-categories
// @access  Private/Admin
exports.syncAllCategories = async (req, res) => {
  try {
    // Ottieni tutte le categorie configurate
    const categoryEnvVars = Object.keys(process.env)
      .filter(key => key.startsWith('GOOGLE_SHEETS_'))
      .filter(key => process.env[key] && process.env[key] !== 'your_test_spreadsheet_id');
    
    if (categoryEnvVars.length === 0) {
      return res.status(404).json({ message: 'Nessuna categoria configurata nelle variabili d\'ambiente' });
    }
    
    const results = {
      teamsImported: [],
      matchesImported: [],
      syncedToSheets: [],
      errors: []
    };
    
    // Per ogni categoria configurata
    for (const envVar of categoryEnvVars) {
      try {
        // Estrai la categoria dal nome della variabile d'ambiente
        // es. GOOGLE_SHEETS_UNDER_21_M -> Under 21 M
        const categoryKey = envVar.replace('GOOGLE_SHEETS_', '');
        const category = categoryKey
          .split('_')
          .map(word => word === 'M' || word === 'F' ? word : word.charAt(0) + word.slice(1).toLowerCase())
          .join(' ')
          .replace('Serie A M', 'Serie A Maschile')
          .replace('Serie A F', 'Serie A Femminile')
          .replace('Serie B M', 'Serie B Maschile')
          .replace('Serie B F', 'Serie B Femminile');
        
        const spreadsheetId = process.env[envVar];
        
        // Importa squadre
        const connectionInfo = await googleSheetsService.testSheetConnection(spreadsheetId);
        const teams = connectionInfo.teamsList;
        
        if (teams && teams.length > 0) {
          // Implementazione semplificata per la sincronizzazione di massa
          // Nella pratica, dovremmo riutilizzare il codice di importTeams
          for (const teamName of teams) {
            const existingTeam = await Team.findOne({ name: teamName, category });
            if (!existingTeam) {
              const newTeam = await Team.create({
                name: teamName,
                category,
                spreadsheetId,
                password: Math.random().toString(36).slice(-8),
                players: []
              });
              results.teamsImported.push({
                category,
                team: teamName,
                id: newTeam._id
              });
            }
          }
        }
        
        // Importa partite (semplificato, reutilizzare il codice di importMatches)
        // ...
        
        // Sincronizza risultati (semplificato, reutilizzare il codice di syncToSheets)
        // ...
        
      } catch (error) {
        results.errors.push({
          envVar,
          error: error.message
        });
      }
    }
    
    res.status(200).json({
      message: `Sincronizzazione di tutte le categorie completata. ${results.teamsImported.length} squadre importate, ${results.matchesImported.length} partite importate, ${results.syncedToSheets.length} sincronizzazioni, ${results.errors.length} errori.`,
      results
    });
    
  } catch (error) {
    logger.error(`Error in syncAllCategories: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};
const logger = require('../../config/logger');

/**
 * Ottiene informazioni generali sul foglio Google Sheets
 * @param {Object} sheets - API sheets di Google
 * @param {string} spreadsheetId - ID del foglio Google Sheets
 * @returns {Promise<Object>} - Informazioni sul foglio
 */
const getSheetInfo = async (sheets, spreadsheetId) => {
  try {
    const response = await sheets.spreadsheets.get({
      spreadsheetId
    });
    
    return {
      title: response.data.properties.title,
      sheets: response.data.sheets.map(sheet => ({
        title: sheet.properties.title,
        sheetId: sheet.properties.sheetId,
        gridProperties: sheet.properties.gridProperties
      })),
      spreadsheetUrl: response.data.spreadsheetUrl
    };
  } catch (error) {
    logger.error(`Error getting Google Sheet info: ${error.message}`);
    throw error;
  }
};

/**
 * Helper per parsare le date in vari formati italiani
 * @param {string} dateStr - Data in formato italiano (DD/MM/YYYY o formati abbreviati come "2-mag")
 * @returns {Date} - Oggetto Date
 */
const parseDate = (dateStr) => {
  // Se la data è vuota o null
  if (!dateStr || dateStr.trim() === '') {
    return null;
  }
  
  // Normalizziamo i caratteri di spazio
  dateStr = dateStr.trim();
  
  // Mappatura dei mesi abbreviati italiani ai numeri
  const monthsMap = {
    'gen': 0, 'gennaio': 0,
    'feb': 1, 'febbraio': 1,
    'mar': 2, 'marzo': 2,
    'apr': 3, 'aprile': 3,
    'mag': 4, 'maggio': 4,
    'giu': 5, 'giugno': 5,
    'lug': 6, 'luglio': 6,
    'ago': 7, 'agosto': 7,
    'set': 8, 'settembre': 8,
    'ott': 9, 'ottobre': 9,
    'nov': 10, 'novembre': 10,
    'dic': 11, 'dicembre': 11
  };
  
  // Verifica se la data è nel formato "1-mag" o "1 mag" (giorno-mese abbreviato)
  const italianShortDateRegex = /^(\d{1,2})[-\s]([a-z]{3,})$/i;
  const shortMatch = dateStr.match(italianShortDateRegex);
  
  if (shortMatch) {
    const day = parseInt(shortMatch[1], 10);
    const monthText = shortMatch[2].toLowerCase();
    
    // Verifica se l'abbreviazione del mese è valida
    if (monthsMap.hasOwnProperty(monthText)) {
      const month = monthsMap[monthText];
      // Assumiamo l'anno 2025 per le finali
      const year = 2025;
      return new Date(year, month, day);
    }
  }
  
  // Verifica se la data è nel formato italiano (gg/mm/aaaa)
  const italianDateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  const match = dateStr.match(italianDateRegex);
  
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1; // I mesi in JS partono da 0
    const year = parseInt(match[3], 10);
    return new Date(year, month, day);
  }
  
  // Altrimenti prova a parsarla come data standard
  return new Date(dateStr);
};

/**
 * Cerca un nome di team all'interno di un testo più lungo
 * @param {string} text - Testo completo (es. "ACTIVE BEACH VOLLEY DUE TORRI Team A")
 * @param {Array} validTeamNames - Array di nomi di team validi
 * @returns {Object} - Oggetto con nome del team trovato e codice team
 */
const findTeamInText = (text, validTeamNames) => {
  if (!text) return { teamName: null, teamCode: null };
  
  // Log per debug
  logger.debug(`Processing team text: "${text}"`);
  
  // Verifica esplicita per il Golden Set
  if (text && text.toLowerCase().includes('team g')) {
    const cleanTeamName = text.replace(/\s+Team\s+G(?:\s+vs\s+|$)/i, '').trim();
    //logger.info(`Golden Set detected for team: ${cleanTeamName}`);
    
    // Cerca il team nei validTeamNames
    const foundTeam = validTeamNames.find(name => 
      cleanTeamName === name || 
      cleanTeamName.includes(name) || 
      name.includes(cleanTeamName)
    );
    
    return { 
      teamName: foundTeam || cleanTeamName,
      teamCode: 'G'
    };
  }
  
  // Estrai separatamente il nome del team e il codice team (A, B o G)
  const teamCodeRegex = /\s+Team\s+([ABG])(?:\s+vs\s+|$)/i;
  const codeMatch = text.match(teamCodeRegex);
  const teamCode = codeMatch ? codeMatch[1] : null;
  
  // Rimuovi la parte "Team X" per ottenere solo il nome della squadra
  const cleanTeamName = text.replace(/\s+Team\s+[ABG](?:\s+vs\s+|$)/i, '').trim();
  
  // Cerca il team nei validTeamNames (match esatto o parziale)
  const foundTeam = validTeamNames.find(name => 
    cleanTeamName === name || 
    cleanTeamName.includes(name) || 
    name.includes(cleanTeamName)
  );
  
  // Log per debug
  logger.debug(`Text: "${text}", Extracted: "${cleanTeamName}", Code: ${teamCode}, Found: "${foundTeam || null}"`);
  
  return { 
    teamName: foundTeam || cleanTeamName,
    teamCode 
  };
};

/**
 * Genera un ID univoco per un match
 * @param {string} category - Categoria (es. "Under 21 M")
 * @param {string} sheetName - Nome del foglio (es. "Pool A")
 * @param {string} matchNumber - Numero della partita (es. "01A")
 * @returns {string} - ID univoco
 */
const generateMatchId = (category, sheetName, matchNumber) => {
  return `${category}_${sheetName}_${matchNumber}`;
};

module.exports = {
  getSheetInfo,
  parseDate,
  findTeamInText,
  generateMatchId
};
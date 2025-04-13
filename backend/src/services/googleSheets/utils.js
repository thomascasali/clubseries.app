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
  if (!text) return { teamName: '', teamCode: null };

  const lower = text.toLowerCase().trim();

  // Riconoscimento esplicito di Golden Set
  if (lower.includes('team g') || lower === 'g') {
    return { teamName: 'Golden Set Team', teamCode: 'G' };
  }

  // Cerca teamCode A o B
  let teamCode = null;
  if (/team\\s*a$/i.test(text) || /\\bA\\b/.test(text)) teamCode = 'A';
  if (/team\\s*b$/i.test(text) || /\\bB\\b/.test(text)) teamCode = 'B';

  // Rimuove eventuali suffissi tipo 'Team A', 'Team B' o '- A/B'
  const cleaned = text
    .replace(/[-–]?\\s*Team\\s*[ABG]$/i, '')
    .replace(/\\bTeam\\b\\s*[ABG]/i, '')
    .replace(/[-–]?\\s*[ABG]$/i, '')
    .trim();

  // Trova il nome squadra più simile (match completo o parziale)
  let found = validTeamNames.find(name => name.toLowerCase() === cleaned.toLowerCase());
  if (!found) {
    found = validTeamNames.find(name => cleaned && name.toLowerCase().includes(cleaned.toLowerCase()));
  }

  return {
    teamName: found || cleaned,
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
// backend/src/services/googleSheets/utils.js

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
 * Estrae codice team (A, B, G) da un testo
 * @param {string} text - Testo da analizzare
 * @returns {string|null} - Codice team (A, B, G) o null se non trovato
 */
const extractTeamCode = (text) => {
  if (!text) return null;
  
  // Caso speciale per Golden Set
  if (text.toLowerCase().includes('team g')) return 'G';
  
  // Cerca pattern come "Team A", "Team B" o "-A", "-B" alla fine della stringa
  const teamCodeRegex = /(?:team\s+([ABG])|\-([ABG]))(?:\s+|$)/i;
  const match = text.match(teamCodeRegex);
  
  if (match) {
    return (match[1] || match[2]).toUpperCase();
  }
  
  // Se il match è esattamente "A" o "B"
  if (/^[ABG]$/.test(text.trim())) {
    return text.trim().toUpperCase();
  }
  
  return null;
};

/**
 * Cerca un nome di team all'interno di un testo più lungo
 * @param {string} text - Testo completo (es. "ACTIVE BEACH VOLLEY DUE TORRI Team A")
 * @param {Array} validTeamNames - Array di nomi di team validi
 * @returns {Object} - Oggetto con nome del team trovato e codice team
 */
const findTeamInText = (text, validTeamNames) => {
  if (!text) return { teamName: '', teamCode: null };
  
  // Estrai il codice team
  const teamCode = extractTeamCode(text);
  
  // Se è un Golden Set, gestiscilo in modo speciale
  if (teamCode === 'G' || text.toLowerCase().includes('golden')) {
    // Ripulisci la parte "Team G" o simili per trovare il nome del team
    const cleanText = text
      .replace(/\s+team\s+g/i, '')
      .replace(/\s+g$|\-g$/i, '')
      .trim();
    
    // Cerca corrispondenza nei nomi validi
    const bestMatch = findBestTeamMatch(cleanText, validTeamNames);
    
    return {
      teamName: bestMatch || cleanText,
      teamCode: 'G'
    };
  }
  
  // Per team normali, ripulisci il testo dal codice team
  const cleanText = text
    .replace(/\s+team\s+[ABG]/i, '')
    .replace(/\s+[AB]$|\-[AB]$/i, '')
    .trim();
  
  // Cerca corrispondenza nei nomi validi
  const bestMatch = findBestTeamMatch(cleanText, validTeamNames);
  
  return {
    teamName: bestMatch || cleanText,
    teamCode: teamCode || (text.includes('A') ? 'A' : (text.includes('B') ? 'B' : null))
  };
};

/**
 * Trova la migliore corrispondenza per un nome di team
 * @param {string} teamText - Testo del team da cercare
 * @param {Array} validTeamNames - Array di nomi di team validi
 * @returns {string|null} - Nome del team trovato o null
 */
const findBestTeamMatch = (teamText, validTeamNames) => {
  if (!teamText || !validTeamNames || !validTeamNames.length) return null;
  
  // 1. Prima cerca una corrispondenza esatta case-insensitive
  const exactMatch = validTeamNames.find(name => 
    name.toLowerCase() === teamText.toLowerCase()
  );
  if (exactMatch) return exactMatch;
  
  // 2. Poi cerca se il testo è contenuto in un nome valido o viceversa
  const partialMatch = validTeamNames.find(name => 
    name.toLowerCase().includes(teamText.toLowerCase()) ||
    teamText.toLowerCase().includes(name.toLowerCase())
  );
  if (partialMatch) return partialMatch;
  
  // 3. Nessuna corrispondenza trovata
  return null;
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

/**
 * Estrae il match base ID da un match ID, rimuovendo i suffissi A, B o G
 * @param {string} matchId - ID completo del match (es. "Under_21_M_Pool_A_01A")
 * @returns {string} - ID base senza il suffisso
 */
const extractBaseMatchId = (matchId) => {
  if (!matchId) return '';
  
  // Caso 1: matchId termina con A, B o G
  if (/[ABG]$/i.test(matchId)) {
    return matchId.slice(0, -1);
  }
  
  // Caso 2: matchId ha un numero seguito da A, B o G (es. "01A", "02B", "03G")
  const regex = /(\d+)[ABG]$/i;
  const match = matchId.match(regex);
  if (match) {
    const numberPart = match[1];
    const indexOfNumber = matchId.lastIndexOf(numberPart);
    return matchId.substring(0, indexOfNumber + numberPart.length);
  }
  
  // Nessuna corrispondenza, ritorna l'ID originale
  return matchId;
};

module.exports = {
  getSheetInfo,
  parseDate,
  findTeamInText,
  generateMatchId,
  extractTeamCode,
  findBestTeamMatch,
  extractBaseMatchId
};
/**
 * Ottiene l'ID del foglio Google Sheets per una determinata categoria
 * @param {string} category - Categoria (es. 'Under 21 M')
 * @returns {string|null} - ID del foglio Google Sheets o null se non trovato
 */
const getSheetIdForCategory = (category) => {
  // Mappa le categorie ai nomi delle variabili d'ambiente
  const categoryToEnvVar = {
    'Under 21 M': 'GOOGLE_SHEETS_UNDER_21_M',
    'Under 21 F': 'GOOGLE_SHEETS_UNDER_21_F',
    'Eccellenza M': 'GOOGLE_SHEETS_ECCELLENZA_M',
    'Eccellenza F': 'GOOGLE_SHEETS_ECCELLENZA_F',
    'Amatoriale M': 'GOOGLE_SHEETS_AMATORIALE_M',
    'Amatoriale F': 'GOOGLE_SHEETS_AMATORIALE_F',
    'Over 35 F': 'GOOGLE_SHEETS_OVER_35_F',
    'Over 40 F': 'GOOGLE_SHEETS_OVER_40_F',
    'Over 43 M': 'GOOGLE_SHEETS_OVER_43_M',
    'Over 50 M': 'GOOGLE_SHEETS_OVER_50_M',
    'Serie A Maschile': 'GOOGLE_SHEETS_SERIE_A_M',
    'Serie A Femminile': 'GOOGLE_SHEETS_SERIE_A_F',
    'Serie B Maschile': 'GOOGLE_SHEETS_SERIE_B_M',
    'Serie B Femminile': 'GOOGLE_SHEETS_SERIE_B_F',
  };

  const envVar = categoryToEnvVar[category];
  if (!envVar) {
    return null;
  }

  return process.env[envVar] || null;
};

module.exports = {
  getSheetIdForCategory,
};

/**
 * Utility per la gestione delle categorie e dei relativi colori
 */

// Mappa colori principali per le categorie
const categoryColors = {
  'Eccellenza F': '#ffecb3', // Giallo chiaro
  'Eccellenza M': '#fff9c4', // Giallo molto chiaro
  'Amatoriale F': '#e1f5fe', // Azzurro chiaro
  'Amatoriale M': '#b3e5fc', // Azzurro
  'Over 35 F': '#f8bbd0', // Rosa chiaro
  'Over 40 F': '#f48fb1', // Rosa
  'Over 43 M': '#c8e6c9', // Verde chiaro
  'Over 50 M': '#a5d6a7', // Verde
  'Under 21 F': '#d1c4e9', // Lavanda
  'Under 21 M': '#b39ddb', // Viola chiaro
  'Serie A Femminile': '#ffcc80', // Arancione chiaro
  'Serie A Maschile': '#ffb74d', // Arancione
  'Serie B Femminile': '#bcaaa4', // Beige
  'Serie B Maschile': '#a1887f', // Marrone chiaro
};

// Colori più scuri per i bordi
const borderColors = {
  'Eccellenza F': '#ffc107', // Giallo
  'Eccellenza M': '#ffc107', // Giallo
  'Amatoriale F': '#03a9f4', // Azzurro
  'Amatoriale M': '#0288d1', // Azzurro scuro
  'Over 35 F': '#ec407a', // Rosa
  'Over 40 F': '#d81b60', // Rosa scuro
  'Over 43 M': '#4caf50', // Verde
  'Over 50 M': '#388e3c', // Verde scuro
  'Under 21 F': '#7e57c2', // Viola
  'Under 21 M': '#5e35b1', // Viola scuro
  'Serie A Femminile': '#ff9800', // Arancione
  'Serie A Maschile': '#f57c00', // Arancione scuro
  'Serie B Femminile': '#795548', // Marrone
  'Serie B Maschile': '#5d4037', // Marrone scuro
};

/**
 * Determina se un colore è chiaro o scuro
 * @param {string} color - Colore in formato esadecimale
 * @returns {boolean} - true se il colore è chiaro, false se è scuro
 */
const isLightColor = (color) => {
  // Rimuovi il simbolo # se presente
  const hex = color.replace('#', '');
  
  // Converti in valori RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Calcola la luminosità (formula standard)
  // Valori più alti indicano colori più chiari
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Restituisci true se la luminosità è maggiore di 0.5 (colore chiaro)
  return luminance > 0.6;
};

/**
 * Restituisce il colore appropriato per la categoria specificata
 * @param {string} category - Nome della categoria
 * @param {string} type - Tipo di colore ('background', 'border', 'text')
 * @returns {string} - Codice colore esadecimale
 */
export const getCategoryColor = (category, type = 'background') => {
  // Valori di default
  const defaultBackground = '#e3f2fd'; // Blu molto chiaro
  const defaultBorder = '#1976d2'; // Blu
  
  if (!category) return defaultBackground;
  
  // Ottieni il colore dello sfondo
  const backgroundColor = categoryColors[category] || defaultBackground;
  
  // Per il colore del bordo
  if (type === 'border') {
    return borderColors[category] || defaultBorder;
  }
  
  // Per il colore del testo
  if (type === 'text') {
    // Usa il colore del bordo per il testo, a meno che lo sfondo non sia troppo chiaro
    const bgColor = type === 'background' ? backgroundColor : borderColors[category] || defaultBorder;
    return isLightColor(bgColor) ? '#000000' : '#ffffff';
  }
  
  // Per lo sfondo
  return backgroundColor;
};

/**
 * Restituisce gli stili CSS per la chip di una categoria
 * @param {string} category - Nome della categoria
 * @returns {Object} - Oggetto con stili CSS
 */
export const getCategoryChipStyles = (category) => {
  const backgroundColor = getCategoryColor(category, 'background');
  const borderColor = getCategoryColor(category, 'border');
  const textColor = isLightColor(backgroundColor) ? '#000000' : '#ffffff';
  
  return {
    backgroundColor: backgroundColor,
    borderColor: borderColor,
    color: textColor,
    '& .MuiChip-label': {
      fontWeight: 500
    }
  };
};

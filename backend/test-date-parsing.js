require('dotenv').config();

// Definizione diretta della funzione parseDate per il test
const parseDate = (dateStr) => {
  // Se la data è vuota o null
  if (!dateStr || dateStr.trim() === '') {
    return null;
  }
  
  // Mappatura dei mesi abbreviati italiani ai numeri
  const monthsMap = {
    'gen': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'mag': 4, 'giu': 5,
    'lug': 6, 'ago': 7, 'set': 8, 'ott': 9, 'nov': 10, 'dic': 11
  };
  
  // Verifica se la data è nel formato "1-mag" (giorno-mese abbreviato)
  const italianShortDateRegex = /^(\d{1,2})-([a-z]{3})$/i;
  const shortMatch = dateStr.match(italianShortDateRegex);
  
  if (shortMatch) {
    const day = parseInt(shortMatch[1], 10);
    const monthAbbr = shortMatch[2].toLowerCase();
    
    // Verifica se l'abbreviazione del mese è valida
    if (monthsMap.hasOwnProperty(monthAbbr)) {
      const month = monthsMap[monthAbbr];
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

// Test di parsing per diversi formati di date
function testDateParsing() {
  const dates = [
    '2-mag',
    '30-apr',
    '15-giu',
    '1-gen',
    '31-dic',
    '10/05/2025',
    '01/01/2025',
    '2025-01-01',
    '2-mag       ', // Con spazi extra
    '  30-apr'      // Con spazi all'inizio
  ];
  
  console.log('Test parsing date in vari formati:\n');
  
  dates.forEach(dateStr => {
    const parsedDate = parseDate(dateStr);
    console.log(`Originale: "${dateStr}" -> Parsata: ${parsedDate ? parsedDate.toLocaleDateString('it-IT') : 'Invalid Date'}`);
  });
}

// Esegui il test
testDateParsing();
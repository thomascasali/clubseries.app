// src/components/dashboard/MatchUtils.js

import moment from 'moment';
import 'moment/locale/it';

// Calcola il risultato in set per un match
export const calculateSetResult = (match) => {
  if (!match || !match.officialScoreA || !match.officialScoreB || match.officialScoreA.length === 0) {
    return '';
  }
  
  let setsA = 0;
  let setsB = 0;
  for (let i = 0; i < match.officialScoreA.length; i++) {
    if (parseInt(match.officialScoreA[i]) > parseInt(match.officialScoreB[i])) {
      setsA++;
    } else if (parseInt(match.officialScoreB[i]) > parseInt(match.officialScoreA[i])) {
      setsB++;
    }
  }
  
  return `${setsA} - ${setsB}`;
};

// Formatta il punteggio dettagliato
export const formatDetailedScore = (match) => {
  if (!match || !match.officialScoreA || !match.officialScoreB || match.officialScoreA.length === 0) {
    return '';
  }
  
  return match.officialScoreA.map((score, i) => 
    `${score}-${match.officialScoreB[i]}`
  ).join(', ');
};

// Determina il vincitore del match group
export const determineGroupWinner = (group) => {
  // Caso 1: Se c'è un Golden Set con un risultato, questo è decisivo
  if (group.goldenSet && 
      group.goldenSet.officialScoreA && 
      group.goldenSet.officialScoreB && 
      group.goldenSet.officialScoreA.length > 0) {
    
    const scoreA = parseInt(group.goldenSet.officialScoreA[0]);
    const scoreB = parseInt(group.goldenSet.officialScoreB[0]);
    
    if (scoreA > scoreB) {
      return group.teamA;
    } else if (scoreB > scoreA) {
      return group.teamB;
    }
    return null; // Pareggio o risultato non chiaro
  }
  
  // Caso 2: Se non c'è Golden Set, contiamo le vittorie normali
  if (!group.matches || group.matches.length === 0) {
    return null;
  }
  
  // Conta le vittorie per squadra
  let teamAWins = 0;
  let teamBWins = 0;
  
  group.matches.forEach(match => {
    if (match.officialResult === 'teamA') {
      teamAWins++;
    } else if (match.officialResult === 'teamB') {
      teamBWins++;
    }
  });
  
  // Se una squadra ha vinto più partite dell'altra
  if (teamAWins > teamBWins) {
    return group.teamA;
  } else if (teamBWins > teamAWins) {
    return group.teamB;
  }

  return null; // Pareggio o risultato non chiaro
};


const formatDisplayPhase = (phase, matchId) => {
  if (!phase) return 'N/A';
  
  // Caso 1: Pool con formato "Pool A - 08A vs 09A"
  const poolMatchPattern = /^(Pool \w+) - (\d+)A vs (\d+)A$/;
  if (poolMatchPattern.test(phase)) {
    const match = phase.match(poolMatchPattern);
    // Rimuovi gli zeri iniziali dai numeri
    return `${match[1]} - ${parseInt(match[2])} vs ${parseInt(match[3])}`;
  }
  
  // Caso 2: Pool con formato "Pool A F3 - A vs A"
  const poolFormatPattern = /^(Pool \w+) (F\d+) - A vs A$/;
  if (poolFormatPattern.test(phase)) {
    const match = phase.match(poolFormatPattern);
    return `${match[1]} - ${match[2]}`;
  }
  
  // Caso 3: Play-In con formato "03A-G vs 04B-G"
  if (phase.includes('Play-In') || (matchId && matchId.includes('Play-In'))) {
    // Cerca pattern come "01A-G vs 02B-G" o simili
    const playInPattern = /(\d+)([A-Z])-G vs (\d+)([A-Z])-G/;
    const match = phase.match(playInPattern);
    
    if (match) {
      // Estrai i numeri e le lettere delle pool
      return `Play-In ${parseInt(match[1])}${match[2]} vs ${parseInt(match[3])}${match[4]}`;
    }
    
    // Se non corrisponde al pattern, mantieni Play-In + resto
    if (phase.toLowerCase().includes('play-in')) {
      return phase;
    }
    
    return 'Play-In';
  }
  
  // Caso 4: Draw Schedule con formato "Ottavi - 05A vs 12A"
  const drawSchedulePattern = /^(\w+) - (\d+)A vs (\d+)A$/;
  if (drawSchedulePattern.test(phase)) {
    const match = phase.match(drawSchedulePattern);
    // Rimuovi gli zeri iniziali dai numeri
    return `${match[1]} - ${parseInt(match[2])} vs ${parseInt(match[3])}`;
  }
  
  // Default: ritorna la fase originale
  return phase;
};

export const groupRelatedMatches = (matchesList) => {
  if (!matchesList || matchesList.length === 0) return [];

  // Aggruppiamo i match per baseMatchId (parte comune del matchId senza l'ultimo carattere A/B/G)
  const groups = {};
  
  matchesList.forEach(match => {
    // Debug per esaminare il formato della data
    if (match.date) {
      //console.log(`Match ID: ${match.matchId}, Date: ${match.date}, Type: ${typeof match.date}`);
    }
    
    // Estrai la parte base del matchId (rimuovendo l'ultimo carattere se è A, B o G)
    let baseMatchId = match.matchId;
    if (baseMatchId && /[ABG]$/i.test(baseMatchId)) {
      baseMatchId = baseMatchId.slice(0, -1);
    }
    
    // Se non abbiamo ancora un gruppo per questo baseMatchId, creane uno nuovo
    if (!groups[baseMatchId]) {
      
      const initialDisplayPhase = formatDisplayPhase(match.phase, match.matchId);

      groups[baseMatchId] = {
        id: baseMatchId,
        matches: [],
        goldenSet: null,
        teamA: null,
        teamB: null,
        category: match.category,
        phase: match.phase || 'N/A',
        displayPhase: initialDisplayPhase,
        date: null,
        time: null,
        court: null,
        sheetName: match.sheetName
      };
    }
    
    // Determina se questo match è un Golden Set
    if (match.isGoldenSet || match.matchId.endsWith('G')) {
      groups[baseMatchId].goldenSet = match;
    } else {
      groups[baseMatchId].matches.push(match);
      
      // Se è la prima partita del gruppo, inizializza le squadre
      if (groups[baseMatchId].teamA === null) {
        groups[baseMatchId].teamA = {
          name: match.teamA.name.replace(/\s+Team [ABG]$/i, ''),
          id: match.teamA._id
        };
        groups[baseMatchId].teamB = {
          name: match.teamB.name.replace(/\s+Team [ABG]$/i, ''),
          id: match.teamB._id
        };
      }
      
      // Se questo match termina con 'A', imposta come partita di riferimento per data/ora/campo
      if (match.matchId.endsWith('A')) {
        // Assicuriamoci che la data sia in un formato utilizzabile
        let dateValue = match.date;
        
        // Se è un oggetto Date, convertiamolo in un formato stringa ISO
        if (dateValue instanceof Date) {
          dateValue = dateValue.toISOString().split('T')[0];
        } 
        // Se è una stringa ISO con timestamp, estraiamo solo la data
        else if (typeof dateValue === 'string' && dateValue.includes('T')) {
          dateValue = dateValue.split('T')[0];
        }
        
        groups[baseMatchId].date = dateValue;
        groups[baseMatchId].time = match.time;
        groups[baseMatchId].court = match.court;
        groups[baseMatchId].phase = match.phase;
        groups[baseMatchId].displayPhase = formatDisplayPhase(match.phase, match.matchId);
      }
    }
  });

  // Secondo passaggio: gestione fallback per info mancanti
  Object.values(groups).forEach(group => {
    // Se manca la data, cerchiamo in tutte le partite disponibili
    if (!group.date) {
      // Prima cerchiamo le partite di tipo 'A'
      const matchA = group.matches.find(m => m.matchId && m.matchId.endsWith('A'));
      
      if (matchA && matchA.date) {
        // Normalizza la data come sopra
        let dateValue = matchA.date;
        if (dateValue instanceof Date) {
          dateValue = dateValue.toISOString().split('T')[0];
        } else if (typeof dateValue === 'string' && dateValue.includes('T')) {
          dateValue = dateValue.split('T')[0];
        }
        
        group.date = dateValue;
        group.time = matchA.time;
        group.court = matchA.court;
        group.phase = matchA.phase;
        group.displayPhase = matchA.phase;
      } else {
        // Altrimenti prendiamo la prima partita non Golden
        const normalMatch = group.matches.find(m => !m.isGoldenSet);
        if (normalMatch && normalMatch.date) {
          // Normalizza la data
          let dateValue = normalMatch.date;
          if (dateValue instanceof Date) {
            dateValue = dateValue.toISOString().split('T')[0];
          } else if (typeof dateValue === 'string' && dateValue.includes('T')) {
            dateValue = dateValue.split('T')[0];
          }
          
          group.date = dateValue;
          group.time = normalMatch.time;
          group.court = normalMatch.court;
          group.phase = normalMatch.phase;
          group.displayPhase = normalMatch.phase;
        } else if (group.goldenSet && group.goldenSet.date) {
          // Come ultima risorsa, prendiamo dal Golden Set
          let dateValue = group.goldenSet.date;
          if (dateValue instanceof Date) {
            dateValue = dateValue.toISOString().split('T')[0];
          } else if (typeof dateValue === 'string' && dateValue.includes('T')) {
            dateValue = dateValue.split('T')[0];
          }
          
          group.date = dateValue;
          group.time = group.goldenSet.time;
          group.court = group.goldenSet.court;
          group.phase = group.goldenSet.phase;
          group.displayPhase = group.goldenSet.phase;
        }
      }
    }
    
    // Debug per verificare lo stato finale
    //console.log(`Group ID: ${group.id}, Final Date: ${group.date}, Type: ${typeof group.date}`);
    
    // Nel caso in cui non abbiamo trovato le squadre principali
    if (!group.teamA && group.goldenSet) {
      group.teamA = {
        name: group.goldenSet.teamA.name.replace(/\s+Team [ABG]$/i, ''),
        id: group.goldenSet.teamA._id
      };
      group.teamB = {
        name: group.goldenSet.teamB.name.replace(/\s+Team [ABG]$/i, ''),
        id: group.goldenSet.teamB._id
      };
    }
  });

  // Converte il dizionario in array e ordina per data e ora
  return Object.values(groups).sort((a, b) => {
    try {
      const dateA = a.date ? moment(`${a.date}T${a.time || '00:00'}`) : null;
      const dateB = b.date ? moment(`${b.date}T${b.time || '00:00'}`) : null;
      
      if (!dateA || !dateA.isValid()) return 1;
      if (!dateB || !dateB.isValid()) return -1;
      return dateA - dateB;
    } catch (e) {
      console.error('Error sorting dates:', e);
      return 0;
    }
  });
};

// Filtra le partite in base alle ultime 2 ore e future
export const filterMatches = (allMatches, subscribedTeams, showOnlySubscribed, currentUser) => {
  if (!allMatches || !allMatches.length) {
    console.log("Nessuna partita da filtrare");
    return [];
  }
  
  console.log("Filtrando partite, totale:", allMatches.length);
  
  const now = moment();
  const twoHoursAgo = moment().subtract(2, 'hours');
  
  // Per ogni partita, controlliamo se è nelle ultime 2 ore o futura
  let relevantMatches = allMatches.filter(match => {
    // Se è un Golden Set, manteniamolo sempre per ora
    if (match.isGoldenSet || match.teamACode === 'G' || match.teamBCode === 'G') {
      //return true;
    }
    
    // Per le partite Play-In o Draw Schedule, includiamole sempre
    // poiché sono importanti fasi finali
    if (match.sheetName.toLowerCase().includes('play-in') || 
        match.sheetName.toLowerCase().includes('draw schedule') ||
        (match.sheetName.toLowerCase().includes('pool')) ||
        (match.phase && (match.phase.toLowerCase().includes('pool') ||
                      match.phase.toLowerCase().includes('play-in') || 
                      match.phase.toLowerCase().includes('quarti') ||
                      match.phase.toLowerCase().includes('semi') ||
                      match.phase.toLowerCase().includes('finale')))) {
    return true;
  }
    
    if (!match.date || !match.time || match.time === 'N/A') {
      console.log("Partita esclusa per data/ora mancante o non valida:", match);
      return false;
    }
    
    // Combina data e ora per confronto
    let matchDateTime;
    try {
      // La data arriva già in formato ISO, quindi dobbiamo parsarla direttamente
      const dateObj = new Date(match.date);
      // Estraiamo solo la parte della data (YYYY-MM-DD)
      const datePart = dateObj.toISOString().split('T')[0];
      // Combiniamo con l'ora
      matchDateTime = moment(`${datePart}T${match.time}`);
      
      if (!matchDateTime.isValid()) {
        console.log("Partita esclusa per matchDateTime non valido:", match);
        return false;
      }
    } catch (e) {
      console.error(`Errore nel parsing della data/ora per match ${match._id}:`, e);
      return false;
    }
    
    // Verifica se la partita è nelle ultime 2 ore o futura
    return matchDateTime.isAfter(twoHoursAgo);
  });
  
  console.log("Partite rilevanti dopo filtro temporale:", relevantMatches.length);
  
  // Se l'utente è autenticato e vuole vedere solo le partite delle squadre sottoscritte
  if (currentUser && showOnlySubscribed && subscribedTeams && subscribedTeams.length > 0) {
    console.log("Applicando filtro per squadre sottoscritte");
    const subscribedTeamIds = subscribedTeams.map(team => team._id);
    
    // Tieni traccia dei Golden Set che corrispondono a partite delle squadre sottoscritte
    const relevantGoldenSetIds = new Set();
    
    // Prima fase: identifica partite normali di squadre sottoscritte e i loro Golden Set
    relevantMatches.forEach(match => {
      if (!match.isGoldenSet && 
          (match.teamA && subscribedTeamIds.includes(match.teamA._id) ||
           match.teamB && subscribedTeamIds.includes(match.teamB._id))) {
        // Se questa partita ha un relatedMatchId che è un Golden Set, includiamolo
        if (match.relatedMatchId) {
          relevantGoldenSetIds.add(match.relatedMatchId);
        }
      }
    });
    
    // Seconda fase: filtra le partite
    relevantMatches = relevantMatches.filter(match => {
      // Se è un Golden Set, controllare se è rilevante
      if (match.isGoldenSet || match.teamACode === 'G' || match.teamBCode === 'G') {
        return relevantGoldenSetIds.has(match._id);
      }
      
      // Altrimenti, controlla se la squadra è sottoscritta
      const isTeamASubscribed = match.teamA && subscribedTeamIds.includes(match.teamA._id);
      const isTeamBSubscribed = match.teamB && subscribedTeamIds.includes(match.teamB._id);
      
      return isTeamASubscribed || isTeamBSubscribed;
    });
    
    console.log("Partite dopo filtro squadre:", relevantMatches.length);
  }
  
  return relevantMatches;
};

export const filterRelevantGroups = (groups) => {
  const now = moment();
  const twoHoursAgo = moment().subtract(2, 'hours');

  return groups.filter(group => {
    if (!group.date || !group.time || group.time === 'N/A') {
      console.log("Gruppo escluso per data/ora mancante:", group);
      return false;
    }

    const matchDateTime = moment(`${group.date} ${group.time}`, 'YYYY-MM-DD HH:mm');
    if (!matchDateTime.isValid()) {
      console.log("Data non valida per gruppo:", group, `${group.date} ${group.time}`);
      return false;
    }

    const isValid = matchDateTime.isAfter(twoHoursAgo);
    //console.log("Verifica data gruppo:", group, "Valido?", isValid, matchDateTime.format());
    return isValid;
  });
};


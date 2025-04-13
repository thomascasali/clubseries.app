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

export const groupRelatedMatches = (matchesList) => {
  if (!matchesList || matchesList.length === 0) return [];

  const matchesById = {};
  const groupsById = {};

  matchesList.forEach(match => {
    matchesById[match._id] = match;
  });

  matchesList.forEach(match => {
    let groupId;

    if (match.isGoldenSet) {
      groupId = match._id;

      if (!groupsById[groupId]) {
        groupsById[groupId] = {
          id: groupId,
          goldenSet: match,
          matches: [],
          teamA: {
            name: match.teamA.name.replace(/\s+Team [ABG]$/, ''),
            id: match.teamA._id
          },
          teamB: {
            name: match.teamB.name.replace(/\s+Team [ABG]$/, ''),
            id: match.teamB._id
          },
          category: match.category,
          phase: match.phase,
          // data, ora e campo verranno presi dalla partita Team A vs Team A
          date: null,
          time: null,
          court: null,
          sheetName: match.sheetName
        };
      } else {
        groupsById[groupId].goldenSet = match;
      }
    } else if (match.relatedMatchId) {
      groupId = match.relatedMatchId;

      if (!groupsById[groupId]) {
        const relatedGolden = matchesById[groupId];
        groupsById[groupId] = {
          id: groupId,
          goldenSet: relatedGolden?.isGoldenSet ? relatedGolden : null,
          matches: [],
          teamA: {
            name: match.teamA.name.replace(/\s+Team [ABG]$/, ''),
            id: match.teamA._id
          },
          teamB: {
            name: match.teamB.name.replace(/\s+Team [ABG]$/, ''),
            id: match.teamB._id
          },
          category: match.category,
          phase: match.phase,
          date: null,
          time: null,
          court: null,
          sheetName: match.sheetName
        };
      }

      groupsById[groupId].matches.push(match);

      // Se è la partita Team A vs Team A, imposta come data/ora/campo di riferimento
      if (match.teamACode === 'A' && match.teamBCode === 'A') {
        groupsById[groupId].date = match.date;
        groupsById[groupId].time = match.time;
        groupsById[groupId].court = match.court;
      }
    } else {
      groupId = `single-${match._id}`;
      groupsById[groupId] = {
        id: groupId,
        matches: [match],
        goldenSet: null,
        teamA: {
          name: match.teamA.name.replace(/\s+Team [ABG]$/, ''),
          id: match.teamA._id
        },
        teamB: {
          name: match.teamB.name.replace(/\s+Team [ABG]$/, ''),
          id: match.teamB._id
        },
        category: match.category,
        phase: match.phase,
        date: match.date,
        time: match.time,
        court: match.court,
        sheetName: match.sheetName
      };
    }
  });

  // Filtro di sicurezza nel caso raro in cui non venga trovata la partita Team A vs Team A
  Object.values(groupsById).forEach(group => {
    if (!group.date) {
      // prende la data più recente tra le partite normali, in mancanza della partita A vs A
      const normalMatch = group.matches.find(m => !m.isGoldenSet);
      if (normalMatch) {
        group.date = normalMatch.date;
        group.time = normalMatch.time;
        group.court = normalMatch.court;
      } else if (group.goldenSet) {
        group.date = group.goldenSet.date;
        group.time = group.goldenSet.time;
        group.court = group.goldenSet.court;
      }
    }
  });

  // Converte il dizionario in array e ordina per data e ora
  return Object.values(groupsById).sort((a, b) => {
    const dateA = moment(`${a.date}T${a.time}`, moment.ISO_8601, true);
    const dateB = moment(`${b.date}T${b.time}`, moment.ISO_8601, true);
    if (!dateA.isValid()) return 1;
    if (!dateB.isValid()) return -1;
    return dateA - dateB;
  });
};


// Filtra le partite in base alle ultime 2 ore e future
export const filterMatches = (allMatches, subscribedTeams, showOnlySubscribed, currentUser) => {
  if (!allMatches || !allMatches.length) {
    console.log("Nessuna partita da filtrare");
    return [];
  }
  
  console.log("Filtrando partite, totale:", allMatches.length);
  
  // Log per debugging - vediamo quante partite Play-In ci sono inizialmente
  const initialPlayInMatches = allMatches.filter(match => 
    match.sheetName === 'Play-In' || 
    (match.phase && match.phase.toLowerCase().includes('play-in'))
  );
  console.log(`Inizialmente ${initialPlayInMatches.length} partite Play-In`);
  
  const now = moment();
  const twoHoursAgo = moment().subtract(2, 'hours');
  
  // Separiamo i Golden Set dal resto delle partite
  const goldenSets = allMatches.filter(match => match.isGoldenSet);
  
  console.log(`Trovati ${goldenSets.length} Golden Set da preservare dal filtro temporale`);
  
  // Per ogni partita, controlliamo se è nelle ultime 2 ore o futura
  let relevantMatches = allMatches.filter(match => {
    // Se è un Golden Set, lo includiamo sempre
    if (match.isGoldenSet) {
      return true;
    }
    
    // Per le partite Play-In, controlliamo se hanno data futura e le includiamo sempre
    // indipendentemente dal filtro temporale se la data è nel futuro
    if (match.sheetName === 'Play-In' || 
        (match.phase && match.phase.toLowerCase().includes('play-in'))) {
      // Verifichiamo che la data sia valida
      if (!match.date) {
        console.log(`Play-In match ${match._id} senza data, escluso`);
        return false;
      }
      
      // Verifica se è una data futura
      const matchDate = new Date(match.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Inizio giornata odierna
      
      const isFutureDate = matchDate >= today;
      
      if (isFutureDate) {
        console.log(`Play-In match ${match._id} incluso perché ha data futura: ${match.date}`);
        return true;
      }
    }
    
    if (!match.date || !match.time || match.time === 'N/A') {
      console.log(`Match ${match._id} saltato: data o ora mancante/invalida`);
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
        console.log(`Match ${match._id} saltato: datetime non valido`);
        return false;
      }
    } catch (e) {
      console.error(`Errore nel parsing della data/ora per match ${match._id}:`, e);
      return false;
    }
    
    // Verifica se la partita è nelle ultime 2 ore o futura
    const isRelevant = matchDateTime.isAfter(twoHoursAgo);
    return isRelevant;
  });
  
  console.log("Partite rilevanti dopo filtro temporale:", relevantMatches.length);
  
  // Se l'utente è autenticato e vuole vedere solo le partite delle squadre sottoscritte
  if (currentUser && showOnlySubscribed && subscribedTeams && subscribedTeams.length > 0) {
    console.log("Applicando filtro per squadre sottoscritte");
    const subscribedTeamIds = subscribedTeams.map(team => team._id);
    
    relevantMatches = relevantMatches.filter(match => {
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
    console.log("Verifica data gruppo:", group, "Valido?", isValid, matchDateTime.format());
    return isValid;
  });
};


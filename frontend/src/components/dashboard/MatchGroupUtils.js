// nano frontend/src/components/dashboard/MatchUtils.js

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

// Funzione unificata per raggruppare le partite correlate
export const groupRelatedMatches = (matchesList) => {
  if (!matchesList || matchesList.length === 0) {
    console.log("Nessuna partita da raggruppare");
    return [];
  }
  
  console.log("Raggruppamento partite, totale:", matchesList.length);
  
  // Creiamo una mappa di tutti i match per ID
  const matchesById = {};
  matchesList.forEach(match => {
    matchesById[match._id] = match;
  });
  
  // Identifichiamo i Golden Set
  const goldenSets = matchesList.filter(match => 
    match.isGoldenSet || match.teamACode === 'G' || match.teamBCode === 'G'
  );
  
  console.log(`Trovati ${goldenSets.length} Golden Set`);
  
  // Mappa per i gruppi di match
  const groupMap = {};
  
  // Un set per tenere traccia dei match già elaborati
  const processedMatchIds = new Set();
  
  // Prima elaboriamo tutti i Golden Set come punto centrale di ogni gruppo
  goldenSets.forEach(goldenSet => {
    if (!goldenSet.teamA || !goldenSet.teamB) {
      console.log("Golden Set saltato per mancanza di team:", goldenSet._id);
      return;
    }
    
    // Trova i match correlati a questo Golden Set
    const relatedMatches = matchesList.filter(match => 
      match.relatedMatchId === goldenSet._id && 
      !match.isGoldenSet && 
      match.teamACode !== 'G' && 
      match.teamBCode !== 'G'
    );
    
    // Se troviamo match correlati, creiamo un gruppo
    if (relatedMatches.length > 0) {
      const teamAName = goldenSet.teamA?.name?.replace(/\s+Team [ABG]$/, '') || '';
      const teamBName = goldenSet.teamB?.name?.replace(/\s+Team [ABG]$/, '') || '';
      
      // Determina la fase base
      let basePhase = goldenSet.phase || '';
      if (basePhase.includes(' - ')) {
        basePhase = basePhase.split(' - ')[0].trim();
      } else if (basePhase.includes(' vs ')) {
        basePhase = basePhase.split(' vs ')[0].trim();
      }
      
      // Crea un ID unico per questo gruppo
      const groupId = `group-${goldenSet._id}`;
      
      // Estrai la data e l'ora da uno dei match normali (è più affidabile)
      const referenceMatch = relatedMatches[0];
      
      groupMap[groupId] = {
        id: groupId,
        category: goldenSet.category,
        phase: basePhase || goldenSet.sheetName,
        date: referenceMatch.date || goldenSet.date,
        time: referenceMatch.time || goldenSet.time,
        court: referenceMatch.court || goldenSet.court,
        teamA: { name: teamAName, id: goldenSet.teamA?._id },
        teamB: { name: teamBName, id: goldenSet.teamB?._id },
        matches: relatedMatches,
        goldenSet: goldenSet,
        sheetName: goldenSet.sheetName
      };
      
      // Segna tutti questi match come elaborati
      processedMatchIds.add(goldenSet._id);
      relatedMatches.forEach(match => processedMatchIds.add(match._id));
      
      console.log(`Creato gruppo ${groupId} con Golden Set ${goldenSet._id} e ${relatedMatches.length} match correlati`);
    } else {
      // Se il Golden Set non ha match correlati tramite relatedMatchId,
      // cerchiamo match che hanno questo Golden Set come loro relatedMatchId
      const matchesPointingToGolden = matchesList.filter(match => 
        match.relatedMatchId === goldenSet._id && 
        !match.isGoldenSet
      );
      
      if (matchesPointingToGolden.length > 0) {
        const teamAName = goldenSet.teamA?.name?.replace(/\s+Team [ABG]$/, '') || '';
        const teamBName = goldenSet.teamB?.name?.replace(/\s+Team [ABG]$/, '') || '';
        
        // Determina la fase base
        let basePhase = goldenSet.phase || '';
        if (basePhase.includes(' - ')) {
          basePhase = basePhase.split(' - ')[0].trim();
        } else if (basePhase.includes(' vs ')) {
          basePhase = basePhase.split(' vs ')[0].trim();
        }
        
        // Crea un ID unico per questo gruppo
        const groupId = `group-inverse-${goldenSet._id}`;
        
        // Estrai la data e l'ora da uno dei match normali
        const referenceMatch = matchesPointingToGolden[0];
        
        groupMap[groupId] = {
          id: groupId,
          category: goldenSet.category,
          phase: basePhase || goldenSet.sheetName,
          date: referenceMatch.date || goldenSet.date,
          time: referenceMatch.time || goldenSet.time,
          court: referenceMatch.court || goldenSet.court,
          teamA: { name: teamAName, id: goldenSet.teamA?._id },
          teamB: { name: teamBName, id: goldenSet.teamB?._id },
          matches: matchesPointingToGolden,
          goldenSet: goldenSet,
          sheetName: goldenSet.sheetName
        };
        
        // Segna tutti questi match come elaborati
        processedMatchIds.add(goldenSet._id);
        matchesPointingToGolden.forEach(match => processedMatchIds.add(match._id));
        
        console.log(`Creato gruppo inverso ${groupId} con Golden Set ${goldenSet._id} e ${matchesPointingToGolden.length} match correlati`);
      } else {
        // Golden Set orfano, lo lasciamo solo per ora
        console.log(`Golden Set ${goldenSet._id} senza match correlati`);
      }
    }
  });
  
  // Ora elaboriamo le partite che potrebbero non avere un Golden Set
  // ma sono comunque correlate tra loro
  matchesList.forEach(match => {
    // Salta match già elaborati o Golden Set
    if (processedMatchIds.has(match._id) || 
        match.isGoldenSet || 
        match.teamACode === 'G' || 
        match.teamBCode === 'G') {
      return;
    }
    
    // Se il match ha un relatedMatchId, cerca altri match con lo stesso relatedMatchId
    if (match.relatedMatchId) {
      const relatedMatches = matchesList.filter(m => 
        m._id !== match._id && 
        m.relatedMatchId === match.relatedMatchId && 
        !processedMatchIds.has(m._id) &&
        !m.isGoldenSet
      );
      
      if (relatedMatches.length > 0) {
        // Aggiungiamo l'attuale match
        relatedMatches.push(match);
        
        // Verifica se il relatedMatchId è un Golden Set
        const possibleGoldenSet = matchesById[match.relatedMatchId];
        
        // Estrai i dati delle squadre
        const teamAName = match.teamA?.name?.replace(/\s+Team [ABG]$/, '') || '';
        const teamBName = match.teamB?.name?.replace(/\s+Team [ABG]$/, '') || '';
        
        // Determina la fase base
        let basePhase = match.phase || '';
        if (basePhase.includes(' - ')) {
          basePhase = basePhase.split(' - ')[0].trim();
        } else if (basePhase.includes(' vs ')) {
          basePhase = basePhase.split(' vs ')[0].trim();
        }
        
        // Crea un ID unico per questo gruppo
        const groupId = `group-related-${match.relatedMatchId}`;
        
        groupMap[groupId] = {
          id: groupId,
          category: match.category,
          phase: basePhase || match.sheetName,
          date: match.date,
          time: match.time,
          court: match.court,
          teamA: { name: teamAName, id: match.teamA?._id },
          teamB: { name: teamBName, id: match.teamB?._id },
          matches: relatedMatches,
          goldenSet: possibleGoldenSet?.isGoldenSet ? possibleGoldenSet : null,
          sheetName: match.sheetName
        };
        
        // Segna tutti questi match come elaborati
        relatedMatches.forEach(m => processedMatchIds.add(m._id));
        
        console.log(`Creato gruppo correlato ${groupId} con ${relatedMatches.length} match`);
      }
    }
  });
  
  // Infine, elaboriamo i match rimasti come match singoli
  matchesList.forEach(match => {
    if (processedMatchIds.has(match._id) || 
        match.isGoldenSet || 
        match.teamACode === 'G' || 
        match.teamBCode === 'G') {
      return;
    }
    
    // Solo per match normali non ancora elaborati
    const teamAName = match.teamA?.name?.replace(/\s+Team [ABG]$/, '') || '';
    const teamBName = match.teamB?.name?.replace(/\s+Team [ABG]$/, '') || '';
    
    // Determina se ci sono altri match con le stesse squadre nello stesso foglio
    const sameTeamsMatches = matchesList.filter(m => 
      m._id !== match._id && 
      !processedMatchIds.has(m._id) &&
      !m.isGoldenSet &&
      m.sheetName === match.sheetName &&
      ((m.teamA?._id === match.teamA?._id && m.teamB?._id === match.teamB?._id) ||
       (m.teamA?._id === match.teamB?._id && m.teamB?._id === match.teamA?._id))
    );
    
    if (sameTeamsMatches.length > 0) {
      // Questi sono probabilmente match correlati senza relatedMatchId
      sameTeamsMatches.push(match);
      
      // Determina la fase base
      let basePhase = match.phase || '';
      if (basePhase.includes(' - ')) {
        basePhase = basePhase.split(' - ')[0].trim();
      } else if (basePhase.includes(' vs ')) {
        basePhase = basePhase.split(' vs ')[0].trim();
      }
      
      // Crea un ID unico per questo gruppo
      const groupId = `group-sameteams-${match._id}`;
      
      groupMap[groupId] = {
        id: groupId,
        category: match.category,
        phase: basePhase || match.sheetName,
        date: match.date,
        time: match.time,
        court: match.court,
        teamA: { name: teamAName, id: match.teamA?._id },
        teamB: { name: teamBName, id: match.teamB?._id },
        matches: sameTeamsMatches,
        goldenSet: null,
        sheetName: match.sheetName
      };
      
      // Segna tutti questi match come elaborati
      sameTeamsMatches.forEach(m => processedMatchIds.add(m._id));
      
      console.log(`Creato gruppo stesse squadre ${groupId} con ${sameTeamsMatches.length} match`);
    } else {
      // Questo è un match singolo
      const groupId = `single-${match._id}`;
      
      let basePhase = match.phase || '';
      if (basePhase.includes(' - ')) {
        basePhase = basePhase.split(' - ')[0].trim();
      } else if (basePhase.includes(' vs ')) {
        basePhase = basePhase.split(' vs ')[0].trim();
      }
      
      groupMap[groupId] = {
        id: groupId,
        category: match.category,
        phase: basePhase || match.sheetName,
        date: match.date,
        time: match.time,
        court: match.court,
        teamA: { name: teamAName, id: match.teamA?._id },
        teamB: { name: teamBName, id: match.teamB?._id },
        matches: [match],
        goldenSet: null,
        sheetName: match.sheetName
      };
      
      processedMatchIds.add(match._id);
    }
  });
  
  // Convertiamo la mappa in un array e lo ordiniamo per data e ora
  const groups = Object.values(groupMap)
    .sort((a, b) => {
      // Gestisce il caso in cui data o ora potrebbero essere mancanti
      if (!a.date || !a.time) return 1;
      if (!b.date || !b.time) return -1;
      
      try {
        // Usa moment per parsare correttamente le date e confrontarle
        const dateTimeA = moment(`${a.date}T${a.time}`);
        const dateTimeB = moment(`${b.date}T${b.time}`);
        
        if (!dateTimeA.isValid()) return 1;
        if (!dateTimeB.isValid()) return -1;
        
        return dateTimeA.diff(dateTimeB);
      } catch (error) {
        console.error("Errore nel confronto delle date:", error);
        return 0;
      }
    });
  
  console.log(`Creati ${groups.length} gruppi di partite`);
  return groups;
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
      return true;
    }
    
    // Per le partite Play-In o Draw Schedule, includiamole sempre
    // poiché sono importanti fasi finali
    if (match.sheetName === 'Play-In' || 
        match.sheetName === 'Draw Schedule' ||
        (match.phase && (match.phase.toLowerCase().includes('play-in') || 
                        match.phase.toLowerCase().includes('quarti') ||
                        match.phase.toLowerCase().includes('semi') ||
                        match.phase.toLowerCase().includes('finale')))) {
      return true;
    }
    
    if (!match.date || !match.time || match.time === 'N/A') {
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
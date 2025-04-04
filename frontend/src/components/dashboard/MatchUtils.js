// nano src/components/dashboard/MatchUtils.js

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
// Funzione unificata per raggruppare le partite correlate
export const groupRelatedMatches = (matchesList) => {
  if (!matchesList || matchesList.length === 0) {
    console.log("Nessuna partita da raggruppare");
    return [];
  }
  
  console.log("Raggruppamento partite, totale:", matchesList.length);
  
  // Mappa per raggruppare le partite per combinazione di squadre e fase
  const groupMap = {};
  
  // Prima identifichiamo tutti i Golden Set per poterli tracciare
  const goldenSets = matchesList.filter(match => 
    match.isGoldenSet || match.teamACode === 'G' || match.teamBCode === 'G'
  );
  
  console.log(`Trovati ${goldenSets.length} Golden Set da associare ai gruppi`);
  
  // Gruppiamo le partite di Play-In per relatedMatchId
  // Questo ci permette di collegarle anche se hanno nomi di fase diversi
  const playInMatches = matchesList.filter(match => 
    (match.sheetName === 'Play-In' || 
     (match.phase && match.phase.toLowerCase().includes('play-in'))) &&
    !match.isGoldenSet && match.teamACode !== 'G' && match.teamBCode !== 'G'
  );
  
  console.log(`Trovate ${playInMatches.length} partite di Play-In da raggruppare`);
  
  // Creiamo un indice per relatedMatchId
  const relatedMatchGroups = {};
  playInMatches.forEach(match => {
    if (match.relatedMatchId) {
      if (!relatedMatchGroups[match.relatedMatchId]) {
        relatedMatchGroups[match.relatedMatchId] = [];
      }
      relatedMatchGroups[match.relatedMatchId].push(match);
    }
  });
  
  console.log(`Identificati ${Object.keys(relatedMatchGroups).length} gruppi di Play-In basati su relatedMatchId`);
  
  // Prima passiamo tutti i match normali per costruire i gruppi
  matchesList.forEach(match => {
    // Skip per i Golden Set, li gestiamo dopo
    if (match.isGoldenSet || match.teamACode === 'G' || match.teamBCode === 'G') {
      return;
    }
    
    if (!match.teamA || !match.teamB) {
      console.log("Match saltato per mancanza di team:", match._id);
      return;
    }
    
    // Gestione speciale per partite Play-In
    if (match.sheetName === 'Play-In' || (match.phase && match.phase.toLowerCase().includes('play-in'))) {
      // Cerchiamo tutti i match con stesso relatedMatchId
      if (match.relatedMatchId && relatedMatchGroups[match.relatedMatchId]) {
        const relatedMatches = relatedMatchGroups[match.relatedMatchId];
        
        // Crea una chiave unica per questo gruppo Play-In
        const playInKey = `play-in-${match.relatedMatchId}`;
        
        if (!groupMap[playInKey]) {
          // Determina i nomi delle squadre dal primo match
          const teamAName = match.teamA?.name?.replace(/\s+Team [ABG]$/, '') || '';
          const teamBName = match.teamB?.name?.replace(/\s+Team [ABG]$/, '') || '';
          
          groupMap[playInKey] = {
            id: playInKey,
            category: match.category,
            phase: 'Play-In',
            date: match.date,
            time: match.time,
            court: match.court,
            teamA: { name: teamAName, id: match.teamA?._id },
            teamB: { name: teamBName, id: match.teamB?._id },
            matches: [],
            sheetName: match.sheetName
          };
        }
        
        // Aggiungiamo tutti i match collegati se non sono già presenti
        relatedMatches.forEach(relatedMatch => {
          // Verifica se questo match è già stato aggiunto
          const alreadyAdded = groupMap[playInKey].matches.some(m => m._id === relatedMatch._id);
          if (!alreadyAdded) {
            groupMap[playInKey].matches.push(relatedMatch);
          }
        });
        
        // Ci assicuriamo di aggiungere anche il match corrente se non è già presente
        const alreadyAdded = groupMap[playInKey].matches.some(m => m._id === match._id);
        if (!alreadyAdded) {
          groupMap[playInKey].matches.push(match);
        }
        
        return;
      }
      
      // Se non ha relatedMatchId o non abbiamo trovato altri match collegati,
      // tentiamo un raggruppamento classico basato sui nomi delle squadre
      const teamAName = match.teamA?.name?.replace(/\s+Team [ABG]$/, '') || '';
      const teamBName = match.teamB?.name?.replace(/\s+Team [ABG]$/, '') || '';
      
      // Usa una chiave basata sui nomi delle squadre per raggruppare
      const sortedTeamNames = [teamAName, teamBName].sort().join('-');
      const playInKey = `play-in-${sortedTeamNames}-${match.category}`;
      
      if (!groupMap[playInKey]) {
        groupMap[playInKey] = {
          id: playInKey,
          category: match.category,
          phase: 'Play-In',
          date: match.date,
          time: match.time,
          court: match.court,
          teamA: { name: teamAName, id: match.teamA?._id },
          teamB: { name: teamBName, id: match.teamB?._id },
          matches: [],
          sheetName: match.sheetName
        };
      }
      
      const alreadyAdded = groupMap[playInKey].matches.some(m => m._id === match._id);
      if (!alreadyAdded) {
        groupMap[playInKey].matches.push(match);
      }
      return;
    }
    
    // Pattern delle partite Play-In: identificabili da matchId con suffisso -A, -B, -G 
    // o phase che contiene 'Play-In'
    const isPlayIn = 
      (match.matchId && match.matchId.match(/-[ABG]$/)) || 
      (match.phase && match.phase.toLowerCase().includes('play-in'));

    if (isPlayIn) {
      const teamAName = match.teamA?.name?.replace(/\s+Team [ABG]$/, '') || '';
      const teamBName = match.teamB?.name?.replace(/\s+Team [ABG]$/, '') || '';
      const basePhase = match.phase.replace(/ - [\w\d]+\s*vs\s*[\w\d]+$/, '').trim();

      // Usa una chiave basata sui nomi delle squadre e la fase per raggruppare
      const sortedTeamNames = [teamAName, teamBName].sort().join('-');
      const playInKey = `play-in-${sortedTeamNames}-${basePhase}-${match.category}`;

      if (!groupMap[playInKey]) {
        groupMap[playInKey] = {
          id: playInKey,
          category: match.category,
          phase: 'Play-In',
          date: match.date,
          time: match.time,
          court: match.court,
          teamA: { name: teamAName, id: match.teamA?._id },
          teamB: { name: teamBName, id: match.teamB?._id },
          matches: [],
          sheetName: match.sheetName // Aggiungiamo il nome del foglio per tracciare l'origine
        };
      }

      groupMap[playInKey].matches.push(match);
      return;
    }
    
    // Crea una chiave unica per ogni confronto, indipendente da Team A/B
    const teamAName = match.teamA?.name?.replace(/\s+Team [ABG]$/, '') || '';
    const teamBName = match.teamB?.name?.replace(/\s+Team [ABG]$/, '') || '';
    
    // Estrai la parte base della fase (senza Team A/B)
    let basePhase = match.phase || '';
    if (basePhase.includes(' - ') || basePhase.includes(' vs ')) {
      basePhase = basePhase.split(/\s+-\s+|\s+vs\s+/)[0].trim();
    }
    
    // Utilizza anche il foglio di provenienza (sheetName) per migliorare la precisione
    const sheetNamePart = match.sheetName ? `-${match.sheetName}` : '';
    
    // Chiave univoca per questo gruppo di partite
    // Ordina i nomi delle squadre alfabeticamente per evitare duplicazioni
    const teamKey = teamAName.localeCompare(teamBName) < 0
      ? `${teamAName}-${teamBName}` 
      : `${teamBName}-${teamAName}`;
    
    const groupKey = `${teamKey}-${basePhase}${sheetNamePart}-${match.category}`;
    
    if (!groupMap[groupKey]) {
      groupMap[groupKey] = {
        id: groupKey,
        category: match.category,
        phase: basePhase,
        date: match.date,
        time: match.time,
        court: match.court,
        teamA: { name: teamAName, id: match.teamA?._id },
        teamB: { name: teamBName, id: match.teamB?._id },
        matches: [],
        sheetName: match.sheetName
      };
    }
    
    // Assicuriamoci che la data più recente venga utilizzata per il gruppo
    if (match.date && (!groupMap[groupKey].date || new Date(match.date) > new Date(groupMap[groupKey].date))) {
      groupMap[groupKey].date = match.date;
      groupMap[groupKey].time = match.time;
      groupMap[groupKey].court = match.court;
    }
    
    groupMap[groupKey].matches.push(match);
  });
  
  // Ora abbiniamo i Golden Set ai gruppi appropriati
  goldenSets.forEach(goldenSet => {
    if (!goldenSet.teamA || !goldenSet.teamB) {
      console.log("Golden Set saltato per mancanza di team:", goldenSet._id);
      return;
    }
    
    // Se il Golden Set ha un relatedMatchId, verifichiamo prima se esiste già un gruppo Play-In
    if (goldenSet.relatedMatchId) {
      const playInKey = `play-in-${goldenSet.relatedMatchId}`;
      if (groupMap[playInKey]) {
        groupMap[playInKey].goldenSet = goldenSet;
        console.log(`Golden Set ${goldenSet._id} abbinato al gruppo Play-In ${playInKey} tramite relatedMatchId`);
        return;
      }
    }
    
    const teamAName = goldenSet.teamA?.name?.replace(/\s+Team [ABG]$/, '') || '';
    const teamBName = goldenSet.teamB?.name?.replace(/\s+Team [ABG]$/, '') || '';
    
    // Ignora i Golden Set generici o senza team validi
    if (teamAName === 'Golden Set Team A' || teamBName === 'Golden Set Team B' || 
        !teamAName || !teamBName) {
      return;
    }
    
    // Cerchiamo il gruppo appropriato in più modi:
    
    // 1. Abbinamento basato sui nomi delle squadre (indipendentemente dall'ordine)
    const candidateGroups = Object.entries(groupMap)
      .filter(([key, group]) => 
        (group.teamA.name === teamAName && group.teamB.name === teamBName) ||
        (group.teamA.name === teamBName && group.teamB.name === teamAName)
      )
      .map(([key, group]) => ({ key, group }));
    
    if (candidateGroups.length > 0) {
      // Se abbiamo più candidati, preferiamo quelli con lo stesso foglio (sheetName)
      const sameSheetGroups = candidateGroups.filter(
        ({ group }) => group.sheetName === goldenSet.sheetName
      );
      
      const targetGroup = sameSheetGroups.length > 0 ? sameSheetGroups[0] : candidateGroups[0];
      groupMap[targetGroup.key].goldenSet = goldenSet;
      console.log(`Golden Set ${goldenSet._id} abbinato al gruppo ${targetGroup.key}`);
    } else {
      // 2. Se non è stato trovato un gruppo, cerchiamo in base alla fase e categoria
      const basePhase = goldenSet.phase.replace(/ - [\w\d]+\s*vs\s*[\w\d]+$/, '').trim();
      const sheetNamePart = goldenSet.sheetName ? `-${goldenSet.sheetName}` : '';
      
      // Ordina i nomi delle squadre per la chiave
      const teamKey = teamAName.localeCompare(teamBName) < 0
        ? `${teamAName}-${teamBName}` 
        : `${teamBName}-${teamAName}`;
      
      // Prova diverse combinazioni di chiavi
      const possibleKeys = [
        `${teamKey}-${basePhase}${sheetNamePart}-${goldenSet.category}`, // Con sheetName
        `${teamKey}-${basePhase}-${goldenSet.category}`,                // Senza sheetName
        `play-in-${teamKey}-${basePhase}-${goldenSet.category}`         // Play-In
      ];
      
      let foundKey = null;
      for (const key of possibleKeys) {
        if (groupMap[key]) {
          foundKey = key;
          break;
        }
      }
      
      if (foundKey) {
        groupMap[foundKey].goldenSet = goldenSet;
        console.log(`Golden Set ${goldenSet._id} abbinato al gruppo ${foundKey} per chiave`);
      } else {
        // 3. Ultimo tentativo: creiamo un nuovo gruppo solo per il Golden Set
        // se proprio non troviamo corrispondenze
        const newGroupKey = `golden-${teamKey}-${basePhase}-${goldenSet.category}`;
        
        groupMap[newGroupKey] = {
          id: newGroupKey,
          category: goldenSet.category,
          phase: basePhase,
          date: goldenSet.date,
          time: goldenSet.time,
          court: goldenSet.court,
          teamA: { name: teamAName, id: goldenSet.teamA?._id },
          teamB: { name: teamBName, id: goldenSet.teamB?._id },
          matches: [],
          goldenSet: goldenSet,
          sheetName: goldenSet.sheetName
        };
        
        console.log(`Creato nuovo gruppo ${newGroupKey} per Golden Set ${goldenSet._id}`);
      }
    }
  });
  
  // Ora verifichiamo la presenza dei Golden Set nei gruppi
  const groupsWithGolden = Object.values(groupMap).filter(g => g.goldenSet).length;
  console.log(`${groupsWithGolden} gruppi con Golden Set su ${Object.keys(groupMap).length} totali`);
  
  // Convertiamo la mappa in un array e lo ordiniamo per data e ora
  const groups = Object.values(groupMap)
    .filter(group => {
      // Escludiamo i gruppi che hanno solo un Golden Set e nessun match normale
      const isGoldenSetOnly = group.matches.length === 0 && group.goldenSet;
      
      if (isGoldenSetOnly) {
        console.log(`Gruppo ${group.id} escluso: contiene solo Golden Set senza match associati`);
      }
      
      return !isGoldenSetOnly;
    })
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
  
  return groups;
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
  console.log(`Inizialmente ${initialPlayInMatches.length} partite Play-In`, 
    initialPlayInMatches.map(m => ({
      id: m._id, 
      date: m.date, 
      time: m.time,
      teams: `${m.teamA?.name} vs ${m.teamB?.name}`
    }))
  );
  
  const now = moment();
  const twoHoursAgo = moment().subtract(2, 'hours');
  
  // Separiamo i Golden Set dal resto delle partite
  const goldenSets = allMatches.filter(match => 
    match.isGoldenSet || match.teamACode === 'G' || match.teamBCode === 'G'
  );
  
  console.log(`Trovati ${goldenSets.length} Golden Set da preservare dal filtro temporale`);
  
  // Per ogni partita, controlliamo se è nelle ultime 2 ore o futura
  let relevantMatches = allMatches.filter(match => {
    // Se è un Golden Set, lo includiamo sempre
    if (match.isGoldenSet || match.teamACode === 'G' || match.teamBCode === 'G') {
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
      } else {
        console.log(`Play-In match ${match._id} escluso perché ha data passata: ${match.date}`);
        return false;
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
    if (!isRelevant) {
      console.log(`Match ${match._id} escluso per data/ora troppo vecchia: ${match.date} ${match.time}`);
    }
    return isRelevant;
  });
  
  // Log per debugging - vediamo quante partite Play-In rimangono
  const remainingPlayInMatches = relevantMatches.filter(match => 
    match.sheetName === 'Play-In' || 
    (match.phase && match.phase.toLowerCase().includes('play-in'))
  );
  console.log(`Dopo filtro temporale: ${remainingPlayInMatches.length} partite Play-In`, 
    remainingPlayInMatches.map(m => ({
      id: m._id, 
      date: m.date, 
      time: m.time
    }))
  );
  
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
    
    // Log per debugging - vediamo quante partite Play-In rimangono dopo filtro squadre
    const finalPlayInMatches = relevantMatches.filter(match => 
      match.sheetName === 'Play-In' || 
      (match.phase && match.phase.toLowerCase().includes('play-in'))
    );
    console.log(`Dopo filtro squadre: ${finalPlayInMatches.length} partite Play-In`);
    
    console.log("Partite dopo filtro squadre:", relevantMatches.length);
  }
  
  return relevantMatches;
};
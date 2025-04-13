// frontend/src/utils/MatchUtils.js
import { debugMatches } from './debug-matches';

// Funzione principale per raggruppare i match in base alle relazioni
export const groupMatchesByRelationship = (matches) => {
  const groups = [];
  const processed = new Set();

  // Prima passiamo attraverso i Golden Sets, che fungono da "ancora" per i gruppi
  matches.filter(match => match.isGoldenSet).forEach(goldenSet => {
    if (processed.has(goldenSet._id)) return;

    // Trova tutte le partite correlate a questo Golden Set
    const relatedMatches = matches.filter(m => 
      m.relatedMatchId === goldenSet._id || // Partite che puntano al Golden Set
      goldenSet.relatedMatchId === m._id    // Partita a cui punta il Golden Set
    );

    // Crea un gruppo con il Golden Set e tutte le partite correlate
    const group = [goldenSet, ...relatedMatches].filter(m => !processed.has(m._id));
    
    // Marca tutte le partite di questo gruppo come processate
    group.forEach(match => processed.add(match._id));

    if (group.length > 0) {
      groups.push(group);
    }
  });

  // Processa le partite restanti (quelle senza Golden Set)
  matches.forEach(match => {
    if (processed.has(match._id)) return;

    // Se la partita ha un relatedMatchId ma non abbiamo trovato il Golden Set
    // (potrebbe succedere se il Golden Set non è presente nell'array matches)
    if (match.relatedMatchId) {
      // Cerca altre partite con lo stesso relatedMatchId
      const relatedMatches = matches.filter(m => 
        !processed.has(m._id) && 
        m.relatedMatchId === match.relatedMatchId
      );
      
      const group = [match, ...relatedMatches];
      group.forEach(m => processed.add(m._id));
      
      if (group.length > 0) {
        groups.push(group);
      }
    } else {
      // Partita singola senza relazioni
      processed.add(match._id);
      groups.push([match]);
    }
  });

  return groups;
};

// Funzione per trovare le partite correlate a una partita specifica
export const findRelatedMatches = (allMatches, currentMatch) => {
  if (!currentMatch || !currentMatch.teamA || !currentMatch.teamB) {
    console.log('Current match is invalid', currentMatch);
    return { matchesA: [], matchesB: [], goldenSet: null };
  }
  
  // Se abbiamo relatedMatchId, utilizziamo direttamente quello
  const relatedMatches = [];
  
  if (currentMatch.isGoldenSet) {
    // Se è un Golden Set, cerca partite che puntano ad esso
    relatedMatches.push(
      ...allMatches.filter(m => 
        m._id !== currentMatch._id && 
        m.relatedMatchId === currentMatch._id
      )
    );
    
    // Aggiungi anche partite a cui il Golden Set punta
    if (currentMatch.relatedMatchId) {
      const relatedMatch = allMatches.find(m => 
        m._id === currentMatch.relatedMatchId
      );
      if (relatedMatch && !relatedMatches.some(m => m._id === relatedMatch._id)) {
        relatedMatches.push(relatedMatch);
      }
    }
  } else {
    // Se è una partita normale, cerca il Golden Set e altre partite che puntano allo stesso Golden Set
    if (currentMatch.relatedMatchId) {
      // Trova il Golden Set
      const goldenSet = allMatches.find(m => 
        m._id === currentMatch.relatedMatchId
      );
      
      if (goldenSet) {
        relatedMatches.push(goldenSet);
      }
      
      // Trova altre partite che puntano allo stesso Golden Set
      relatedMatches.push(
        ...allMatches.filter(m => 
          m._id !== currentMatch._id && 
          m.relatedMatchId === currentMatch.relatedMatchId
        )
      );
    }
  }
  
  console.log(`Found ${relatedMatches.length} related matches`);
  
  // Classifica le partite correlate
  const matchesA = relatedMatches.filter(match => 
    !match.isGoldenSet && match.teamACode === 'A' && match.teamBCode === 'A'
  );
  
  const matchesB = relatedMatches.filter(match => 
    !match.isGoldenSet && match.teamACode === 'B' && match.teamBCode === 'B'
  );
  
  const goldenSet = relatedMatches.find(match => 
    match.isGoldenSet || match.teamACode === 'G' || match.teamBCode === 'G'
  );
  
  console.log('Matches A found:', matchesA.length);
  console.log('Matches B found:', matchesB.length);
  console.log('Golden Set found:', goldenSet ? 'Yes' : 'No');
  
  return { matchesA, matchesB, goldenSet };
};

// Funzione per determinare il vincitore di una singola partita
export const determineMatchWinner = (match) => {
  if (!match || !match.officialScoreA || !match.officialScoreA.length) return null;
  
  let winsA = 0;
  let winsB = 0;
  
  for (let i = 0; i < match.officialScoreA.length; i++) {
    const scoreA = parseInt(match.officialScoreA[i]);
    const scoreB = parseInt(match.officialScoreB[i]);
    
    if (scoreA > scoreB) winsA++;
    else if (scoreB > scoreA) winsB++;
  }
  
  if (winsA > winsB) return 'A';
  if (winsB > winsA) return 'B';
  return null;
};

// Funzione per determinare il vincitore complessivo
export const determineOverallWinner = (currentMatch, matchesA, matchesB, goldenSet) => {
  if (!currentMatch) return null;
  // Se c'è un golden set con risultato, questo è decisivo
  if (goldenSet && goldenSet.officialScoreA && goldenSet.officialScoreA.length > 0) {
    const scoreA = parseInt(goldenSet.officialScoreA[0]);
    const scoreB = parseInt(goldenSet.officialScoreB[0]);
    
    if (!isNaN(scoreA) && !isNaN(scoreB)) {
      if (scoreA > scoreB) {
        return { team: currentMatch.teamA, decidedBy: 'goldenSet', score: `${scoreA}-${scoreB}` };
      } else if (scoreB > scoreA) {
        return { team: currentMatch.teamB, decidedBy: 'goldenSet', score: `${scoreA}-${scoreB}` };
      }
    }
  }
  
  // Altrimenti conta le vittorie delle singole partite
  let teamAWins = 0;
  let teamBWins = 0;
  
  // Conta vittorie del Team A
  for (const match of matchesA) {
    const winner = determineMatchWinner(match);
    if (winner === 'A') teamAWins++;
  }
  
  // Conta vittorie del Team B
  for (const match of matchesB) {
    const winner = determineMatchWinner(match);
    if (winner === 'B') teamBWins++;
  }
  
  if (teamAWins > teamBWins) {
    return { team: currentMatch.teamA, decidedBy: 'matches', score: `${teamAWins}-${teamBWins}` };
  } else if (teamBWins > teamAWins) {
    return { team: currentMatch.teamB, decidedBy: 'matches', score: `${teamBWins}-${teamAWins}` };
  }
  
  return null; // Nessun vincitore chiaro
};

// Funzione per generare un titolo per la card della partita
export const getMatchCardTitle = (match, teamType, isGoldenSet) => {
  if (isGoldenSet) return '🏆 Golden Set';
  if (teamType === 'A') return `🔵 Team A vs Team A`;
  if (teamType === 'B') return `🟠 Team B vs Team B`;
  return `Partita ${match.matchId || ''}`;
};

// Funzione per ottenere il colore di sfondo della card
export const getMatchCardColor = (teamType, isGoldenSet) => {
  if (isGoldenSet) return '#fcf8e3'; // giallo chiaro per golden set
  if (teamType === 'A') return '#e3f2fd'; // blu chiaro per Team A
  if (teamType === 'B') return '#fff3e0'; // arancione chiaro per Team B
  return '#ffffff'; // bianco per default
};

// Funzione per ottenere lo stato del risultato in formato testo
export const getResultStatusText = (match) => {
  const hasResult = match.officialScoreA && match.officialScoreA.length > 0;
  
  if (!hasResult) return '';
  
  if (match.confirmedByTeamA && match.confirmedByTeamB) {
    return 'Risultato confermato';
  } else if (match.confirmedByTeamA) {
    return 'In attesa di conferma da Team B';
  } else if (match.confirmedByTeamB) {
    return 'In attesa di conferma da Team A';
  } else {
    return 'In attesa di conferma';
  }
};
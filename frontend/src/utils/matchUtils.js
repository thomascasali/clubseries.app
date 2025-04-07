// frontend/src/utils/matchUtils.js
/**
 * Utility functions for match-related operations
 */

// Funzione migliorata per trovare le partite correlate
// Funzione migliorata per trovare le partite correlate
export const findRelatedMatches = (allMatches, currentMatch) => {
  if (!currentMatch || !currentMatch.teamA || !currentMatch.teamB) {
    return { matchesA: [], matchesB: [], goldenSet: null };
  }

  const teamAId = currentMatch.teamA._id;
  const teamBId = currentMatch.teamB._id;
  const teamAName = currentMatch.teamA.name;
  const teamBName = currentMatch.teamB.name;
  const phase = currentMatch.phase.replace(/ - [\w\d]+\s*vs\s*[\w\d]+$/, '').trim();
  const category = currentMatch.category;

  console.log('Finding related matches for:', { teamAId, teamBId, teamAName, teamBName, phase, category });
  console.log('All matches count:', allMatches.length);

  // Team A vs Team A matches
  const matchesA = allMatches.filter(match => {
    if (!match.teamA || !match.teamB || match.isGoldenSet || match.teamACode === 'G' || match.teamBCode === 'G') return false;
    
    const matchPhase = match.phase.replace(/ - [\w\d]+\s*vs\s*[\w\d]+$/, '').trim();
    
    // Check if this is a match between Team A vs Team A
    const isTeamAMatch = (
      (match.teamA._id === teamAId || match.teamA.name === teamAName) && 
      (match.teamB._id === teamAId || match.teamB.name === teamAName)
    ) || (
      (match.teamACode === 'A' && match.teamBCode === 'A') && 
      (match.category === category && matchPhase === phase)
    );

    return isTeamAMatch;
  });

  console.log('Found Team A matches:', matchesA.length);

  // Team B vs Team B matches
  const matchesB = allMatches.filter(match => {
    if (!match.teamA || !match.teamB || match.isGoldenSet || match.teamACode === 'G' || match.teamBCode === 'G') return false;
    
    const matchPhase = match.phase.replace(/ - [\w\d]+\s*vs\s*[\w\d]+$/, '').trim();
    
    // Check if this is a match between Team B vs Team B
    const isTeamBMatch = (
      (match.teamA._id === teamBId || match.teamA.name === teamBName) && 
      (match.teamB._id === teamBId || match.teamB.name === teamBName)
    ) || (
      (match.teamACode === 'B' && match.teamBCode === 'B') && 
      (match.category === category && matchPhase === phase)
    );

    if (match.teamACode === 'B' || match.teamBCode === 'B') {
      console.log('Checking potential Team B match:', {
        matchId: match._id,
        teamA: match.teamA.name,
        teamB: match.teamB.name,
        teamACode: match.teamACode,
        teamBCode: match.teamBCode,
        isTeamBMatch
      });
    }

    return isTeamBMatch;
  });

  console.log('Found Team B matches:', matchesB.length);

  // Trova il golden set associato
  const goldenSet = allMatches.find(match => {
    if (!match.teamA || !match.teamB) return false;
    if (!match.isGoldenSet && match.teamACode !== 'G' && match.teamBCode !== 'G') return false;

    const matchPhase = match.phase.replace(/ - [\w\d]+\s*vs\s*[\w\d]+$/, '').trim();
    
    // Check if this golden set involves the same teams
    const sameTeams = (
      (match.teamA._id === teamAId || match.teamA._id === teamBId || 
       match.teamA.name === teamAName || match.teamA.name === teamBName) &&
      (match.teamB._id === teamAId || match.teamB._id === teamBId || 
       match.teamB.name === teamAName || match.teamB.name === teamBName)
    ) || (
      (match.category === category && matchPhase === phase)
    );

    return sameTeams;
  });

  console.log('Found Golden Set:', goldenSet ? 'Yes' : 'No');

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
  if (teamType === 'A') return `🔵 Team A vs Team A (${match.teamACode}-${match.teamBCode})`;
  if (teamType === 'B') return `🟠 Team B vs Team B (${match.teamACode}-${match.teamBCode})`;
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

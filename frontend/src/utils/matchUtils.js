// frontend/src/utils/matchUtils.js
import { debugMatches } from './debug-matches';

export const findRelatedMatches = (allMatches, currentMatch) => {
  if (!currentMatch || !currentMatch.teamA || !currentMatch.teamB) {
    console.log('Current match is invalid', currentMatch);
    return { matchesA: [], matchesB: [], goldenSet: null };
  }
  
  // Estrai ID e nomi come stringhe per confronti più affidabili
  const teamAId = currentMatch.teamA._id?.toString();
  const teamBId = currentMatch.teamB._id?.toString();
  const teamAName = currentMatch.teamA.name;
  const teamBName = currentMatch.teamB.name;
  const category = currentMatch.category;
  
  console.log('Finding related matches for:', { 
    teamAId, teamBId, 
    teamAName, teamBName, 
    category,
    phase: currentMatch.phase,
    matchId: currentMatch.matchId
  });
  
  // Filtra prima tutti i match della stessa categoria e con le stesse squadre (in qualsiasi ordine)
  const relatedMatches = allMatches.filter(match => {
    // Deve avere teamA e teamB validi
    if (!match.teamA || !match.teamB) return false;
    
    // Verifica la categoria
    if (match.category !== category) return false;
    
    // Verifica che le squadre coinvolte siano esattamente le stesse due squadre
    // Controlla sia per nome che per ID
    const matchTeamAName = match.teamA.name;
    const matchTeamBName = match.teamB.name;
    
    const hasSameTeams = 
      (matchTeamAName === teamAName || matchTeamAName === teamBName) &&
      (matchTeamBName === teamAName || matchTeamBName === teamBName);
    
    return hasSameTeams;
  });
  
  // Escludi il match corrente
  const filteredMatches = relatedMatches.filter(match => 
    match._id.toString() !== currentMatch._id.toString()
  );
  
  console.log(`Found ${filteredMatches.length} related matches`);
  
  // Adesso dividi per tipo
  const matchesA = filteredMatches.filter(match => {
    // Per i match di tipo A, verifica teamACode e teamBCode
    const isTypeA = match.teamACode === 'A' && match.teamBCode === 'A';
    
    console.log(`Checking match ${match._id} for Team A:`, {
      teamACode: match.teamACode, 
      teamBCode: match.teamBCode,
      isTypeA
    });
    
    return isTypeA && !match.isGoldenSet;
  });
  
  const matchesB = filteredMatches.filter(match => 
    !match.isGoldenSet && match.teamACode === 'B' && match.teamBCode === 'B'
  );
  
  const goldenSet = filteredMatches.find(match => 
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

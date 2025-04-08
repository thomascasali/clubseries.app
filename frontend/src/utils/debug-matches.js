// crea un file temporaneo chiamato debug-matches.js nella directory utils

export const debugMatches = (allMatches, currentMatch) => {
    console.log("========= DEBUG MATCHES START =========");
    console.log("Current match:", {
      id: currentMatch._id,
      teamA: currentMatch.teamA.name,
      teamB: currentMatch.teamB.name,
      teamACode: currentMatch.teamACode,
      teamBCode: currentMatch.teamBCode,
      category: currentMatch.category,
      phase: currentMatch.phase,
      matchId: currentMatch.matchId
    });
    
    console.log("All available matches:", allMatches.length);
    
    // Filtra per categoria
    const sameCategory = allMatches.filter(m => m.category === currentMatch.category);
    console.log("Same category matches:", sameCategory.length);
    
    // Stampa dettagli di tutti i match della stessa categoria
    sameCategory.forEach(match => {
      console.log("Match:", {
        id: match._id, 
        teamA: match.teamA?.name || "N/A",
        teamB: match.teamB?.name || "N/A",
        teamACode: match.teamACode || "N/A",
        teamBCode: match.teamBCode || "N/A",
        phase: match.phase || "N/A",
        isGoldenSet: match.isGoldenSet || false,
        matchId: match.matchId || "N/A"
      });
    });
    
    console.log("========= DEBUG MATCHES END =========");
    
    return sameCategory;
  };
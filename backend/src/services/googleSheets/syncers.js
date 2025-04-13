const logger = require('../../config/logger');
const crypto = require('crypto');
const { readTeamsFromSheet, readMatchesFromSheet } = require('./readers');
const { updateSheetTracking, hasSheetChanged } = require('./tracking');
const SheetTracking = require('../../models/SheetTracking');

const arraysEqual = (a, b) => {
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  return a.every((val, i) => val === b[i]);
};

const hasMatchChanged = (existing, updated) => {
  return (
    existing.officialResult !== updated.officialResult ||
    !arraysEqual(existing.officialScoreA, updated.officialScoreA) ||
    !arraysEqual(existing.officialScoreB, updated.officialScoreB)
  );
};

const syncNormalMatches = async (matches, Match, Team, category) => {
  const synced = [];

  for (const matchData of matches) {
    try {
      const [teamA, teamB] = await Promise.all([
        Team.findOne({ name: matchData.teamA, category }),
        Team.findOne({ name: matchData.teamB, category })
      ]);

      if (!teamA || !teamB) {
        logger.warn(`Match saltato per team mancanti: ${matchData.matchId}, A: ${matchData.teamA}, B: ${matchData.teamB}`);
        continue;
      }

      const updateData = {
        ...matchData,
        teamA: teamA._id,
        teamB: teamB._id,
        isGoldenSet: false
      };

      const match = await Match.findOneAndUpdate(
        { matchId: matchData.matchId },
        updateData,
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      synced.push(match);
    } catch (err) {
      logger.error(`Errore sync match ${matchData.matchId}: ${err.message}`);
    }
  }

  return synced;
};

const syncGoldenSets = async (matches, Match, Team, category) => {
  const synced = [];
  const goldenSetMap = new Map();

  for (const matchData of matches) {
    try {
      const [teamA, teamB] = await Promise.all([
        Team.findOne({ name: matchData.teamA, category }),
        Team.findOne({ name: matchData.teamB, category })
      ]);

      if (!teamA || !teamB) continue;

      let officialResult = 'pending';
      const sA = parseInt(matchData.officialScoreA?.[0]);
      const sB = parseInt(matchData.officialScoreB?.[0]);

      if (!isNaN(sA) && !isNaN(sB)) {
        officialResult = sA > sB ? 'teamA' : sB > sA ? 'teamB' : 'pending';
      }

      const existing = await Match.findOne({ matchId: matchData.matchId });
      const resultChanged = !existing || hasMatchChanged(existing, {
        officialScoreA: matchData.officialScoreA,
        officialScoreB: matchData.officialScoreB,
        officialResult
      });

      const updateData = {
        ...matchData,
        teamA: teamA._id,
        teamB: teamB._id,
        isGoldenSet: true,
        teamACode: 'G',
        teamBCode: 'G',
        officialResult,
        resultChanged
      };

      const match = await Match.findOneAndUpdate(
        { matchId: matchData.matchId },
        updateData,
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      synced.push(match);

      const baseId = matchData.matchId.replace(/G$/, '').replace(/\d+G/, '');
      goldenSetMap.set(baseId, match._id);
    } catch (err) {
      logger.error(`Errore sync Golden Set ${matchData.matchId}: ${err.message}`);
    }
  }

  return { synced, goldenSetMap };
};

const linkGoldenSets = async (goldenSetMap, syncedMatches) => {
  for (const [baseId, goldenSetId] of goldenSetMap.entries()) {
    const related = syncedMatches.filter(m => !m.isGoldenSet && m.matchId.includes(baseId));
    if (related.length === 0) {
      logger.warn(`Golden Set ${goldenSetId} senza match correlati (base ID: ${baseId})`);
      continue;
    }

    const goldenSet = syncedMatches.find(m => m._id.toString() === goldenSetId.toString());
    if (goldenSet) {
      goldenSet.relatedMatchId = related[0]._id;
      await goldenSet.save();
      logger.info(`🔗 Golden Set '${goldenSet.matchId}' associato a match '${related[0].matchId}'`);
    }

    for (const m of related) {
      m.relatedMatchId = goldenSetId;
      await m.save();
      logger.info(`Collegato match ${m.matchId} a Golden Set ${goldenSetId}`);
    }
  }
};

const syncMatchesFromSheet = async (spreadsheetId, category, Match, Team) => {
  const allMatches = await readMatchesFromSheet(spreadsheetId, category);
  const dataHash = crypto.createHash('md5').update(JSON.stringify(allMatches)).digest('hex');

  if (!(await hasSheetChanged(spreadsheetId, category, dataHash))) {
    logger.info(`Nessun cambiamento per categoria ${category}`);
    return await Match.find({ category });
  }

  const normalMatches = allMatches.filter(m => !m.isGoldenSet);
  const goldenMatches = allMatches.filter(m => m.isGoldenSet);

  const syncedNormal = await syncNormalMatches(normalMatches, Match, Team, category);
  const { synced: syncedGolden, goldenSetMap } = await syncGoldenSets(goldenMatches, Match, Team, category);

  const allSynced = [...syncedNormal, ...syncedGolden];
  await linkGoldenSets(goldenSetMap, allSynced);

  await updateSheetTracking(spreadsheetId, category, dataHash);
  logger.info(`✅ Categoria ${category}: ${syncedNormal.length} match normali, ${syncedGolden.length} Golden Set sincronizzati.`);

  return allSynced;
};

module.exports = {
  syncMatchesFromSheet
};

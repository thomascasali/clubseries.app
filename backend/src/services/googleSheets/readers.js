const logger = require('../../config/logger');
const { sheets } = require('./config');
const { parseDate, findTeamInText } = require('./utils');

const readSheet = async (spreadsheetId, range) => {
  try {
    const response = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    return response.data.values || [];
  } catch (error) {
    logger.error(`Error reading Google Sheet: ${error.message}`);
    throw error;
  }
};

const readTeamsFromSheet = async (spreadsheetId) => {
  const sheetInfo = await sheets.spreadsheets.get({ spreadsheetId });
  const entryListSheet = sheetInfo.data.sheets.find(sheet => sheet.properties.title.toLowerCase().includes('entry list'));
  if (!entryListSheet) return [];

  const teamsData = await readSheet(spreadsheetId, `'${entryListSheet.properties.title}'!B4:B50`);
  return teamsData.filter(row => row[0]?.trim()).map(row => ({ name: row[0].trim() }));
};

const parseMatchRow = (row, index, sheetName, category, validTeamNames) => {
  const matchNumber = row[0]?.trim();
  const matchId = `${category}_${sheetName}_${matchNumber}`;
  const date = parseDate(row[1]) || new Date('2025-05-02');
  const time = row[2] || 'N/A';
  const court = row[3] || '';
  const phase = row[4] || sheetName;
  const matchText = row[5] || '';
  const [teamAText, teamBText] = matchText.split(' vs ').map(s => s?.trim() || '');

  const teamAInfo = findTeamInText(teamAText, validTeamNames);
  const teamBInfo = findTeamInText(teamBText, validTeamNames);

  const isGoldenSet = matchNumber?.endsWith('G') ||
    teamAText.toLowerCase().includes('team g') ||
    teamBText.toLowerCase().includes('team g');

  const scores = [7, 9, 11].map((col) => {
    if (row[col] && row[col + 1]) return [row[col], row[col + 1]];
    return null;
  }).filter(Boolean);

  const officialScoreA = scores.map(set => set[0]);
  const officialScoreB = scores.map(set => set[1]);

  const result = row[6]?.trim() || 'pending';
  let officialResult = 'pending';
  if (result === '2-0' || result === '2-1') officialResult = 'teamA';
  if (result === '0-2' || result === '1-2') officialResult = 'teamB';
  if (result === '1-1') officialResult = 'draw';

  const finalTeamACode = isGoldenSet ? 'G' : (teamAInfo.teamCode || 'A');
  const finalTeamBCode = isGoldenSet ? 'G' : (teamBInfo.teamCode || 'B');

  return {
    matchId,
    phase,
    date,
    time,
    court,
    teamA: teamAInfo.teamName || teamAText,
    teamB: teamBInfo.teamName || teamBText,
    teamACode: finalTeamACode,
    teamBCode: finalTeamBCode,
    officialScoreA,
    officialScoreB,
    officialResult,
    category,
    spreadsheetRow: index + 1,
    sheetName,
    isGoldenSet,
    originalMatchText: matchText
  };
};

const readMatchesFromSheet = async (spreadsheetId, category) => {
  const sheetInfo = await sheets.spreadsheets.get({ spreadsheetId });
  const validTeams = await readTeamsFromSheet(spreadsheetId);
  const validTeamNames = validTeams.map(t => t.name);
  const matches = [];

  const allSheets = sheetInfo.data.sheets.filter(sheet =>
    sheet?.properties?.title &&
    ['pool', 'draw schedule', 'play-in'].some(keyword =>
      sheet.properties.title.toLowerCase().includes(keyword)
    )
  );
  
  for (const sheet of allSheets) {
    const sheetName = sheet.properties.title.trim();
    const rows = await readSheet(spreadsheetId, `'${sheetName}'!A1:M50`);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !row[0] || !row[5]) continue; // salta righe vuote o non valide

      const match = parseMatchRow(row, i, sheetName, category, validTeamNames);
      matches.push(match);
    }
  }

  const goldenSets = matches.filter(m => m.isGoldenSet);
  logger.info(`Trovati ${goldenSets.length} Golden Sets su ${matches.length} match totali in categoria ${category}`);

  return matches;
};

module.exports = {
  readSheet,
  readTeamsFromSheet,
  readMatchesFromSheet
};

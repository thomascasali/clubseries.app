const logger = require('../../config/logger');
const { sheets } = require('./config');
const { updateSheetTracking } = require('./tracking');

const writeSheet = async (spreadsheetId, range, values) => {
  try {
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      resource: { values },
    });

    logger.info(`Spreadsheet updated at ${range}`);
    return response.data;
  } catch (error) {
    logger.error(`Error updating sheet: ${error.message}`);
    throw error;
  }
};

const syncMatchesToSheet = async (spreadsheetId, category, matches) => {
  for (const match of matches) {
    if (!match.spreadsheetRow || !match.sheetName) {
      logger.warn(`Skipping match ${match._id}, no sheet data.`);
      continue;
    }

    const confirmedRange = `'${match.sheetName}'!P${match.spreadsheetRow}:S${match.spreadsheetRow}`;

    try {
      if (match.userScoreA.length && match.userScoreB.length && match.confirmedByTeamA && match.confirmedByTeamB) {
        let setsA = 0, setsB = 0;
        match.userScoreA.forEach((score, i) => {
          if (parseInt(score) > parseInt(match.userScoreB[i])) setsA++;
          else if (parseInt(score) < parseInt(match.userScoreB[i])) setsB++;
        });

        const finalResult = `${setsA}-${setsB}`;
        const setResults = match.userScoreA.map((a, idx) => `${a}-${match.userScoreB[idx]}`);
        const confirmedData = [finalResult, ...setResults];

        await writeSheet(spreadsheetId, confirmedRange, [confirmedData]);
        logger.info(`Match ${match.matchId} confirmed user results written to columns P:S.`);
      }
    } catch (error) {
      logger.error(`Error syncing match ${match._id}: ${error.message}`);
      continue;
    }
  }

  await updateSheetTracking(spreadsheetId, category);
};

module.exports = { writeSheet, syncMatchesToSheet };

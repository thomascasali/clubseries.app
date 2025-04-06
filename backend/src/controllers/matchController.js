const Match = require('../models/Match');
const Team = require('../models/Team');
const User = require('../models/User');
const Notification = require('../models/Notification');
const logger = require('../config/logger');
const bcrypt = require('bcryptjs');
const notificationService = require('../services/notificationService');

// @desc    Ottieni tutte le partite
// @route   GET /api/matches
// @access  Public
exports.getMatches = async (req, res) => {
  try {
    const { date, category, team } = req.query;
    
    // Costruisci il filtro in base ai parametri
    const filter = {};
    
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      
      filter.date = { $gte: startDate, $lte: endDate };
    }
    
    if (category) {
      filter.category = category;
    }
    
    if (team) {
      filter.$or = [
        { teamA: team },
        { teamB: team }
      ];
    }
    
    // Aggiungiamo ordinamento e popoliamo i riferimenti alle squadre
    const matches = await Match.find(filter)
      .populate('teamA', 'name category')
      .populate('teamB', 'name category')
      .sort({ date: 1, time: 1 });
    
    // Rispondi con la lista di partite
    res.status(200).json(matches);
  } catch (error) {
    logger.error(`Error in getMatches: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Ottieni una partita specifica
// @route   GET /api/matches/:id
// @access  Public
exports.getMatchById = async (req, res) => {
  try {
    // Estraiamo l'ID e verifichiamo che sia una stringa valida
    const matchId = req.params.id;
    
    // Se l'ID è un oggetto invece di una stringa, estraiamo la proprietà _id
    // Questo può accadere quando l'ID viene passato direttamente da un oggetto
    const idToFind = (typeof matchId === 'object' && matchId !== null && matchId._id) 
      ? matchId._id.toString() 
      : matchId;
    
    const match = await Match.findById(idToFind)
      .populate('teamA', 'name category')
      .populate('teamB', 'name category');
    
    if (!match) {
      return res.status(404).json({ message: 'Partita non trovata' });
    }
    
    res.status(200).json(match);
  } catch (error) {
    // Miglioriamo il logging con più dettagli
    logger.error(`Error in getMatchById: ${error.message}, param: ${JSON.stringify(req.params.id)}`);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Crea una nuova partita
// @route   POST /api/matches
// @access  Private/Admin
exports.createMatch = async (req, res) => {
  try {
    const { 
      matchId, phase, date, time, court, 
      teamA, teamB, category, spreadsheetRow 
    } = req.body;
    
    // Verifica che le squadre esistano
    const teamAExists = await Team.findById(teamA);
    const teamBExists = await Team.findById(teamB);
    
    if (!teamAExists || !teamBExists) {
      return res.status(400).json({ message: 'Una o entrambe le squadre non esistono' });
    }
    
    // Crea la partita
    const match = await Match.create({
      matchId,
      phase,
      date,
      time,
      court,
      teamA,
      teamB,
      category,
      spreadsheetRow,
      updatedBy: req.user._id
    });
    
    // Popola i dati delle squadre per la risposta
    await match.populate('teamA', 'name category');
    await match.populate('teamB', 'name category');
    
    // Notifica gli utenti iscritti alle squadre
    await sendMatchCreatedNotifications(match);
    
    res.status(201).json(match);
  } catch (error) {
    logger.error(`Error in createMatch: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Aggiorna una partita
// @route   PUT /api/matches/:id
// @access  Private/Admin
exports.updateMatch = async (req, res) => {
  try {
    const { 
      matchId, phase, date, time, court, 
      teamA, teamB, category, spreadsheetRow 
    } = req.body;
    
    const match = await Match.findById(req.params.id);
    
    if (!match) {
      return res.status(404).json({ message: 'Partita non trovata' });
    }
    
    // Verifica cambiamenti rilevanti per le notifiche
    const isDateChanged = date && date.toString() !== match.date.toString();
    const isTimeChanged = time && time !== match.time;
    const isCourtChanged = court && court !== match.court;
    
    // Aggiorna i campi
    match.matchId = matchId || match.matchId;
    match.phase = phase || match.phase;
    match.date = date || match.date;
    match.time = time || match.time;
    match.court = court || match.court;
    match.teamA = teamA || match.teamA;
    match.teamB = teamB || match.teamB;
    match.category = category || match.category;
    match.spreadsheetRow = spreadsheetRow || match.spreadsheetRow;
    match.updatedBy = req.user._id;
    
    const updatedMatch = await match.save();
    
    // Popola i dati delle squadre per la risposta
    await updatedMatch.populate('teamA', 'name category');
    await updatedMatch.populate('teamB', 'name category');
    
    // Invia notifiche se ci sono cambiamenti rilevanti
    if (isDateChanged || isTimeChanged || isCourtChanged) {
      await sendMatchUpdateNotifications(
        updatedMatch, 
        isTimeChanged, 
        isCourtChanged, 
        isDateChanged
      );
    }
    
    res.status(200).json(updatedMatch);
  } catch (error) {
    logger.error(`Error in updateMatch: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Inserire risultato partita (da parte delle squadre)
// @route   POST /api/matches/:id/result
// @access  Public (con password della squadra)
exports.submitMatchResult = async (req, res) => {
  try {
    const { teamId, password, scoreA, scoreB } = req.body;
    
    const match = await Match.findById(req.params.id);
    
    if (!match) {
      return res.status(404).json({ message: 'Partita non trovata' });
    }
    
    // Verificare che la squadra sia una delle due partecipanti
    if (match.teamA.toString() !== teamId && match.teamB.toString() !== teamId) {
      return res.status(403).json({ message: 'La squadra non partecipa a questa partita' });
    }
    
    // Verificare la password della squadra
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: 'Squadra non trovata' });
    }
    
    const isPasswordValid = await bcrypt.compare(password, team.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Password della squadra non valida' });
    }
    
    // Determinare quale squadra sta inviando il risultato
    const isTeamA = match.teamA.toString() === teamId;
    
    // Validare i punteggi
    if (!Array.isArray(scoreA) || !Array.isArray(scoreB) || 
        scoreA.length === 0 || scoreB.length === 0 ||
        scoreA.length !== scoreB.length) {
      return res.status(400).json({ 
        message: 'Formato punteggio non valido. Inserire array di punteggi in formato corretto.' 
      });
    }
    
    // Impostare il risultato e lo stato di conferma appropriato
    match.scoreA = scoreA;
    match.scoreB = scoreB;
    
    if (isTeamA) {
      match.confirmedByTeamA = true;
      match.confirmedByTeamB = false;
    } else {
      match.confirmedByTeamA = false;
      match.confirmedByTeamB = true;
    }
    
    // Determinare il vincitore in base al punteggio
    let totalSetsA = 0;
    let totalSetsB = 0;
    
    for (let i = 0; i < scoreA.length; i++) {
      if (parseInt(scoreA[i]) > parseInt(scoreB[i])) {
        totalSetsA++;
      } else if (parseInt(scoreB[i]) > parseInt(scoreA[i])) {
        totalSetsB++;
      }
    }
    
    if (totalSetsA > totalSetsB) {
      match.result = 'teamA';
    } else if (totalSetsB > totalSetsA) {
      match.result = 'teamB';
    } else {
      match.result = 'draw';
    }
    
    // Salva le modifiche
    await match.save();
    
    // Aggiorna il foglio Google Sheets se la partita è confermata da entrambe le squadre
    if (match.confirmedByTeamA && match.confirmedByTeamB) {
      try {
        const { getSheetIdForCategory } = require('../utils/sheetsUtils');
        const googleSheetsService = require('../services/googleSheetsService');
        
        const spreadsheetId = getSheetIdForCategory(match.category);
        if (spreadsheetId) {
          await googleSheetsService.syncMatchesToSheet(spreadsheetId, match.category, [match]);
          logger.info(`Updated match result in Google Sheet for match ${match._id}`);
        }
      } catch (syncError) {
        logger.error(`Error syncing match result to Google Sheet: ${syncError.message}`);
        // Non blocchiamo il flusso se la sincronizzazione fallisce
      }
    }
    
    // Invia notifiche all'altra squadra per confermare il risultato
    await sendResultEnteredNotifications(match, teamId);
    
    // Popola i dati delle squadre per la risposta
    await match.populate('teamA', 'name');
    await match.populate('teamB', 'name');
    
    res.status(200).json({
      message: 'Risultato inserito con successo. In attesa di conferma dall\'altra squadra.',
      match
    });
  } catch (error) {
    logger.error(`Error in submitMatchResult: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Confermare risultato partita
// @route   POST /api/matches/:id/confirm
// @access  Public (con password della squadra)
exports.confirmMatchResult = async (req, res) => {
  try {
    const { teamId, password, confirm } = req.body;
    
    const match = await Match.findById(req.params.id);
    
    if (!match) {
      return res.status(404).json({ message: 'Partita non trovata' });
    }
    
    // Verificare che la squadra sia una delle due partecipanti
    if (match.teamA.toString() !== teamId && match.teamB.toString() !== teamId) {
      return res.status(403).json({ message: 'La squadra non partecipa a questa partita' });
    }
    
    // Verificare la password della squadra
    const team = await Team.findById(teamId);
    const isPasswordValid = await bcrypt.compare(password, team.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Password della squadra non valida' });
    }
    
    // Determinare quale squadra sta confermando
    const isTeamA = match.teamA.toString() === teamId;
    
    // Se la squadra richiede di cambiare il risultato
    if (!confirm) {
      // Resetta i risultati e le conferme
      match.confirmedByTeamA = false;
      match.confirmedByTeamB = false;
      match.result = 'pending';
      
      await match.save();
      
      // Invia notifiche alla squadra che aveva inserito il risultato originale
      await sendResultRejectedNotifications(match, teamId);
      
      return res.status(200).json({
        message: 'Risultato rifiutato',
        match
      });
    }
    
    // Conferma risultato
    if (isTeamA) {
      match.confirmedByTeamA = true;
    } else {
      match.confirmedByTeamB = true;
    }
    
    // Se entrambe le squadre hanno confermato
    if (match.confirmedByTeamA && match.confirmedByTeamB) {
      // Invia notifiche di risultato confermato a entrambe le squadre
      await sendResultConfirmedNotifications(match);
    }
    
    await match.save();
    
    res.status(200).json({
      message: 'Risultato confermato',
      match
    });
  } catch (error) {
    logger.error(`Error in confirmMatchResult: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// Funzioni helper per le notifiche (continuazione)

// Invio notifiche per risultato inserito
const sendResultEnteredNotifications = async (match, submittingTeamId) => {
  try {
    // Determina l'altra squadra
    const otherTeamId = match.teamA.toString() === submittingTeamId 
      ? match.teamB 
      : match.teamA;
    
    // Carica le squadre con i dati completi
    const submittingTeam = await Team.findById(submittingTeamId);
    const otherTeam = await Team.findById(otherTeamId);
    
    // Ottieni gli utenti iscritti all'altra squadra
    const users = await User.find({ subscribedTeams: otherTeamId });
    
    const scoreString = match.scoreA.map((s, i) => `${s}-${match.scoreB[i]}`).join(', ');
    const message = `⚠️ Risultato inserito da confermare!\n\n${submittingTeam.name} ha inserito il seguente risultato per la partita contro ${otherTeam.name}:\n\nSet: ${scoreString}\n\nPer favore, accedi all'app per confermare o rifiutare questo risultato.`;
    
    // Crea notifiche per gli utenti dell'altra squadra
    for (const user of users) {
      await Notification.create({
        user: user._id,
        team: otherTeamId,
        match: match._id,
        type: 'result_entered',
        message,
        status: 'pending'
      });
    }
    
    // Processa le notifiche in modo asincrono
    notificationService.processNotifications();
    
    logger.info(`Notifiche di risultato inserito inviate per il match: ${match._id}`);
  } catch (error) {
    logger.error(`Error sending result entered notifications: ${error.message}`);
  }
};

// Invio notifiche per risultato rifiutato
const sendResultRejectedNotifications = async (match, rejectingTeamId) => {
  try {
    // Determina l'altra squadra (quella che aveva inserito il risultato)
    const otherTeamId = match.teamA.toString() === rejectingTeamId 
      ? match.teamB 
      : match.teamA;
    
    // Carica le squadre con i dati completi
    const rejectingTeam = await Team.findById(rejectingTeamId);
    
    // Ottieni gli utenti iscritti all'altra squadra
    const users = await User.find({ subscribedTeams: otherTeamId });
    
    const message = `❌ Risultato rifiutato!\n\n${rejectingTeam.name} ha rifiutato il risultato inserito per la partita. Per favore, contatta l'altra squadra o il direttore di competizione.`;
    
    // Crea notifiche per gli utenti dell'altra squadra
    for (const user of users) {
      await Notification.create({
        user: user._id,
        team: otherTeamId,
        match: match._id,
        type: 'result_rejected',
        message,
        status: 'pending'
      });
    }
    
    // Processa le notifiche in modo asincrono
    notificationService.processNotifications();
    
    logger.info(`Notifiche di risultato rifiutato inviate per il match: ${match._id}`);
  } catch (error) {
    logger.error(`Error sending result rejected notifications: ${error.message}`);
  }
};

// Invio notifiche per risultato confermato
const sendResultConfirmedNotifications = async (match) => {
  try {
    // Carica le squadre con i dati completi
    const teamA = await Team.findById(match.teamA);
    const teamB = await Team.findById(match.teamB);
    
    // Ottieni gli utenti iscritti a entrambe le squadre
    const usersTeamA = await User.find({ subscribedTeams: match.teamA });
    const usersTeamB = await User.find({ subscribedTeams: match.teamB });
    
    const scoreString = match.scoreA.map((s, i) => `${s}-${match.scoreB[i]}`).join(', ');
    const message = `✅ Risultato confermato!\n\n${teamA.name} vs ${teamB.name}\n\nSet: ${scoreString}\n\nEntrambe le squadre hanno confermato il risultato.`;
    
    // Crea notifiche per gli utenti di entrambe le squadre
    for (const user of [...usersTeamA, ...usersTeamB]) {
      await Notification.create({
        user: user._id,
        team: user.subscribedTeams.includes(match.teamA) ? match.teamA : match.teamB,
        match: match._id,
        type: 'result_confirmed',
        message,
        status: 'pending'
      });
    }
    
    // Processa le notifiche in modo asincrono
    notificationService.processNotifications();
    
    logger.info(`Notifiche di risultato confermato inviate per il match: ${match._id}`);
  } catch (error) {
    logger.error(`Error sending result confirmed notifications: ${error.message}`);
  }
};
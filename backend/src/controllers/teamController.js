const Team = require('../models/Team');
const User = require('../models/User');
const logger = require('../config/logger');
const bcrypt = require('bcryptjs');

// @desc    Ottieni tutte le squadre
// @route   GET /api/teams
// @access  Public
exports.getTeams = async (req, res) => {
  try {
    const teams = await Team.find().select('-password');
    res.status(200).json(teams);
  } catch (error) {
    logger.error(`Error in getTeams: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Ottieni squadre per categoria
// @route   GET /api/teams/category/:category
// @access  Public
exports.getTeamsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const teams = await Team.find({ category }).select('-password');
    res.status(200).json(teams);
  } catch (error) {
    logger.error(`Error in getTeamsByCategory: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Ottieni una squadra specifica
// @route   GET /api/teams/:id
// @access  Public
exports.getTeamById = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id).select('-password');
    
    if (!team) {
      return res.status(404).json({ message: 'Squadra non trovata' });
    }
    
    res.status(200).json(team);
  } catch (error) {
    logger.error(`Error in getTeamById: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Crea una nuova squadra
// @route   POST /api/teams
// @access  Private/Admin
exports.createTeam = async (req, res) => {
  try {
    const { name, category, spreadsheetId, password, players } = req.body;
    
    // Verificare se esiste già una squadra con lo stesso nome
    const teamExists = await Team.findOne({ name, category });
    if (teamExists) {
      return res.status(400).json({ message: 'Esiste già una squadra con questo nome in questa categoria' });
    }
    
    // Hash della password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Creare la squadra
    const team = await Team.create({
      name,
      category,
      spreadsheetId,
      password: hashedPassword,
      players: players || [],
      subscriptions: [],
    });
    
    res.status(201).json({
      _id: team._id,
      name: team.name,
      category: team.category,
      spreadsheetId: team.spreadsheetId,
      players: team.players,
    });
  } catch (error) {
    logger.error(`Error in createTeam: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Aggiorna una squadra
// @route   PUT /api/teams/:id
// @access  Private/Admin
exports.updateTeam = async (req, res) => {
  try {
    const { name, category, spreadsheetId, password, players } = req.body;
    
    const team = await Team.findById(req.params.id);
    
    if (!team) {
      return res.status(404).json({ message: 'Squadra non trovata' });
    }
    
    // Aggiorna i campi
    team.name = name || team.name;
    team.category = category || team.category;
    team.spreadsheetId = spreadsheetId || team.spreadsheetId;
    team.players = players || team.players;
    
    // Aggiorna la password se fornita
    if (password) {
      const salt = await bcrypt.genSalt(10);
      team.password = await bcrypt.hash(password, salt);
    }
    
    const updatedTeam = await team.save();
    
    res.status(200).json({
      _id: updatedTeam._id,
      name: updatedTeam.name,
      category: updatedTeam.category,
      spreadsheetId: updatedTeam.spreadsheetId,
      players: updatedTeam.players,
    });
  } catch (error) {
    logger.error(`Error in updateTeam: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Elimina una squadra
// @route   DELETE /api/teams/:id
// @access  Private/Admin
exports.deleteTeam = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    
    if (!team) {
      return res.status(404).json({ message: 'Squadra non trovata' });
    }
    
    // Rimuovi la squadra dalle sottoscrizioni degli utenti
    await User.updateMany(
      { subscribedTeams: team._id },
      { $pull: { subscribedTeams: team._id } }
    );
    
    await team.deleteOne();
    
    res.status(200).json({ message: 'Squadra eliminata' });
  } catch (error) {
    logger.error(`Error in deleteTeam: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

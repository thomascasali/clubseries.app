const User = require('../models/User');
const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

// Generazione del token JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// @desc    Registrazione di un nuovo utente
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { email, phoneNumber, password, firstName, lastName } = req.body;

    // Aggiungi log per debug
    console.log('Register attempt:', { email, phoneNumber, firstName, lastName });

    // Verificare se l'utente esiste già
    const userExists = await User.findOne({ $or: [{ email }, { phoneNumber }] });
    if (userExists) {
      console.log('User already exists:', userExists.email);
      return res.status(400).json({ message: 'Utente già esistente' });
    }

    // Creare il nuovo utente
    const user = await User.create({
      email,
      phoneNumber,
      password,
      firstName,
      lastName,
    });

    // Generare token JWT
    const token = generateToken(user._id);

    res.status(201).json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      token,
    });
  } catch (error) {
    console.error('Error in register function:', error);
    res.status(500).json({ message: error.message || 'Errore durante la registrazione' });
  }
};

// @desc    Login utente
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Verificare se l'utente esiste
    const user = await User.findOne({ email });
    
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Credenziali non valide' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Account utente disattivato' });
    }

    // Generare token JWT
    const token = generateToken(user._id);

    res.status(200).json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      token,
    });
  } catch (error) {
    logger.error(`Error in login: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Informazioni utente corrente
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
    res.status(200).json(user);
  } catch (error) {
    logger.error(`Error in getMe: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Aggiornamento password
// @route   PUT /api/auth/update-password
// @access  Private
exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Ottenere l'utente con la password
    const user = await User.findById(req.user._id);

    // Verificare la password corrente
    if (!(await user.matchPassword(currentPassword))) {
      return res.status(401).json({ message: 'La password attuale non è corretta' });
    }

    // Impostare la nuova password
    user.password = newPassword;
    await user.save();

    res.status(200).json({ message: 'Password aggiornata con successo' });
  } catch (error) {
    logger.error(`Error in updatePassword: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

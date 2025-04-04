const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../config/logger');

// Protezione delle rotte - verifica del token JWT
exports.protect = async (req, res, next) => {
  let token;

  // Verifica presenza del token nell'header Authorization
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Verifica se il token esiste
  if (!token) {
    logger.warn('No token provided in request');
    return res.status(401).json({ message: 'Non autorizzato ad accedere a questa rotta' });
  }

  try {
    // Verifica validità del token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Ricerca l'utente associato al token
    const user = await User.findById(decoded.id);

    if (!user) {
      logger.warn(`No user found with ID ${decoded.id}`);
      return res.status(401).json({ message: 'Utente non trovato' });
    }

    if (!user.isActive) {
      logger.warn(`User ${decoded.id} is inactive`);
      return res.status(401).json({ message: 'Account utente disattivato' });
    }

    // Aggiunge l'utente alla richiesta
    req.user = user;
    next();
  } catch (error) {
    logger.error(`Error verifying token: ${error.message}`);
    return res.status(401).json({ message: 'Non autorizzato ad accedere a questa rotta' });
  }
};

// Controllo ruolo utente
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      logger.warn(`User ${req.user.id} with role ${req.user.role} attempted to access resource restricted to ${roles}`);
      return res.status(403).json({
        message: `Il ruolo ${req.user.role} non è autorizzato ad accedere a questa risorsa`,
      });
    }
    next();
  };
};

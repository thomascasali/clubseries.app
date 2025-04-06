const winston = require('winston');
const path = require('path');

// Configura il logger base
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    winston.format.printf(info => {
      const { level, message, timestamp, ...metadata } = info;
      
      // Formatta i metadati escludendo il service
      const { service, ...otherMeta } = metadata;
      const metadataStr = Object.keys(otherMeta).length 
        ? ` ${JSON.stringify(otherMeta)}`
        : '';
        
      return `${timestamp} [${level}] ${message}${metadataStr}`;
    })
  ),
  defaultMeta: { service: 'aibvc-backend' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize()
      ),
    }),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// Sostituisci i metodi di logging originali con versioni che includono il file e la riga
const originalMethods = {
  error: logger.error.bind(logger),
  warn: logger.warn.bind(logger),
  info: logger.info.bind(logger),
  debug: logger.debug.bind(logger)
};

// Funzione semplificata per trovare il chiamante
function getCallerInfo() {
  // Crea un errore per ottenere lo stack trace
  const err = new Error();
  const stack = err.stack.split('\n');
  
  // Il formato tipico è "at functionName (/path/to/file.js:line:column)"
  // Cerchiamo una riga che non contenga 'logger.js' o 'node_modules'
  for (let i = 2; i < stack.length; i++) {
    const line = stack[i].trim();
    if (!line.includes('logger.js') && !line.includes('node_modules')) {
      const match = line.match(/at\s+(?:.*\s+\()?([^:]+):(\d+)/) || [];
      if (match.length >= 3) {
        const filePath = match[1];
        const fileName = path.basename(filePath);
        const lineNumber = match[2];
        return `${fileName}:${lineNumber}`;
      }
      break;
    }
  }
  
  return 'unknown:0';
}

// Sostituisci i metodi di logging per aggiungere automaticamente il file e la riga
logger.error = function(message, ...args) {
  const location = getCallerInfo();
  return originalMethods.error(`[${location}] ${message}`, ...args);
};

logger.warn = function(message, ...args) {
  const location = getCallerInfo();
  return originalMethods.warn(`[${location}] ${message}`, ...args);
};

logger.info = function(message, ...args) {
  const location = getCallerInfo();
  return originalMethods.info(`[${location}] ${message}`, ...args);
};

logger.debug = function(message, ...args) {
  const location = getCallerInfo();
  return originalMethods.debug(`[${location}] ${message}`, ...args);
};

module.exports = logger;
/**
 * Questo file è un proxy per il servizio ristrutturato in /googleSheets
 * Mantiene le interfacce originali per garantire compatibilità con il codice esistente
 */

// Importa tutte le funzioni dal nuovo modulo
const googleSheetsModule = require('./googleSheets');

// Esporta tutte le funzioni con gli stessi nomi
module.exports = googleSheetsModule;
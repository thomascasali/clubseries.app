import api from './api';

// Ottieni tutte le partite (con filtri opzionali)
export const getMatches = async (filters = {}) => {
  try {
    const response = await api.get('/matches', { params: filters });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Impossibile recuperare le partite'
    );
  }
};

// Ottieni una partita specifica
export const getMatchById = async (matchId) => {
  try {
    const response = await api.get(`/matches/${matchId}`);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Impossibile recuperare i dati della partita'
    );
  }
};

// Crea una nuova partita (admin)
export const createMatch = async (matchData) => {
  try {
    const response = await api.post('/matches', matchData);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Impossibile creare la partita'
    );
  }
};

// Aggiorna una partita (admin)
export const updateMatch = async (matchId, matchData) => {
  try {
    const response = await api.put(`/matches/${matchId}`, matchData);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Impossibile aggiornare la partita'
    );
  }
};

// Inserisci il risultato di una partita (da parte delle squadre)
export const submitMatchResult = async (matchId, resultData) => {
  try {
    const response = await api.post(`/matches/${matchId}/result`, resultData);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Impossibile inserire il risultato'
    );
  }
};

// Conferma il risultato di una partita
export const confirmMatchResult = async (matchId, confirmData) => {
  try {
    const response = await api.post(`/matches/${matchId}/confirm`, confirmData);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Impossibile confermare il risultato'
    );
  }
};
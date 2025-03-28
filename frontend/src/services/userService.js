import api from './api';

// Ottieni tutti gli utenti (admin)
export const getUsers = async () => {
  try {
    const response = await api.get('/users');
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Impossibile recuperare gli utenti'
    );
  }
};

// Ottieni un utente specifico
export const getUserById = async (userId) => {
  try {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Impossibile recuperare i dati utente'
    );
  }
};

// Aggiorna un utente
export const updateUser = async (userId, userData) => {
  try {
    const response = await api.put(`/users/${userId}`, userData);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Impossibile aggiornare l\'utente'
    );
  }
};

// Iscriviti alle notifiche di una squadra
export const subscribeToTeam = async (teamId) => {
  try {
    const response = await api.post('/users/subscribe', { teamId });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Impossibile iscriversi alla squadra'
    );
  }
};

// Annulla iscrizione alle notifiche di una squadra
export const unsubscribeFromTeam = async (teamId) => {
  try {
    const response = await api.post('/users/unsubscribe', { teamId });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Impossibile annullare l\'iscrizione alla squadra'
    );
  }
};

// Ottieni le squadre a cui l'utente è iscritto
export const getSubscribedTeams = async () => {
  try {
    const response = await api.get('/users/subscriptions');
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Impossibile recuperare le iscrizioni'
    );
  }
};

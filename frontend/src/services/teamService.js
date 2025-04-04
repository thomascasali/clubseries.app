import api from './api';

// Ottieni tutte le squadre
export const getTeams = async () => {
  try {
    const response = await api.get('/teams');
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Impossibile recuperare le squadre'
    );
  }
};

// Ottieni squadre per categoria
export const getTeamsByCategory = async (category) => {
  try {
    const response = await api.get(`/teams/category/${category}`);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Impossibile recuperare le squadre per questa categoria'
    );
  }
};

// Ottieni una squadra specifica
export const getTeamById = async (teamId) => {
  try {
    const response = await api.get(`/teams/${teamId}`);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Impossibile recuperare i dati della squadra'
    );
  }
};

// Crea una nuova squadra (admin)
export const createTeam = async (teamData) => {
  try {
    const response = await api.post('/teams', teamData);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Impossibile creare la squadra'
    );
  }
};

// Aggiorna una squadra (admin)
export const updateTeam = async (teamId, teamData) => {
  try {
    const response = await api.put(`/teams/${teamId}`, teamData);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Impossibile aggiornare la squadra'
    );
  }
};

// Elimina una squadra (admin)
export const deleteTeam = async (teamId) => {
  try {
    const response = await api.delete(`/teams/${teamId}`);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Impossibile eliminare la squadra'
    );
  }
};
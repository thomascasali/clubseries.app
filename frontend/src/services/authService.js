import api from './api';

// Login utente
export const loginUser = async (email, password) => {
  try {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Impossibile effettuare il login'
    );
  }
};

// Registrazione utente
export const registerUser = async (userData) => {
  try {
    const response = await api.post('/auth/register', userData);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Impossibile effettuare la registrazione'
    );
  }
};

// Ottieni dati utente corrente
export const getCurrentUser = async () => {
  try {
    const response = await api.get('/auth/me');
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Impossibile recuperare i dati utente'
    );
  }
};

// Aggiornamento password
export const updatePassword = async (currentPassword, newPassword) => {
  try {
    const response = await api.put('/auth/update-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Impossibile aggiornare la password'
    );
  }
};

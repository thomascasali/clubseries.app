import api from './api';

// Ottieni tutte le notifiche dell'utente
export const getNotifications = async () => {
  try {
    const response = await api.get('/notifications');
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Impossibile recuperare le notifiche'
    );
  }
};

// Segna una notifica come letta
export const markAsRead = async (notificationId) => {
  try {
    const response = await api.put(`/notifications/${notificationId}`);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Impossibile segnare la notifica come letta'
    );
  }
};

// Segna tutte le notifiche come lette
export const markAllAsRead = async () => {
  try {
    const response = await api.put('/notifications/read-all');
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Impossibile segnare tutte le notifiche come lette'
    );
  }
};

// Elimina una notifica
export const deleteNotification = async (notificationId) => {
  try {
    const response = await api.delete(`/notifications/${notificationId}`);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Impossibile eliminare la notifica'
    );
  }
};

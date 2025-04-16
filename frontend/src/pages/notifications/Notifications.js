// src/pages/notifications/Notifications.js
import React, { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  Button,
  Divider,
  CircularProgress,
  Alert,
  Paper,
  IconButton,
  Badge,
  Tooltip,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  CheckCircle as ReadIcon,
  NotificationsActive as UnreadIcon,
} from '@mui/icons-material';
import { 
  getNotifications, 
  markAsRead, 
  markAllAsRead, 
  deleteNotification,
  deleteAllNotifications
} from '../../services/notificationService';
import moment from 'moment';
import 'moment/locale/it';
// Imposta la lingua italiana per moment
moment.locale('it');

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Carica le notifiche
  const loadNotifications = async () => {
    setLoading(true);
    setError('');
    
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error('Error loading notifications:', err);
      setError(err.message || 'Errore durante il caricamento delle notifiche');
    } finally {
      setLoading(false);
    }
  };

  // Segna una notifica come letta
  const handleMarkAsRead = async (notificationId) => {
    try {
      await markAsRead(notificationId);
      // Aggiorna lo stato localmente
      setNotifications(notifications.map(n => 
        n._id === notificationId ? { ...n, read: true } : n
      ));
    } catch (err) {
      console.error('Error marking notification as read:', err);
      setError(err.message || 'Errore durante la marcatura della notifica');
    }
  };

  // Segna tutte le notifiche come lette
  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      // Aggiorna lo stato localmente
      setNotifications(notifications.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      setError(err.message || 'Errore durante la marcatura di tutte le notifiche');
    }
  };

  // Elimina una notifica
  const handleDeleteNotification = async (notificationId) => {
    try {
      await deleteNotification(notificationId);
      // Rimuovi la notifica dalla lista locale
      setNotifications(notifications.filter(n => n._id !== notificationId));
    } catch (err) {
      console.error('Error deleting notification:', err);
      setError(err.message || 'Errore durante l\'eliminazione della notifica');
    }
  };

  // Elimina tutte le notifiche
  const handleDeleteAllNotifications = async () => {
    if (window.confirm('Sei sicuro di voler eliminare tutte le notifiche?')) {
      try {
        await deleteAllNotifications();
        // Svuota la lista locale
        setNotifications([]);
      } catch (err) {
        console.error('Error deleting all notifications:', err);
        setError(err.message || 'Errore durante l\'eliminazione di tutte le notifiche');
      }
    }
  };

  // Carica le notifiche all'avvio
  useEffect(() => {
    loadNotifications();
  }, []);

  // Conteggio delle notifiche non lette
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Container maxWidth="md">
      <Box py={3}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4">
            Le Mie Notifiche
            {unreadCount > 0 && (
              <Badge 
                badgeContent={unreadCount} 
                color="error" 
                sx={{ ml: 2 }}
              />
            )}
          </Typography>
          
          <Box>
            {unreadCount > 0 && (
              <Button 
                variant="outlined" 
                startIcon={<ReadIcon />}
                onClick={handleMarkAllAsRead}
                sx={{ mr: 2 }}
              >
                Segna tutte come lette
              </Button>
            )}
            
            {notifications.length > 0 && (
              <Button 
                variant="outlined" 
                startIcon={<DeleteIcon />}
                onClick={handleDeleteAllNotifications}
                color="error"
              >
                Elimina tutte
              </Button>
            )}
          </Box>
        </Box>
        {loading ? (
          <Box display="flex" justifyContent="center" p={5}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        ) : notifications.length === 0 ? (
          <Paper elevation={1} sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              Non hai notifiche
            </Typography>
          </Paper>
        ) : (
          <Paper elevation={2}>
            <List>
              {notifications.map((notification, index) => (
                <React.Fragment key={notification._id}>
                  {index > 0 && <Divider />}
                  <ListItem
                    alignItems="flex-start"
                    sx={{
                      bgcolor: notification.read ? 'transparent' : 'rgba(25, 118, 210, 0.08)',
                    }}
                    secondaryAction={
                      <Box>
                        {!notification.read && (
                          <Tooltip title="Segna come letta">
                            <IconButton 
                              edge="end"
                              onClick={() => handleMarkAsRead(notification._id)}
                              color="primary"
                            >
                              <ReadIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Elimina">
                          <IconButton 
                            edge="end" 
                            onClick={() => handleDeleteNotification(notification._id)}
                            color="error"
                            sx={{ ml: 1 }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    }
                  >
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" justifyContent="space-between">
                          <Box display="flex" alignItems="center">
                            {!notification.read && (
                              <UnreadIcon color="primary" fontSize="small" sx={{ mr: 1 }} />
                            )}
                            <Typography 
                              variant="subtitle1" 
                              component="span"
                              sx={{ fontWeight: notification.read ? 'normal' : 'bold' }}
                            >
                              {notification.type === 'match_scheduled' && 'Nuova partita programmata'}
                              {notification.type === 'match_updated' && 'Aggiornamento partita'}
                              {notification.type === 'result_entered' && 'Risultato da confermare'}
                              {notification.type === 'result_confirmed' && 'Risultato confermato'}
                              {notification.type === 'result_rejected' && 'Risultato rifiutato'}
                            </Typography>
                          </Box>
                          <Typography
                            component="span"
                            variant="caption"
                            color="text.secondary"
                          >
                            {moment(notification.createdAt).fromNow()}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <>
                          <Typography
                            component="span"
                            variant="body2"
                            color="text.primary"
                            sx={{ display: 'block', whiteSpace: 'pre-line' }}
                          >
                            {notification.message}
                          </Typography>
                          {notification.match && (
                            <Button
                              size="small"
                              variant="text"
                              component={RouterLink}
                              to={`/matches/${typeof notification.match === 'object' && notification.match !== null ? notification.match._id : notification.match}`}
                              sx={{ mt: 1 }}
                            >
                              Dettagli partita
                            </Button>
                          )}
                        </>
                      }
                    />
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          </Paper>
        )}
      </Box>
    </Container>
  );
};

export default Notifications;
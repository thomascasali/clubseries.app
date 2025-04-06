import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Paper,
  Typography,
  Box,
  Divider,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Button,
  Chip
} from '@mui/material';
import { 
  Notifications as NotificationIcon,
  Schedule as ScheduleIcon,
  SportsCricket as SportsCricketIcon,
  Room as RoomIcon,
  Today as TodayIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';

const NotificationsSection = ({ loading, error, notifications }) => {
  // Ottiene l'icona appropriata per il tipo di notifica
  const getNotificationIcon = (type, message) => {
    if (message) {
      if (message.startsWith('🕒 Cambio orario partita')) {
        return <ScheduleIcon color="primary" fontSize="small" />;
      }
      if (message.startsWith('🏟️ Cambio campo partita')) {
        return <RoomIcon color="primary" fontSize="small" />;
      }
      if (message.startsWith('📅 Cambio data partita')) {
        return <TodayIcon color="primary" fontSize="small" />;
      }
      if (message.startsWith('📊 Risultato aggiornato')) {
        return <SportsCricketIcon color="primary" fontSize="small" />;
      }
    }

    switch (type) {
      case 'match_scheduled':
        return <NotificationIcon color="primary" fontSize="small" />;
      case 'match_updated':
        return <InfoIcon color="info" fontSize="small" />;
      case 'result_updated':
        return <SportsCricketIcon color="primary" fontSize="small" />;
      case 'result_entered':
        return <InfoIcon color="warning" fontSize="small" />;
      case 'result_confirmed':
        return <CheckCircleIcon color="success" fontSize="small" />;
      case 'result_rejected':
        return <CancelIcon color="error" fontSize="small" />;
      default:
        return <NotificationIcon color="default" fontSize="small" />;
    }
  };

  // Ottiene un titolo descrittivo per il tipo di notifica
  const getNotificationLabel = (type, message) => {
    if (message) {
      if (message.startsWith('🕒 Cambio orario partita')) {
        return 'Cambio orario';
      }
      if (message.startsWith('🏟️ Cambio campo partita')) {
        return 'Cambio campo';
      }
      if (message.startsWith('📅 Cambio data partita')) {
        return 'Cambio data';
      }
      if (message.startsWith('📊 Risultato aggiornato')) {
        return 'Risultato aggiornato';
      }
      if (message.startsWith('🏆 GOLDEN SET')) {
        return 'Golden Set';
      }
    }

    switch (type) {
      case 'match_scheduled':
        return 'Nuova partita';
      case 'match_updated':
        return 'Aggiornamento partita';
      case 'result_updated':
        return 'Risultato aggiornato';
      case 'result_entered':
        return 'Conferma risultato';
      case 'result_confirmed':
        return 'Risultato confermato';
      case 'result_rejected':
        return 'Risultato rifiutato';
      default:
        return 'Notifica';
    }
  };

  // Ottiene il colore del chip per il tipo di notifica
  const getNotificationColor = (type, message) => {
    if (message) {
      if (message.startsWith('🕒 Cambio orario partita')) {
        return 'info';
      }
      if (message.startsWith('🏟️ Cambio campo partita')) {
        return 'info';
      }
      if (message.startsWith('📅 Cambio data partita')) {
        return 'warning';
      }
      if (message.startsWith('📊 Risultato aggiornato')) {
        return 'success';
      }
      if (message.startsWith('🏆 GOLDEN SET')) {
        return 'error';
      }
    }

    switch (type) {
      case 'match_scheduled':
        return 'primary';
      case 'match_updated':
        return 'info';
      case 'result_updated':
        return 'success';
      case 'result_entered':
        return 'warning';
      case 'result_confirmed':
        return 'success';
      case 'result_rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Paper elevation={2}>
      <Box p={2} display="flex" alignItems="center">
        <NotificationIcon color="primary" sx={{ mr: 1 }} />
        <Typography variant="h6">Ultime Notifiche</Typography>
      </Box>
      <Divider />
      <Box p={2}>
        {loading ? (
          <Box display="flex" justifyContent="center" p={2}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : notifications.length === 0 ? (
          <Typography align="center" color="text.secondary" p={2}>
            Nessuna notifica
          </Typography>
        ) : (
          notifications.map((notification) => (
            <Card key={notification._id} variant="outlined" sx={{ mb: 2, maxWidth: '100%' }}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  {getNotificationIcon(notification.type, notification.message)}
                  <Chip 
                    label={getNotificationLabel(notification.type, notification.message)}
                    color={getNotificationColor(notification.type, notification.message)}
                    size="small"
                    sx={{ ml: 1 }}
                  />
                </Box>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    maxHeight: '3em', 
                    overflow: 'hidden', 
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    textOverflow: 'ellipsis',
                    wordBreak: 'break-word',
                    whiteSpace: 'normal'
                  }}
                >
                  {notification.message}
                </Typography>
                {notification.match && (
                  <Button 
                    size="small" 
                    component={RouterLink} 
                    to={`/matches/${notification.match}`}
                    sx={{ mt: 1 }}
                  >
                    Dettagli partita
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
        <Button 
          variant="outlined" 
          fullWidth 
          component={RouterLink} 
          to="/notifications"
          sx={{ mt: 2 }}
        >
          Vedi tutte le notifiche
        </Button>
      </Box>
    </Paper>
  );
};

export default NotificationsSection;
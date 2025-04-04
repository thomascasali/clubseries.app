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
  Button
} from '@mui/material';
import { Notifications as NotificationIcon } from '@mui/icons-material';

const NotificationsSection = ({ loading, error, notifications }) => {
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
            <Card key={notification._id} variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle1">
                  {notification.type === 'match_scheduled' && 'Nuova partita programmata'}
                  {notification.type === 'match_updated' && 'Aggiornamento partita'}
                  {notification.type === 'result_entered' && 'Risultato da confermare'}
                  {notification.type === 'result_confirmed' && 'Risultato confermato'}
                  {notification.type === 'result_rejected' && 'Risultato rifiutato'}
                </Typography>
                <Typography variant="body2" noWrap sx={{ maxHeight: '3em', overflow: 'hidden' }}>
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

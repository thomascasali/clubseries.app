// frontend/src/pages/NotificationsDebug.js
import React, { useState, useEffect } from 'react';
import { Button, TextField, Typography, Box, Paper, Alert } from '@mui/material';
import firebaseService from '../services/firebaseService';

const NotificationsDebug = () => {
  const [token, setToken] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [notification, setNotification] = useState(null);
  
  useEffect(() => {
    // Controlla se il service worker è supportato
    const checkServiceWorker = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
          if (registration) {
            setStatus('Service Worker registrato correttamente');
          } else {
            setStatus('Service Worker non registrato!');
          }
        } catch (err) {
          setError(`Errore nel service worker: ${err.message}`);
        }
      } else {
        setError('Service Worker non supportato in questo browser');
      }
    };
    
    checkServiceWorker();
    
    // Controlla lo stato delle notifiche
    if ('Notification' in window) {
      setStatus(prev => `${prev}\nStato permessi notifiche: ${Notification.permission}`);
    } else {
      setError(prev => `${prev}\nNotifiche non supportate in questo browser`);
    }
    
    // Imposta un handler per le notifiche in foreground
    firebaseService.setOnMessageHandler((payload) => {
      console.log('Notifica ricevuta in debug:', payload);
      setNotification(payload);
    });
  }, []);
  
  const requestPermission = async () => {
    try {
      setStatus('Richiesta permesso notifiche...');
      const newToken = await firebaseService.requestNotificationPermission();
      if (newToken) {
        setToken(newToken);
        setStatus(`Permesso concesso. Token ottenuto: ${newToken.substring(0, 10)}...`);
      } else {
        setError('Impossibile ottenere il token FCM');
      }
    } catch (err) {
      setError(`Errore nella richiesta permesso: ${err.message}`);
    }
  };
  
  const copyToken = () => {
    navigator.clipboard.writeText(token);
    setStatus('Token copiato negli appunti!');
  };
  
  return (
    <Box sx={{ padding: 3 }}>
      <Typography variant="h4" gutterBottom>Debug Notifiche</Typography>
      
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6">Stato</Typography>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{status || 'Nessuna informazione'}</pre>
        {error && <Alert severity="error">{error}</Alert>}
      </Paper>
      
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6">Richiedi Permesso e Token</Typography>
        <Button variant="contained" onClick={requestPermission} sx={{ mb: 2 }}>
          Richiedi Permesso Notifiche
        </Button>
        
        {token && (
          <Box>
            <TextField
              fullWidth
              label="Token FCM"
              value={token}
              multiline
              rows={3}
              variant="outlined"
              margin="normal"
              InputProps={{ readOnly: true }}
            />
            <Button variant="outlined" onClick={copyToken}>
              Copia Token
            </Button>
          </Box>
        )}
      </Paper>
      
      {notification && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6">Ultima Notifica Ricevuta</Typography>
          <pre>{JSON.stringify(notification, null, 2)}</pre>
        </Paper>
      )}
    </Box>
  );
};

export default NotificationsDebug;
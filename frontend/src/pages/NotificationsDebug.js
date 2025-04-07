import React, { useState, useEffect } from 'react';
import { Button, TextField, Typography, Box, Paper, Alert, Divider, List, ListItem, ListItemText } from '@mui/material';
import firebaseService from '../services/firebaseService';

const NotificationsDebug = () => {
  const [token, setToken] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [notification, setNotification] = useState(null);
  const [serviceWorkerStatus, setServiceWorkerStatus] = useState('Checking...');
  const [logs, setLogs] = useState([]);
  
  // Funzione per aggiungere log
  const addLog = (message) => {
    setLogs(prev => [...prev, `${new Date().toISOString().substring(11, 19)} - ${message}`]);
  };
  
  useEffect(() => {
    // Controlla se il service worker è supportato
    const checkServiceWorker = async () => {
      if ('serviceWorker' in navigator) {
        try {
          addLog('Checking service worker registration...');
          const registrations = await navigator.serviceWorker.getRegistrations();
          if (registrations.length > 0) {
            const fcmRegistration = registrations.find(reg => 
              reg.scope.includes('firebase-messaging-sw.js') || reg.active?.scriptURL.includes('firebase-messaging-sw.js')
            );
            
            if (fcmRegistration) {
              setServiceWorkerStatus(`Service Worker registrato: ${fcmRegistration.scope}`);
              addLog(`Service Worker registrato: ${fcmRegistration.scope}`);
            } else {
              setServiceWorkerStatus(`Service Worker generico registrato, ma non per FCM. Scope: ${registrations[0].scope}`);
              addLog('Service Worker generico registrato, ma non per FCM');
            }
          } else {
            setServiceWorkerStatus('Nessun Service Worker registrato!');
            addLog('Nessun Service Worker registrato!');
          }
        } catch (err) {
          setError(`Errore nel service worker: ${err.message}`);
          addLog(`Errore nel service worker: ${err.message}`);
        }
      } else {
        setError('Service Worker non supportato in questo browser');
        addLog('Service Worker non supportato in questo browser');
      }
    };
    
    checkServiceWorker();
    
    // Controlla lo stato delle notifiche
    if ('Notification' in window) {
      const permStatus = `Stato permessi notifiche: ${Notification.permission}`;
      setStatus(prev => `${prev}\n${permStatus}`);
      addLog(permStatus);
    } else {
      const noNotifications = 'Notifiche non supportate in questo browser';
      setError(prev => `${prev}\n${noNotifications}`);
      addLog(noNotifications);
    }
    
    // Imposta un handler per le notifiche in foreground
    firebaseService.setOnMessageHandler((payload) => {
      console.log('Notifica ricevuta in debug:', payload);
      addLog(`Notifica ricevuta: ${payload.notification?.title || 'Senza titolo'}`);
      setNotification(payload);
    });
  }, []);
  
  const requestPermission = async () => {
    try {
      addLog('Richiesta permesso notifiche...');
      setStatus('Richiesta permesso notifiche...');
      const newToken = await firebaseService.requestNotificationPermission();
      if (newToken) {
        setToken(newToken);
        const tokenMessage = `Permesso concesso. Token ottenuto: ${newToken.substring(0, 10)}...`;
        setStatus(tokenMessage);
        addLog(tokenMessage);
      } else {
        const errorMsg = 'Impossibile ottenere il token FCM';
        setError(errorMsg);
        addLog(errorMsg);
      }
    } catch (err) {
      const errorMsg = `Errore nella richiesta permesso: ${err.message}`;
      setError(errorMsg);
      addLog(errorMsg);
    }
  };
  
  const registerServiceWorker = async () => {
    try {
      addLog('Tentativo di registrazione service worker...');
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
      addLog(`Service worker registrato con successo: ${registration.scope}`);
      setServiceWorkerStatus(`Service Worker registrato manualmente: ${registration.scope}`);
    } catch (err) {
      const errorMsg = `Errore nella registrazione del service worker: ${err.message}`;
      setError(errorMsg);
      addLog(errorMsg);
    }
  };
  
  const unregisterServiceWorkers = async () => {
    try {
      addLog('Tentativo di rimozione service workers...');
      const registrations = await navigator.serviceWorker.getRegistrations();
      
      for (let registration of registrations) {
        await registration.unregister();
        addLog(`Service worker rimosso: ${registration.scope}`);
      }
      
      setServiceWorkerStatus('Tutti i Service Workers sono stati rimossi');
    } catch (err) {
      const errorMsg = `Errore nella rimozione dei service workers: ${err.message}`;
      setError(errorMsg);
      addLog(errorMsg);
    }
  };
  
  const copyToken = () => {
    navigator.clipboard.writeText(token);
    addLog('Token copiato negli appunti!');
    setStatus('Token copiato negli appunti!');
  };
  
  const sendTestNotification = async () => {
    try {
      addLog('Invio notifica di test...');
      const response = await fetch('/api/users/test-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      const data = await response.json();
      if (response.ok) {
        addLog(`Notifica inviata con successo: ${data.message}`);
        setStatus(`Notifica di test inviata: ${data.message}`);
      } else {
        throw new Error(data.message || 'Errore nell\'invio della notifica');
      }
    } catch (err) {
      const errorMsg = `Errore nell'invio della notifica di test: ${err.message}`;
      setError(errorMsg);
      addLog(errorMsg);
    }
  };
  
  return (
    <Box sx={{ padding: 3 }}>
      <Typography variant="h4" gutterBottom>Debug Notifiche</Typography>
      
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6">Service Worker</Typography>
        <Typography>{serviceWorkerStatus}</Typography>
        <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
          <Button variant="contained" color="primary" onClick={registerServiceWorker}>
            Registra Service Worker
          </Button>
          <Button variant="outlined" color="secondary" onClick={unregisterServiceWorkers}>
            Rimuovi Service Workers
          </Button>
        </Box>
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
        
        <Box sx={{ mt: 2 }}>
          <Button 
            variant="contained" 
            color="secondary" 
            onClick={sendTestNotification}
            disabled={!token}
          >
            Invia Notifica di Test
          </Button>
        </Box>
      </Paper>
      
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6">Stato</Typography>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{status || 'Nessuna informazione'}</pre>
        {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
      </Paper>
      
      {notification && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6">Ultima Notifica Ricevuta</Typography>
          <pre style={{ overflowX: 'auto' }}>{JSON.stringify(notification, null, 2)}</pre>
        </Paper>
      )}
      
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6">Log</Typography>
        <Divider sx={{ my: 1 }} />
        <List dense>
          {logs.map((log, index) => (
            <ListItem key={index} divider={index < logs.length - 1}>
              <ListItemText primary={log} />
            </ListItem>
          ))}
        </List>
      </Paper>
    </Box>
  );
};

export default NotificationsDebug;
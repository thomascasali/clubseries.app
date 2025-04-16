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
  Dialog, // Aggiunto per conferma
  DialogActions, // Aggiunto per conferma
  DialogContent, // Aggiunto per conferma
  DialogContentText, // Aggiunto per conferma
  DialogTitle, // Aggiunto per conferma
} from '@mui/material';
import {
  Delete as DeleteIcon,
  CheckCircle as ReadIcon,
  NotificationsActive as UnreadIcon,
  DeleteSweep as DeleteSweepIcon, // Icona per elimina tutte
} from '@mui/icons-material';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications, // <-- IMPORTA QUESTA NUOVA FUNZIONE DAL TUO SERVICE
} from '../services/notificationService'; // Assicurati che il path sia corretto!
import moment from 'moment';
import 'moment/locale/it';
import { toast } from 'react-toastify';

// Imposta la lingua italiana per moment
moment.locale('it');

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false); // Stato per dialogo conferma eliminazione

  // Carica le notifiche
  const loadNotifications = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error('Error loading notifications:', err);
      // Mostra un errore più specifico se disponibile dal backend
      setError(err?.response?.data?.message || err.message || 'Errore durante il caricamento delle notifiche');
    } finally {
      setLoading(false);
    }
  };

  // Segna una notifica come letta
  const handleMarkAsRead = async (notificationId) => {
    try {
      await markAsRead(notificationId);
      // Aggiorna lo stato localmente usando una funzione per evitare race conditions
       setNotifications(currentNotifications =>
        currentNotifications.map(n =>
          n._id === notificationId ? { ...n, read: true } : n
        )
      );
      toast.success('Notifica segnata come letta');
    } catch (err) {
      console.error('Error marking notification as read:', err);
      toast.error(err?.response?.data?.message || err.message || 'Errore durante la marcatura della notifica');
    }
  };

  // Segna tutte le notifiche come lette
  const handleMarkAllAsRead = async () => {
    // !!! ATTENZIONE: SE QUESTA FUNZIONE NON VA, IL PROBLEMA È QUASI CERTAMENTE !!!
    // !!! NEL BACKEND (API) O NELL'IMPLEMENTAZIONE DI `markAllAsRead` IN notificationService.js !!!
    console.log('Attempting to mark all as read...'); // LOG PER DEBUG
    try {
      const response = await markAllAsRead(); // Chiamata al servizio
      console.log('API call successful:', response); // LOG PER DEBUG (vedi cosa ritorna l'API)
      // Aggiorna lo stato localmente (ottimistico)
       setNotifications(currentNotifications => {
          const updated = currentNotifications.map(n => ({ ...n, read: true }));
          console.log('Local state updated for mark all:', updated); // LOG PER DEBUG
          return updated;
      });
      toast.success(response?.message || 'Tutte le notifiche segnate come lette');
      // Potresti voler ricaricare le notifiche dal server se l'API non ritorna lo stato aggiornato
      // await loadNotifications();
    } catch (err) {
      console.error('Error marking all notifications as read:', err.response || err); // Log errore dettagliato
      toast.error(err?.response?.data?.message || err.message || 'Errore durante la marcatura di tutte le notifiche');
    }
  };

  // Elimina una notifica
  const handleDeleteNotification = async (notificationId) => {
    try {
      await deleteNotification(notificationId);
      // Rimuovi la notifica dalla lista locale
       setNotifications(currentNotifications =>
        currentNotifications.filter(n => n._id !== notificationId)
      );
      toast.success('Notifica eliminata');
    } catch (err) {
      console.error('Error deleting notification:', err);
      toast.error(err?.response?.data?.message || err.message || 'Errore durante l\'eliminazione della notifica');
    }
  };

  // --- Funzioni per ELIMINA TUTTE ---
  const handleOpenConfirmDeleteAll = () => {
    setOpenConfirmDialog(true);
  };

  const handleCloseConfirmDialog = () => {
    setOpenConfirmDialog(false);
  };

  const handleConfirmDeleteAll = async () => {
    handleCloseConfirmDialog(); // Chiudi dialogo
    setLoading(true); // Mostra caricamento
    try {
      // Assicurati che la funzione deleteAllNotifications esista nel tuo service e funzioni!
      await deleteAllNotifications();
      setNotifications([]); // Svuota l'array locale
      toast.success('Tutte le notifiche sono state eliminate.');
    } catch (err) {
      console.error('Error deleting all notifications:', err);
      toast.error(err?.response?.data?.message || err.message || 'Errore durante l\'eliminazione di tutte le notifiche.');
    } finally {
        setLoading(false);
    }
  };
  // --- Fine Funzioni per ELIMINA TUTTE ---


  // Carica le notifiche all'avvio
  useEffect(() => {
    loadNotifications();
  }, []);

  // Conteggi
  const unreadCount = notifications.filter(n => !n.read).length;
  const totalCount = notifications.length;

  return (
    <Container maxWidth="md">
      <Box py={3}>
        {/* Header con Titolo e Bottoni Azione */}
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={3}>
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

          {/* Gruppo bottoni azioni */}
          <Box display="flex" flexWrap="wrap" gap={1}> {/* Aggiunto flexWrap anche qui */}
            {unreadCount > 0 && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<ReadIcon />}
                onClick={handleMarkAllAsRead}
              >
                Tutte lette
              </Button>
            )}
            {/* Bottone ELIMINA TUTTE (condizionale) */}
            {totalCount > 0 && (
              <Button
                variant="outlined"
                size="small"
                color="error"
                startIcon={<DeleteSweepIcon />}
                onClick={handleOpenConfirmDeleteAll} // Apre il dialogo
              >
                Elimina tutte
              </Button>
            )}
          </Box>
        </Box>

        {/* Dialogo di Conferma Eliminazione Tutte */}
        <Dialog
            open={openConfirmDialog}
            onClose={handleCloseConfirmDialog}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
        >
            <DialogTitle id="alert-dialog-title">
             Conferma Eliminazione
            </DialogTitle>
            <DialogContent>
            <DialogContentText id="alert-dialog-description">
                Sei sicuro di voler eliminare tutte le tue notifiche? L'azione è irreversibile.
            </DialogContentText>
            </DialogContent>
            <DialogActions>
            <Button onClick={handleCloseConfirmDialog}>Annulla</Button>
            <Button onClick={handleConfirmDeleteAll} color="error" autoFocus>
                Elimina Tutte
            </Button>
            </DialogActions>
      </Dialog>

        {/* Contenuto Principale (Loading, Error, Lista) */}
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
             <List sx={{ padding: 0 }}> {/* Rimuovi padding di default della lista */}
               {notifications.map((notification, index) => (
                 <React.Fragment key={notification._id}>
                   {index > 0 && <Divider component="li" />} {/* Divider come li item */}
                   <ListItem
                     alignItems="flex-start"
                     sx={{
                       bgcolor: notification.read ? 'transparent' : 'action.hover',
                       '&:hover': {
                           bgcolor: notification.read ? 'action.selected' : 'rgba(25, 118, 210, 0.12)',
                       },
                       // Aggiungi padding ai lati se rimosso da List
                       paddingLeft: 2,
                       paddingRight: 2,
                     }}
                     secondaryAction={
                       <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0, pl: 1 }}> {/* pl per spazio */}
                         {!notification.read && (
                           <Tooltip title="Segna come letta">
                             <IconButton
                               edge={false}
                               onClick={() => handleMarkAsRead(notification._id)}
                               color="primary"
                               size="small"
                             >
                               <ReadIcon fontSize="small" />
                             </IconButton>
                           </Tooltip>
                         )}
                         <Tooltip title="Elimina">
                           <IconButton
                             edge={false}
                             onClick={() => handleDeleteNotification(notification._id)}
                             color="error"
                             size="small"
                             sx={{ ml: 0.5 }}
                           >
                             <DeleteIcon fontSize="small" />
                           </IconButton>
                         </Tooltip>
                       </Box>
                     }
                   >
                     <ListItemText
                       primary={
                         <Box display="flex" alignItems="center">
                           {!notification.read && (
                             <UnreadIcon color="primary" fontSize="small" sx={{ mr: 1, flexShrink: 0 }} />
                           )}
                           <Typography
                             variant="body1"
                             component="span"
                             sx={{ fontWeight: notification.read ? 'normal' : 'bold' }}
                           >
                             {notification.type === 'match_scheduled' && 'Nuova partita programmata'}
                             {notification.type === 'match_updated' && 'Aggiornamento partita'}
                             {notification.type === 'result_entered' && 'Risultato da confermare'}
                             {notification.type === 'result_confirmed' && 'Risultato confermato'}
                             {notification.type === 'result_rejected' && 'Risultato rifiutato'}
                             {/* Fallback per tipi non riconosciuti */}
                             {!['match_scheduled', 'match_updated', 'result_entered', 'result_confirmed', 'result_rejected'].includes(notification.type) && (notification.type || 'Notifica')}
                           </Typography>
                         </Box>
                       }
                       secondary={
                         <>
                           <Typography
                             component="span"
                             variant="body2"
                             color="text.secondary"
                             sx={{ display: 'block', whiteSpace: 'pre-line', mt: 0.5 }}
                           >
                             {notification.message}
                           </Typography>
                           <Typography
                             component="span"
                             variant="caption"
                             color="text.secondary"
                             sx={{ display: 'block', mt: 0.5 }}
                           >
                             {moment(notification.createdAt).fromNow()}
                           </Typography>
                           {/* Bottone Dettagli Partita */}
                           {notification.match?._id && ( // Controllo più sicuro
                             <Button
                               size="small"
                               variant="text"
                               component={RouterLink}
                               to={`/matches/${notification.match._id.toString()}`}
                               sx={{ mt: 1, p: 0.5, lineHeight: 1.2 }} // Aggiusta stile bottone
                             >
                               Dettagli partita
                             </Button>
                           )}
                         </>
                       }
                       // Riduci padding secondario per lasciare spazio alle azioni
                       sx={{ pr: 1 }}
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
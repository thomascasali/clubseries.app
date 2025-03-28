import React, { useState, useEffect, useContext } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Divider,
  CircularProgress,
  Alert,
  Chip,
  Paper,
} from '@mui/material';
import {
  CalendarMonth as CalendarIcon,
  Groups as TeamIcon,
  Notifications as NotificationIcon,
} from '@mui/icons-material';
import { AuthContext } from '../context/AuthContext';
import { getMatches } from '../services/matchService';
import { getSubscribedTeams } from '../services/userService';
import { getNotifications } from '../services/notificationService';
import moment from 'moment';
import 'moment/locale/it';

// Imposta la lingua italiana per moment
moment.locale('it');

const Dashboard = () => {
  const { currentUser } = useContext(AuthContext);
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [subscribedTeams, setSubscribedTeams] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState({
    matches: false,
    teams: false,
    notifications: false
  });
  const [error, setError] = useState({
    matches: '',
    teams: '',
    notifications: ''
  });

  // Carica le prossime partite
  const loadUpcomingMatches = async () => {
    setLoading(prev => ({ ...prev, matches: true }));
    setError(prev => ({ ...prev, matches: '' }));
    
    try {
      // Ottieni la data di oggi
      const today = moment().format('YYYY-MM-DD');
      
      // Carica le partite di oggi e future
      const matches = await getMatches({ date: today });
      
      // Ordina per data e ora
      const sortedMatches = matches.sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time}`);
        const dateB = new Date(`${b.date}T${b.time}`);
        return dateA - dateB;
      });
      
      // Prendi solo le prime 4 partite
      setUpcomingMatches(sortedMatches.slice(0, 4));
    } catch (err) {
      console.error('Error loading matches:', err);
      setError(prev => ({ ...prev, matches: err.message }));
    } finally {
      setLoading(prev => ({ ...prev, matches: false }));
    }
  };

  // Carica le squadre sottoscritte (solo per utenti autenticati)
  const loadSubscribedTeams = async () => {
    if (!currentUser) return;
    
    setLoading(prev => ({ ...prev, teams: true }));
    setError(prev => ({ ...prev, teams: '' }));
    
    try {
      const teams = await getSubscribedTeams();
      setSubscribedTeams(teams);
    } catch (err) {
      console.error('Error loading subscribed teams:', err);
      setError(prev => ({ ...prev, teams: err.message }));
    } finally {
      setLoading(prev => ({ ...prev, teams: false }));
    }
  };

  // Carica le notifiche recenti (solo per utenti autenticati)
  const loadNotifications = async () => {
    if (!currentUser) return;
    
    setLoading(prev => ({ ...prev, notifications: true }));
    setError(prev => ({ ...prev, notifications: '' }));
    
    try {
      const allNotifications = await getNotifications();
      
      // Prendi solo le prime 3 notifiche non lette
      const recentNotifications = allNotifications
        .filter(n => !n.read)
        .slice(0, 3);
      
      setNotifications(recentNotifications);
    } catch (err) {
      console.error('Error loading notifications:', err);
      setError(prev => ({ ...prev, notifications: err.message }));
    } finally {
      setLoading(prev => ({ ...prev, notifications: false }));
    }
  };

  // Carica i dati all'avvio
  useEffect(() => {
    loadUpcomingMatches();
  }, []);

  // Carica i dati dell'utente se autenticato
  useEffect(() => {
    if (currentUser) {
      loadSubscribedTeams();
      loadNotifications();
    }
  }, [currentUser]);

  return (
    <Container maxWidth="lg">
      <Box py={3}>
        <Typography variant="h4" component="h1" gutterBottom>
          AIBVC Club Series Finals 2025
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" paragraph>
          Benvenuto nel sistema di notifiche per le finali AIBVC Club Series. Ricevi aggiornamenti in tempo reale sulle partite delle tue squadre preferite.
        </Typography>

        <Grid container spacing={4} mt={2}>
          {/* Sezione principale */}
          <Grid item xs={12}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Box display="flex" alignItems="center" mb={2}>
                <CalendarIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Prossime Partite</Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              {loading.matches ? (
                <Box display="flex" justifyContent="center" p={3}>
                  <CircularProgress />
                </Box>
              ) : error.matches ? (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error.matches}
                </Alert>
              ) : upcomingMatches.length === 0 ? (
                <Typography align="center" color="text.secondary" p={2}>
                  Nessuna partita programmata al momento
                </Typography>
              ) : (
                <Grid container spacing={2}>
                  {upcomingMatches.map((match) => (
                    <Grid item xs={12} md={6} key={match._id}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="h6">
                            {match.teamA.name} vs {match.teamB.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {moment(match.date).format('DD/MM/YYYY')} - {match.time}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Campo: {match.court}
                          </Typography>
                          <Chip 
                            label={match.category} 
                            size="small" 
                            color="primary" 
                            sx={{ mt: 1 }} 
                          />
                        </CardContent>
                        <CardActions>
                          <Button size="small" component={RouterLink} to={`/matches/${match._id}`}>
                            Dettagli
                          </Button>
                        </CardActions>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Paper>
          </Grid>
          
          {!currentUser ? (
            <Grid item xs={12}>
              <Paper elevation={2} sx={{ p: 3, mt: 2 }}>
                <Typography variant="h6" gutterBottom align="center">
                  Registrati per ricevere notifiche WhatsApp sulle partite
                </Typography>
                <Typography variant="body1" paragraph align="center">
                  Vuoi ricevere aggiornamenti in tempo reale sulle partite delle tue squadre preferite?
                </Typography>
                <Box display="flex" justifyContent="center" mt={2}>
                  <Button
                    variant="contained"
                    component={RouterLink}
                    to="/register"
                    sx={{ mr: 2 }}
                  >
                    Registrati
                  </Button>
                  <Button
                    variant="outlined"
                    component={RouterLink}
                    to="/login"
                  >
                    Accedi
                  </Button>
                </Box>
              </Paper>
            </Grid>
          ) : (
            <>
              <Grid item xs={12} md={6}>
                <Paper elevation={2}>
                  <Box p={2} display="flex" alignItems="center">
                    <TeamIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">Le Tue Squadre</Typography>
                  </Box>
                  <Divider />
                  <Box p={2}>
                    {loading.teams ? (
                      <Box display="flex" justifyContent="center" p={2}>
                        <CircularProgress />
                      </Box>
                    ) : error.teams ? (
                      <Alert severity="error" sx={{ mb: 2 }}>
                        {error.teams}
                      </Alert>
                    ) : subscribedTeams.length === 0 ? (
                      <Typography align="center" color="text.secondary" p={2}>
                        Non hai sottoscritto alcuna squadra
                      </Typography>
                    ) : (
                      subscribedTeams.map((team) => (
                        <Card key={team._id} variant="outlined" sx={{ mb: 2 }}>
                          <CardContent>
                            <Typography variant="subtitle1">{team.name}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {team.category}
                            </Typography>
                          </CardContent>
                        </Card>
                      ))
                    )}
                    <Button 
                      variant="outlined" 
                      fullWidth 
                      component={RouterLink} 
                      to="/subscriptions"
                      sx={{ mt: 2 }}
                    >
                      Gestisci sottoscrizioni
                    </Button>
                  </Box>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper elevation={2}>
                  <Box p={2} display="flex" alignItems="center">
                    <NotificationIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">Ultime Notifiche</Typography>
                  </Box>
                  <Divider />
                  <Box p={2}>
                    {loading.notifications ? (
                      <Box display="flex" justifyContent="center" p={2}>
                        <CircularProgress />
                      </Box>
                    ) : error.notifications ? (
                      <Alert severity="error" sx={{ mb: 2 }}>
                        {error.notifications}
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
                            <Typography variant="body2">
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
              </Grid>
            </>
          )}
        </Grid>
      </Box>
    </Container>
  );
};

export default Dashboard;
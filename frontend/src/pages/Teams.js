// frontend/src/pages/Teams.js

import React, { useState, useEffect } from 'react';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Chip,
  Paper,
  IconButton,
  Tooltip,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff';
import { getTeams } from '../services/teamService';
import { getSubscribedTeams, subscribeToTeam, unsubscribeFromTeam } from '../services/userService';
import { getCategoryChipStyles } from '../utils/categoryUtils';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const Teams = () => {
  const { isAuthenticated } = useAuth();
  const [teams, setTeams] = useState([]);
  const [subscribedTeams, setSubscribedTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [error, setError] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const categories = [
    'Eccellenza F',
    'Eccellenza M',
    'Amatoriale F',
    'Amatoriale M',
    'Over 35 F',
    'Over 40 F',
    'Over 43 M',
    'Over 50 M',
    'Under 21 F',
    'Under 21 M',
    'Serie A Femminile',
    'Serie B Femminile',
    'Serie A Maschile',
    'Serie B Maschile',
  ];

  // Carica tutte le squadre
  const loadTeams = async () => {
    setLoading(true);
    setError('');

    try {
      const fetchedTeams = await getTeams();
      setTeams(fetchedTeams);
    } catch (err) {
      console.error('Error loading teams:', err);
      setError(err.message || 'Errore durante il caricamento delle squadre');
    } finally {
      setLoading(false);
    }
  };

  // Carica le squadre a cui l'utente è iscritto
  const loadSubscribedTeams = async () => {
    if (!isAuthenticated) {
      setSubscribedTeams([]);
      return;
    }
    
    try {
      const teams = await getSubscribedTeams();
      setSubscribedTeams(teams.map(team => team._id));
    } catch (err) {
      console.error('Error loading subscribed teams:', err);
      // Non impostare errore qui per non bloccare l'interfaccia
    }
  };

  // Gestisce la sottoscrizione/cancellazione per una squadra
  const handleToggleSubscription = async (teamId) => {
    if (!isAuthenticated) {
      toast.info('Accedi per gestire le sottoscrizioni');
      return;
    }

    setSubscriptionLoading(true);
    
    try {
      const isSubscribed = subscribedTeams.includes(teamId);
      
      if (isSubscribed) {
        await unsubscribeFromTeam(teamId);
        setSubscribedTeams(prev => prev.filter(id => id !== teamId));
        toast.success('Sottoscrizione rimossa con successo');
      } else {
        await subscribeToTeam(teamId);
        setSubscribedTeams(prev => [...prev, teamId]);
        toast.success('Sottoscrizione attivata con successo');
      }
    } catch (err) {
      console.error('Error toggling subscription:', err);
      toast.error(err.message || 'Errore durante la gestione della sottoscrizione');
    } finally {
      setSubscriptionLoading(false);
    }
  };

  useEffect(() => {
    loadTeams();
    loadSubscribedTeams();
  }, [isAuthenticated]);

  // Filtra le squadre in base alla categoria selezionata
  const filteredTeams = categoryFilter
    ? teams.filter(team => team.category === categoryFilter)
    : teams;

  return (
    <Container maxWidth="lg">
      <Box py={3}>
        <Typography variant="h4" gutterBottom>
          Squadre
        </Typography>

        <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
          <FormControl fullWidth>
            <InputLabel>Filtra per categoria</InputLabel>
            <Select
              value={categoryFilter}
              label="Filtra per categoria"
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <MenuItem value="">
                <em>Tutte le categorie</em>
              </MenuItem>
              {categories.map((category) => (
                <MenuItem key={category} value={category}>
                  {category}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Paper>

        {loading ? (
          <Box display="flex" justifyContent="center" p={5}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        ) : filteredTeams.length === 0 ? (
          <Paper elevation={1} sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              Nessuna squadra trovata
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Prova a modificare i filtri di ricerca
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {filteredTeams.map((team) => {
              const isSubscribed = subscribedTeams.includes(team._id);
              
              return (
                <Grid item xs={12} sm={6} md={4} key={team._id}>
                  <Card variant="outlined" sx={{ height: '100%', minWidth: 368, display: 'flex', flexDirection: 'column', mb: 0 }}>
                    <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                      <Chip 
                        label={team.category} 
                        size="small" 
                        color="primary" 
                        variant="outlined"
                        sx={{
                          ...getCategoryChipStyles(team.category),
                          mb: 1.5,
                        }} 
                      />
                      <Typography variant="subtitle1">{team.name}</Typography>
                    </CardContent>
                    <CardActions sx={{ pt: 0, pb: 1, px: 2, display: 'flex', justifyContent: 'space-between' }}>
                      <Button 
                        size="small" 
                        component={RouterLink} 
                        to={`/matches?team=${team._id}`}
                        sx={{ mt: 0 }}
                      >
                        Partite
                      </Button>
                      
                      {isAuthenticated ? (
                        <Tooltip title={isSubscribed ? "Rimuovi iscrizione" : "Iscriviti per notifiche"}>
                          <IconButton
                            color={isSubscribed ? "primary" : "default"}
                            onClick={() => handleToggleSubscription(team._id)}
                            disabled={subscriptionLoading}
                            size="small"
                          >
                            {isSubscribed ? <NotificationsIcon /> : <NotificationsOffIcon />}
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Tooltip title="Accedi per attivare le notifiche">
                          <span>
                            <IconButton
                              disabled
                              size="small"
                            >
                              <NotificationsOffIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                      )}
                    </CardActions>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Box>
    </Container>
  );
};

export default Teams;
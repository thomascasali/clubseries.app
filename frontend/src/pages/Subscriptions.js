import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import { getTeams, getTeamsByCategory } from '../services/teamService';
import { getSubscribedTeams, subscribeToTeam, unsubscribeFromTeam } from '../services/userService';
import { toast } from 'react-toastify';
import { getCategoryChipStyles } from '../utils/categoryUtils';


const Subscriptions = () => {
  const [subscribedTeams, setSubscribedTeams] = useState([]);
  const [availableTeams, setAvailableTeams] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState({
    subscribed: false,
    available: false,
    subscribe: false,
    unsubscribe: false,
  });
  const [error, setError] = useState({
    subscribed: '',
    available: '',
  });

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

  // Carica le squadre a cui l'utente è iscritto
  const loadSubscribedTeams = async () => {
    setLoading((prev) => ({ ...prev, subscribed: true }));
    setError((prev) => ({ ...prev, subscribed: '' }));
    
    try {
      // Chiamata API reale
      const teams = await getSubscribedTeams();
      setSubscribedTeams(teams);
    } catch (err) {
      console.error('Error loading subscribed teams:', err);
      setError((prev) => ({ ...prev, subscribed: err.message }));
    } finally {
      setLoading((prev) => ({ ...prev, subscribed: false }));
    }
  };

  // Carica le squadre disponibili nella categoria selezionata
  const loadAvailableTeams = async () => {
    if (!selectedCategory) {
      setAvailableTeams([]);
      return;
    }
    
    setLoading((prev) => ({ ...prev, available: true }));
    setError((prev) => ({ ...prev, available: '' }));
    
    try {
      // Chiamata API reale
      const teams = await getTeamsByCategory(selectedCategory);
      
      // Filtra per escludere le squadre già sottoscritte
      const subscribedTeamIds = subscribedTeams.map((team) => team._id);
      const filteredTeams = teams.filter((team) => !subscribedTeamIds.includes(team._id));
      
      setAvailableTeams(filteredTeams);
    } catch (err) {
      console.error('Error loading available teams:', err);
      setError((prev) => ({ ...prev, available: err.message }));
    } finally {
      setLoading((prev) => ({ ...prev, available: false }));
    }
  };

  // Effettua la sottoscrizione a una squadra
  const handleSubscribe = async (teamId) => {
    setLoading((prev) => ({ ...prev, subscribe: true }));
    
    try {
      // Chiamata API reale
      await subscribeToTeam(teamId);
      toast.success('Iscrizione effettuata con successo!');
      
      // Aggiorna le liste
      await loadSubscribedTeams();
      if (selectedCategory) {
        await loadAvailableTeams();
      }
    } catch (err) {
      console.error('Error subscribing to team:', err);
      toast.error(err.message || 'Errore durante l\'iscrizione');
    } finally {
      setLoading((prev) => ({ ...prev, subscribe: false }));
    }
  };

  // Rimuove la sottoscrizione a una squadra
  const handleUnsubscribe = async (teamId) => {
    setLoading((prev) => ({ ...prev, unsubscribe: true }));
    
    try {
      // Chiamata API reale
      await unsubscribeFromTeam(teamId);
      toast.success('Iscrizione rimossa con successo!');
      
      // Aggiorna le liste
      await loadSubscribedTeams();
      if (selectedCategory) {
        await loadAvailableTeams();
      }
    } catch (err) {
      console.error('Error unsubscribing from team:', err);
      toast.error(err.message || 'Errore durante la rimozione dell\'iscrizione');
    } finally {
      setLoading((prev) => ({ ...prev, unsubscribe: false }));
    }
  };

  // Carica le squadre sottoscritte all'avvio
  useEffect(() => {
    loadSubscribedTeams();
  }, []);

  // Carica le squadre disponibili quando cambia la categoria
  useEffect(() => {
    loadAvailableTeams();
  }, [selectedCategory, subscribedTeams]);

  return (
    <Container maxWidth="lg">
      <Box py={3}>
        <Typography variant="h4" gutterBottom>
          Gestione Sottoscrizioni
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" paragraph>
          Sottoscrivi le squadre per ricevere notifiche su partite, aggiornamenti e risultati.
        </Typography>

        <Grid container spacing={4}>
          {/* Squadre sottoscritte */}
          <Grid item xs={12} md={6}>
            <Paper elevation={2}>
              <Box p={2}>
                <Typography variant="h6">Le Tue Squadre</Typography>
              </Box>
              <Divider />
              <Box p={2}>
                {loading.subscribed ? (
                  <Box display="flex" justifyContent="center" p={3}>
                    <CircularProgress />
                  </Box>
                ) : error.subscribed ? (
                  <Alert severity="error">{error.subscribed}</Alert>
                ) : subscribedTeams.length === 0 ? (
                  <Typography align="center" color="text.secondary" p={2}>
                    Non sei iscritto a nessuna squadra
                  </Typography>
                ) : (
                  subscribedTeams.map((team) => (
                    <Card key={team._id} variant="outlined" sx={{ mb: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
                      <CardContent sx={{ flexGrow: 1, mb:0 }}>
                        <Chip 
                          label={team.category} 
                          size="small" 
                          color="primary" 
                          variant="outlined"
                          sx={{
                            ...getCategoryChipStyles(team.category),
                            mb: 0.5, // Margine sotto la chip
                          }} 
                        />
                        <Typography variant="subtitle1">{team.name}</Typography>
                      </CardContent>
                      <CardActions sx={{mt:-2.5, ml:0.5}}>
                        <Button 
                          size="small" 
                          color="error" 
                          onClick={() => handleUnsubscribe(team._id)}
                          disabled={loading.unsubscribe}
                        >
                          {loading.unsubscribe ? <CircularProgress size={24} /> : 'Rimuovi iscrizione'}
                        </Button>
                      </CardActions>
                    </Card>
                  ))
                )}
              </Box>
            </Paper>
          </Grid>

          {/* Squadre disponibili */}
          <Grid item xs={12} md={6}>
            <Paper elevation={2}>
              <Box p={2}>
                <Typography variant="h6">Aggiungi Squadre</Typography>
              </Box>
              <Divider />
              <Box p={2}>
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel>Seleziona Categoria</InputLabel>
                  <Select
                    value={selectedCategory}
                    label="Seleziona Categoria"
                    onChange={(e) => setSelectedCategory(e.target.value)}
                  >
                    <MenuItem value="">
                      <em>Seleziona una categoria</em>
                    </MenuItem>
                    {categories.map((category) => (
                      <MenuItem key={category} value={category}>
                        {category}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {selectedCategory ? (
                  loading.available ? (
                    <Box display="flex" justifyContent="center" p={3}>
                      <CircularProgress />
                    </Box>
                  ) : error.available ? (
                    <Alert severity="error">{error.available}</Alert>
                  ) : availableTeams.length === 0 ? (
                    <Typography align="center" color="text.secondary" p={2}>
                      Nessuna squadra disponibile in questa categoria o sei già iscritto a tutte
                    </Typography>
                  ) : (
                    availableTeams.map((team) => (
                      <Card key={team._id} variant="outlined" sx={{ mb: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <CardContent sx={{ flexGrow: 1 }}>
                          <Typography variant="h6">{team.name}</Typography>
                          <Chip 
                            label={team.category} 
                            size="small" 
                            color="primary" 
                            variant="outlined" 
                            sx={{ mt: 1 }} 
                          />
                        </CardContent>
                        <CardActions>
                          <Button 
                            size="small" 
                            variant="contained" 
                            onClick={() => handleSubscribe(team._id)}
                            disabled={loading.subscribe}
                          >
                            {loading.subscribe ? <CircularProgress size={24} /> : 'Iscriviti'}
                          </Button>
                        </CardActions>
                      </Card>
                    ))
                  )
                ) : (
                  <Typography align="center" color="text.secondary" p={2}>
                    Seleziona una categoria per vedere le squadre disponibili
                  </Typography>
                )}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default Subscriptions;
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
  TextField,
  CircularProgress,
  Alert,
  Chip,
  Paper,
  Tabs,
  Tab,
} from '@mui/material';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { getMatches } from '../services/matchService';
import { getTeams } from '../services/teamService';
import moment from 'moment';
import 'moment/locale/it';

// Imposta la lingua italiana per moment
moment.locale('it');

const Matches = () => {
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);

  // Filtri
  const [filters, setFilters] = useState({
    date: moment().toDate(),
    category: '',
    team: '',
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

  // Carica le partite in base ai filtri
  const loadMatches = async () => {
    setLoading(true);
    setError('');
    
    try {
      const filterParams = {};
      
      // Aggiungi i filtri solo se sono impostati
      if (tabValue === 0 && filters.date) {
        filterParams.date = moment(filters.date).format('YYYY-MM-DD');
      }
      
      if (filters.category) {
        filterParams.category = filters.category;
      }
      
      if (filters.team) {
        filterParams.team = filters.team;
      }
      
      // Utilizzare l'API reale invece dei dati di esempio
      const fetchedMatches = await getMatches(filterParams);
      
      // Se è selezionato "Oggi", filtra per la data corrente
      if (tabValue === 0) {
        const today = moment(filters.date).startOf('day');
        setMatches(fetchedMatches.filter(match => 
          moment(match.date).isSame(today, 'day')
        ));
      }
      // Se è selezionato "Future", filtra per le date future
      else if (tabValue === 1) {
        const today = moment().startOf('day');
        setMatches(fetchedMatches.filter(match => 
          moment(match.date).isAfter(today)
        ));
      }
      // Se è selezionato "Completate", filtra per le partite con risultato
      else if (tabValue === 2) {
        setMatches(fetchedMatches.filter(match => 
          match.result && match.result !== 'pending'
        ));
      }
      
    } catch (err) {
      console.error('Error loading matches:', err);
      setError(err.message || 'Errore durante il caricamento delle partite');
    } finally {
      setLoading(false);
    }
  };

  // Carica le squadre per il filtro
  const loadTeams = async () => {
    try {
      // Utilizzare l'API reale
      const fetchedTeams = await getTeams();
      setTeams(fetchedTeams);
    } catch (err) {
      console.error('Error loading teams:', err);
      // Non mostriamo errori per questo, il filtro per squadra semplicemente non funzionerà
    }
  };

  // Gestisce il cambio di filtri
  const handleFilterChange = (field, value) => {
    setFilters({
      ...filters,
      [field]: value,
    });
  };

  // Gestisce il cambio di tab
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Carica le partite all'avvio e quando cambiano i filtri
  useEffect(() => {
    loadMatches();
  }, [filters, tabValue]);

  // Carica le squadre all'avvio
  useEffect(() => {
    loadTeams();
  }, []);

  return (
    <LocalizationProvider dateAdapter={AdapterMoment}>
      <Container maxWidth="lg">
        <Box py={3}>
          <Typography variant="h4" gutterBottom>
            Partite
          </Typography>

          <Paper sx={{ mb: 3 }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              variant="fullWidth"
              indicatorColor="primary"
              textColor="primary"
            >
              <Tab label="Oggi" />
              <Tab label="Future" />
              <Tab label="Completate" />
            </Tabs>
          </Paper>

          <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              {tabValue === 0 && (
                <Grid item xs={12} sm={4}>
                  <DatePicker
                    label="Data"
                    value={moment(filters.date)}
                    onChange={(date) => handleFilterChange('date', date.toDate())}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>
              )}
              
              <Grid item xs={12} sm={tabValue === 0 ? 4 : 6}>
                <FormControl fullWidth>
                  <InputLabel>Categoria</InputLabel>
                  <Select
                    value={filters.category}
                    label="Categoria"
                    onChange={(e) => handleFilterChange('category', e.target.value)}
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
              </Grid>
              
              <Grid item xs={12} sm={tabValue === 0 ? 4 : 6}>
                <FormControl fullWidth>
                  <InputLabel>Squadra</InputLabel>
                  <Select
                    value={filters.team}
                    label="Squadra"
                    onChange={(e) => handleFilterChange('team', e.target.value)}
                  >
                    <MenuItem value="">
                      <em>Tutte le squadre</em>
                    </MenuItem>
                    {teams.map((team) => (
                      <MenuItem key={team._id} value={team._id}>
                        {team.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Paper>

          {loading ? (
            <Box display="flex" justifyContent="center" p={5}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          ) : matches.length === 0 ? (
            <Paper elevation={1} sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary">
                Nessuna partita trovata
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Prova a modificare i filtri di ricerca
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {matches.map((match) => (
                <Grid item xs={12} sm={6} md={4} key={match._id}>
                  <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          {moment(match.date).format('DD MMMM YYYY')} - {match.time}
                        </Typography>
                        <Chip 
                          label={match.phase} 
                          size="small" 
                          variant="outlined" 
                        />
                      </Box>
                      
                      <Typography variant="h6" gutterBottom>
                        {match.teamA.name} vs {match.teamB.name}
                      </Typography>
                      
                      <Typography variant="body2" color="text.secondary">
                        Campo: {match.court}
                      </Typography>
                      
                      <Box sx={{ mt: 1 }}>
                        <Chip 
                          label={match.category} 
                          size="small" 
                          color="primary" 
                          variant="outlined" 
                        />
                      </Box>
                      
                      {match.result && match.result !== 'pending' && (
                        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #eee' }}>
                          <Typography variant="subtitle2">Risultato:</Typography>
                          <Typography>
                            {match.result === 'teamA' 
                              ? `${match.teamA.name} ha vinto` 
                              : match.result === 'teamB' 
                                ? `${match.teamB.name} ha vinto` 
                                : 'Partita terminata in pareggio'
                            }
                          </Typography>
                          {match.scoreA && match.scoreB && (
                            <Typography variant="body2" color="text.secondary">
                              Set: {match.scoreA.map((score, i) => 
                                `${score}-${match.scoreB[i]}`
                              ).join(', ')}
                            </Typography>
                          )}
                        </Box>
                      )}
                    </CardContent>
                    <CardActions>
                      <Button 
                        size="small" 
                        component={RouterLink} 
                        to={`/matches/${match._id}`}
                      >
                        Dettagli
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      </Container>
    </LocalizationProvider>
  );
};

export default Matches;
// src/pages/Matches.js
import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  Container, Typography, Box, Grid, FormControl, InputLabel,
  Select, MenuItem, TextField, CircularProgress, Alert,
  Paper, Tabs, Tab, Button, FormControlLabel, Switch
} from '@mui/material';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { getMatches } from '../services/matchService'; 
import { getTeams } from '../services/teamService';   
import { getSubscribedTeams } from '../services/userService';
import {
  groupRelatedMatches,
  filterMatches
} from '../components/dashboard/MatchUtils'; 
import MatchGroupCard from '../components/dashboard/MatchGroupCard';
import { AuthContext } from '../context/AuthContext';
import moment from 'moment';
import 'moment/locale/it';

moment.locale('it');

// Lista categorie del torneo
const categories = [
  'Serie A Femminile',
  'Serie B Femminile',
  'Serie A Maschile',
  'Serie B Maschile',
  'Eccellenza F',
  'Eccellenza M',
  'Amatoriale F',
  'Amatoriale M',
  'Over 35 F',
  'Over 40 F',
  'Over 43 M',
  'Over 50 M',
  'Under 21 F',
  'Under 21 M'
];

const Matches = () => {
  // --- State ---
  const [allFetchedMatches, setAllFetchedMatches] = useState([]);
  const [filteredMatches, setFilteredMatches] = useState([]);
  const [groupedMatches, setGroupedMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [filters, setFilters] = useState({
    date: moment(),
    category: '',
    team: '',
  });

  // Usa il contesto di autenticazione
  const { currentUser } = useContext(AuthContext) || { currentUser: null };
  const [subscribedTeams, setSubscribedTeams] = useState([]);
  const [showOnlySubscribed, setShowOnlySubscribed] = useState(false);

  // --- Fetch Teams e Squadre Sottoscritte ---
  useEffect(() => {
    const loadTeamsAndSubscriptions = async () => {
      try {
        // Carica tutti i team
        const fetchedTeams = await getTeams();
        setTeams(fetchedTeams || []);
        
        // Carica squadre sottoscritte se utente autenticato
        if (currentUser) {
          const userTeams = await getSubscribedTeams();
          setSubscribedTeams(userTeams || []);
        }
      } catch (err) {
        console.error('Error loading teams:', err);
      }
    };
    
    loadTeamsAndSubscriptions();
  }, [currentUser]);

  // --- Fetch Partite ---
  const loadMatches = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Filtri backend minimali
      const backendFilters = {};
      if (filters.category) backendFilters.category = filters.category;
      if (filters.team) backendFilters.team = filters.team;

      const fetchedMatches = await getMatches(backendFilters);
      //console.log("MATCH CARICATI DAL BACKEND:", fetchedMatches.length, fetchedMatches);

      setAllFetchedMatches(fetchedMatches || []);
    } catch (err) {
      console.error('Error loading matches:', err);
      setError(err.message || 'Errore durante il caricamento delle partite');
      setAllFetchedMatches([]);
    } finally {
      setLoading(false);
    }
  }, [filters.category, filters.team]);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  // --- Logica Filtro UI e Raggruppamento ---
  useEffect(() => {
    let processedMatches = [...allFetchedMatches];

    // 1. Filtro data (solo tab "Oggi")
    if (tabValue === 0 && filters.date?.isValid()) {
      const selectedDay = filters.date.startOf('day');
      processedMatches = processedMatches.filter(match =>
        moment(match.date).isSame(selectedDay, 'day')
      );
    }
    //console.log("MATCH FILTRATI SOLO OGGI:", processedMatches.length, processedMatches);

    // 2. Filtri temporali e sottoscrizioni
    let timeAndSubFilteredMatches = filterMatches(
      processedMatches,
      subscribedTeams,
      showOnlySubscribed,
      currentUser
    );

    // 3. Filtri per tab
    if (tabValue === 1) { // Future
      const today = moment.utc().startOf('day');
      timeAndSubFilteredMatches = timeAndSubFilteredMatches.filter(match =>
        moment.utc(match.date).isAfter(today)
      );
      //console.log("MATCH FILTRATI SOLO NEL FUTURO:", timeAndSubFilteredMatches.length, timeAndSubFilteredMatches);
    } else if (tabValue === 2) { // Completate
      timeAndSubFilteredMatches = timeAndSubFilteredMatches.filter(match =>
        (match.officialResult && match.officialResult !== 'pending')
      );
      //console.log("MATCH COMPLETATI:", timeAndSubFilteredMatches.length, timeAndSubFilteredMatches);
    }

    // 4. Salva partite filtrate
    setFilteredMatches(timeAndSubFilteredMatches);

    // 5. Raggruppa partite
    const grouped = groupRelatedMatches(timeAndSubFilteredMatches);
    setGroupedMatches(grouped);
  }, [allFetchedMatches, filters, tabValue, currentUser, subscribedTeams, showOnlySubscribed]);

  // --- Handlers ---
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  const handleSubscribedToggle = () => {
    setShowOnlySubscribed(prev => !prev);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterMoment} adapterLocale="it">
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {/* Header con titolo e switch "Solo mie squadre" */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h4" gutterBottom>
            Partite
          </Typography>
          
          {currentUser && subscribedTeams.length > 0 && (
            <FormControlLabel
              control={
                <Switch
                  checked={showOnlySubscribed}
                  onChange={handleSubscribedToggle}
                  color="primary"
                />
              }
              label="Solo mie squadre"
            />
          )}
        </Box>

        {/* Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs value={tabValue} onChange={handleTabChange} variant="fullWidth">
            <Tab label="Oggi" />
            <Tab label="Future" />
            <Tab label="Completate" />
          </Tabs>
        </Paper>

        {/* Filtri UI */}
        <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            {/* Mostra DatePicker solo nel tab "Oggi" */}
            {tabValue === 0 && (
              <Grid xs={12}>
                <DatePicker
                  label="Data"
                  value={filters.date}
                  onChange={(newValue) => handleFilterChange('date', newValue)}
                  slotProps={{ textField: { fullWidth: true } }}
                  format="DD/MM/YYYY"
                />
              </Grid>
            )}
            {/* Filtri Categoria e Team sempre visibili */}
            <Grid xs={12} sm={tabValue === 0 ? 4 : 6} sx={{minWidth:200}}>
              <FormControl fullWidth>
                <InputLabel>Categoria</InputLabel>
                <Select
                  name="category"
                  value={filters.category}
                  label="Categoria"
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                >
                  <MenuItem value=""><em>Tutte</em></MenuItem>
                  {categories.map((cat) => (
                    <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid xs={12} sm={tabValue === 0 ? 4 : 6} sx={{minWidth:200}}>
              <FormControl fullWidth>
                <InputLabel>Squadra</InputLabel>
                <Select
                  name="team"
                  value={filters.team}
                  label="Squadra"
                  onChange={(e) => handleFilterChange('team', e.target.value)}
                >
                  <MenuItem value=""><em>Tutte</em></MenuItem>
                  {teams.map((team) => (
                    <MenuItem key={team._id} value={team._id}>{team.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        {/* Visualizzazione Partite */}
        {loading ? (
          <Box sx={{ width: '100%'}} display="flex" justifyContent="center" p={5}><CircularProgress /></Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
        ) : groupedMatches.length === 0 ? (
          <Paper elevation={1} sx={{ p: 4, textAlign: 'center', backgroundColor: '#f9f9f9' }}>
            <Typography variant="h6" color="text.secondary">Nessuna partita trovata</Typography>
            <Typography variant="body2" color="text.secondary">
              {showOnlySubscribed ? 
                "Prova a disattivare il filtro 'Solo mie squadre' o seleziona un altro tab." :
                "Prova a modificare i filtri o seleziona un altro tab."}
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={3}>
  {groupedMatches.map((group) => (
    <Grid
      item // Mantieni 'item'
      // Definiamo ancora i breakpoint per semantica e fallback (SSR, etc.)
      xs={12}
      sm={6}
      lg={4}
      key={group.id}
      sx={{
        // Sovrascriviamo LARGHEZZA e FLEX-BASIS/MAX-WIDTH manualmente per ogni breakpoint
        // Questo RICALCOLA manualmente ciò che xs/sm/lg dovrebbero fare,
        // ma usando 32% per lg invece di 33.33%
        boxSizing: 'border-box', // Assicuriamoci sia border-box

        // -- Inizio Override Manuale --
        flexBasis: 'auto', // Partiamo da auto
        flexGrow: 0,       // Non deve crescere
        maxWidth: 'none',  // Disabilitiamo max-width di default del Grid
        width: '100%',     // Default per xs

        // Breakpoint sm (>= 300px) -> 1 colonne (100%)
        '@media (min-width: 300px)': {
          width: '100%',
          maxWidth: '100%' // Opzionale, width dovrebbe bastare
        },
       
        // Breakpoint sm (>= 600px) -> 2 colonne (50%)
        '@media (min-width: 600px)': {
           width: '48%',
           // maxWidth: '50%' // Opzionale, width dovrebbe bastare
        },
        // Breakpoint md (>= 900px) -> Se sm={6}, md eredita 50%

        // Breakpoint lg (>= 1200px) -> 3 colonne (USIAMO 32% invece di 33.33%)
        '@media (min-width: 1200px)': {
           width: '31%', // <-- Il tuo valore che funziona visivamente
           // maxWidth: '32%' // Opzionale
        },
        // -- Fine Override Manuale --

        // Aggiungi di nuovo il bordo se vuoi ancora visualizzarlo
        // border: '1px solid green'
      }}
    >
      {/* La Card interna dovrebbe ancora avere width: '100%' */}
      <MatchGroupCard group={group} sx={{ width: '100%', height: '100%' }}/>
    </Grid>
  ))}
</Grid>
        )}
        
        {/* Bottone per ricaricare */}
        <Box mt={3} display="flex" justifyContent="center">
          <Button 
            variant="outlined" 
            onClick={loadMatches} 
            startIcon={loading ? <CircularProgress size={20} /> : null}
            disabled={loading}
          >
            Ricarica partite
          </Button>
        </Box>
      </Container>
    </LocalizationProvider>
  );
};

export default Matches;
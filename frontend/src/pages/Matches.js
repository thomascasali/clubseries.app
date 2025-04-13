// src/pages/Matches.js
import React, { useState, useEffect, useCallback } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Container, Typography, Box, Grid, FormControl, InputLabel,
  Select, MenuItem, TextField, CircularProgress, Alert,
  Paper, Tabs, Tab, Button // Rimosso Card, CardContent, CardActions, Chip qui
} from '@mui/material';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { getMatches } from '../services/matchService'; // Assumi esista
import { getTeams } from '../services/teamService';   // Assumi esista
// *** IMPORTA LE UTILS CORRETTE DAL FILE FINALE ***
import {
  groupRelatedMatches,
  filterMatches, // Usiamo questa per tempo/sottoscrizioni
  // Non importiamo più calculateSetResult, formatDetailedScore, determineGroupWinner qui
} from '../components/dashboard/MatchGroupUtils'; // Assicurati che il path sia corretto!
import MatchGroupCard from '../components/dashboard/MatchGroupCard'; // Importa la card aggiornata
import moment from 'moment';
import 'moment/locale/it';

moment.locale('it');

const Matches = () => {
  // --- State ---
  const [allFetchedMatches, setAllFetchedMatches] = useState([]); // Tutte le partite dal backend
  const [filteredMatches, setFilteredMatches] = useState([]);   // Partite filtrate (UI + tempo/subs)
  const [groupedMatches, setGroupedMatches] = useState([]);   // Partite filtrate e RAGGRUPPATE per display
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0); // 0: Oggi, 1: Future, 2: Completate
  const [filters, setFilters] = useState({
    // Usa null per DatePicker se vuoi che sia vuoto all'inizio
    date: moment(), // Data predefinita per "Oggi"
    category: '',
    team: '',
  });

  // TODO: Gestire stato utente e squadre sottoscritte se necessario per filterMatches
  const [currentUser, setCurrentUser] = useState(null); // Esempio
  const [subscribedTeams, setSubscribedTeams] = useState([]); // Esempio
  const [showOnlySubscribed, setShowOnlySubscribed] = useState(false); // Esempio


  // --- Categorie e Fetch Teams ---
  const categories = [ /* ... lista categorie ... */ ]; // Mantieni o carica dinamicamente
  useEffect(() => {
    const loadTeams = async () => {
      try {
        const fetchedTeams = await getTeams();
        setTeams(fetchedTeams || []);
      } catch (err) {
        console.error('Error loading teams:', err);
        // Potresti voler mostrare un errore specifico per i team
      }
    };
    loadTeams();
    // TODO: Carica currentUser e subscribedTeams se necessario
  }, []);


  // --- Fetch Partite Iniziale (o quando cambiano filtri/tab) ---
  const loadMatches = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch TUTTE le partite o usa filtri backend minimali se necessario per performance.
      // Evita filtri backend troppo specifici (come la data esatta) se interferiscono
      // con la logica di filterMatches (che considera le 2 ore precedenti, etc.).
      const backendFilters = {}; // Es: potresti filtrare per categoria/team qui se performante
      if (filters.category) backendFilters.category = filters.category;
      if (filters.team) backendFilters.team = filters.team;
      // Potresti aggiungere un range di date qui se utile (es. ieri, oggi, domani)

      const fetchedMatches = await getMatches(backendFilters);
      setAllFetchedMatches(fetchedMatches || []); // Salva tutte le partite fetchate

    } catch (err) {
      console.error('Error loading matches:', err);
      setError(err.message || 'Errore durante il caricamento delle partite');
      setAllFetchedMatches([]); // Resetta in caso di errore
    } finally {
      setLoading(false);
    }
  }, [filters.category, filters.team]); // Dipende dai filtri usati nel backend

  useEffect(() => {
    loadMatches();
  }, [loadMatches]); // Esegui loadMatches quando i filtri nel backend cambiano


  // --- Logica Filtro UI e Raggruppamento ---
  useEffect(() => {
      console.log("[Matches.js] Applicazione filtri UI e raggruppamento...");
      let processedMatches = [...allFetchedMatches]; // Copia per non mutare lo state originale

      // 1. Applica Filtri UI (Data specifica per tab "Oggi", Categoria, Team)
       // Filtro Data (solo per tab "Oggi")
      if (tabValue === 0 && filters.date?.isValid()) {
           const selectedDay = filters.date.startOf('day');
           processedMatches = processedMatches.filter(match =>
               moment(match.date).isSame(selectedDay, 'day') || match.isGoldenSet // Tieni i golden set per ora
           );
           console.log(`[Matches.js] Dopo filtro data (${selectedDay.format('YYYY-MM-DD')}): ${processedMatches.length} partite`);
      }
      // Nota: i filtri per categoria/team potrebbero essere già applicati dal backend in loadMatches.
      // Se non lo sono, applicali qui:
      // if (filters.category) {
      //    processedMatches = processedMatches.filter(match => match.category === filters.category || match.isGoldenSet);
      // }
      // if (filters.team) {
      //     processedMatches = processedMatches.filter(match =>
      //        (match.teamA?._id === filters.team || match.teamB?._id === filters.team) || match.isGoldenSet
      //     );
      // }


      // 2. Applica Filtri Temporali (ultime 2 ore, futuro) e Sottoscrizioni
      // Usando la funzione da MatchGroupUtils
      // NOTA: Passiamo 'null' per currentUser/subscribedTeams/showOnlySubscribed
      // se la logica di sottoscrizione non è ancora implementata qui.
      // Altrimenti, passa gli state appropriati.
      let timeAndSubFilteredMatches = filterMatches(
            processedMatches,
            subscribedTeams,  // Passa lo stato delle squadre sottoscritte
            showOnlySubscribed, // Passa lo stato dello switch "Solo mie"
            currentUser       // Passa lo stato dell'utente loggato
      );
       console.log(`[Matches.js] Dopo filterMatches (tempo/subs): ${timeAndSubFilteredMatches.length} partite`);


       // 3. Applica filtro per Tab (Future / Completate) DOPO il filtro temporale base
       if (tabValue === 1) { // Future
           const today = moment().startOf('day');
           timeAndSubFilteredMatches = timeAndSubFilteredMatches.filter(match =>
                moment(match.date).isSameOrAfter(today) || match.isGoldenSet // Tieni i golden set per ora
           );
            console.log(`[Matches.js] Dopo filtro Tab Future: ${timeAndSubFilteredMatches.length} partite`);

       } else if (tabValue === 2) { // Completate
            timeAndSubFilteredMatches = timeAndSubFilteredMatches.filter(match =>
               (match.officialResult && match.officialResult !== 'pending') || // Match normali completati
               (match.isGoldenSet && match.officialScoreA?.length > 0 && !(match.officialScoreA[0] === '0' && match.officialScoreB?.[0] === '0') ) // Golden set completati (non 0-0)
            );
             console.log(`[Matches.js] Dopo filtro Tab Completate: ${timeAndSubFilteredMatches.length} partite`);
       }

      // 4. Salva le partite filtrate (prima del raggruppamento)
      setFilteredMatches(timeAndSubFilteredMatches);


      // 5. Raggruppa le partite filtrate finali
      // Usando la funzione da MatchGroupUtils
      const grouped = groupRelatedMatches(timeAndSubFilteredMatches);
      setGroupedMatches(grouped);
      console.log(`[Matches.js] Raggruppamento finale: ${grouped.length} gruppi`);

  }, [allFetchedMatches, filters, tabValue, currentUser, subscribedTeams, showOnlySubscribed]); // Ricalcola quando i dati o i filtri cambiano


  // --- Handlers ---
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleTabChange = (event, newValue) => {
    // Resetta data quando si cambia tab? Forse no se vuoi mantenere il giorno selezionato
    // if (newValue !== 0) {
    //    setFilters(prev => ({ ...prev, date: null }));
    // } else if (!filters.date) {
    //    setFilters(prev => ({ ...prev, date: moment() })); // Imposta oggi se si torna al tab Oggi
    // }
    setTabValue(newValue);
  };

  // --- Rimosse Definizioni Locali ---
  // const groupRelatedMatches = (matchesList) => { ... };
  // const calculateSetResult = (match) => { ... };
  // const formatDetailedScore = (match) => { ... };
  // const determineGroupWinner = (group) => { ... };

  return (
    <LocalizationProvider dateAdapter={AdapterMoment} adapterLocale="it">
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Partite Torneo
        </Typography>

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
              <Grid item xs={12} sm={4}>
                <DatePicker
                  label="Data"
                  value={filters.date}
                  onChange={(newValue) => handleFilterChange('date', newValue)}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                  inputFormat="DD/MM/YYYY" // Formato desiderato
                />
              </Grid>
            )}
            {/* Filtri Categoria e Team sempre visibili */}
            <Grid item xs={12} sm={tabValue === 0 ? 4 : 6}>
              <FormControl fullWidth>
                <InputLabel>Categoria</InputLabel>
                <Select
                  name="category" // Aggiunto name per coerenza
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
            <Grid item xs={12} sm={tabValue === 0 ? 4 : 6}>
              <FormControl fullWidth>
                <InputLabel>Squadra</InputLabel>
                <Select
                  name="team" // Aggiunto name
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
          <Box display="flex" justifyContent="center" p={5}><CircularProgress /></Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
        ) : groupedMatches.length === 0 ? (
           <Paper elevation={1} sx={{ p: 4, textAlign: 'center', backgroundColor: '#f9f9f9' }}>
             <Typography variant="h6" color="text.secondary">Nessuna partita trovata</Typography>
             <Typography variant="body2" color="text.secondary">Prova a modificare i filtri o seleziona un altro tab.</Typography>
          </Paper>
        ) : (
          // Usa Grid per mostrare le MatchGroupCard
          <Grid container spacing={3}>
            {groupedMatches.map((group) => (
              <Grid item xs={12} sm={6} lg={4} key={group.id}> {/* Adatta lg per 3 colonne */}
                {/* *** USA IL COMPONENTE MatchGroupCard *** */}
                <MatchGroupCard group={group} />
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
    </LocalizationProvider>
  );
};

export default Matches;
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
  Divider,
} from '@mui/material';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { getMatches } from '../services/matchService';
import { getTeams } from '../services/teamService';
import { getCategoryChipStyles } from '../utils/categoryUtils';
import moment from 'moment';
import 'moment/locale/it';

moment.locale('it');

const Matches = () => {
  const [matches, setMatches] = useState([]);
  const [groupedMatches, setGroupedMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);

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

  // Funzione per raggruppare le partite correlate
  const groupRelatedMatches = (matchesList) => {
    // Mappa per raggruppare le partite per combinazione di squadre e fase
    const groupMap = {};
    
    // Prima passiamo tutti i match normali per costruire i gruppi
    matchesList.forEach(match => {
      // Skip per i Golden Set, li gestiamo dopo
      if (match.isGoldenSet || match.teamACode === 'G' || match.teamBCode === 'G') {
        return;
      }
      
      // Crea una chiave unica per ogni confronto, indipendente da Team A/B
      const teamAName = match.teamA?.name || '';
      const teamBName = match.teamB?.name || '';
      
      // Estrai la parte base della fase (senza dettagli specifici)
      // Supporta sia il formato standard che quello di Play-In
      let basePhase = match.phase || '';
      
      // Se la fase contiene codici come "03A-A vs 04B-A" (tipico dei Play-In)
      // o altre notazioni specifiche, estraiamo la parte base
      if (basePhase.includes('-A vs') || basePhase.includes('-B vs') || 
          basePhase.includes(' - ')) {
        basePhase = match.sheetName || basePhase.split(' - ')[0];
      }
      
      // Chiave univoca per questo gruppo di partite
      const teamKey = teamAName < teamBName 
        ? `${teamAName}-${teamBName}` 
        : `${teamBName}-${teamAName}`;
      
      const groupKey = `${teamKey}-${basePhase}-${match.category}`;
      
      if (!groupMap[groupKey]) {
        groupMap[groupKey] = {
          id: groupKey,
          category: match.category,
          phase: basePhase,
          date: match.date,
          time: match.time,
          court: match.court,
          teamA: { name: teamAName, id: match.teamA?._id },
          teamB: { name: teamBName, id: match.teamB?._id },
          matches: [],
          sheetName: match.sheetName // Aggiungiamo il nome del foglio per tracciare l'origine
        };
      }
      
      // Assicuriamoci che la data più recente venga utilizzata per il gruppo
      if (new Date(match.date) > new Date(groupMap[groupKey].date)) {
        groupMap[groupKey].date = match.date;
        groupMap[groupKey].time = match.time;
        groupMap[groupKey].court = match.court;
      }
      
      groupMap[groupKey].matches.push(match);
    });
    
    // Ora aggiungiamo i Golden Set ai gruppi corrispondenti
    matchesList.forEach(match => {
      if (!match.isGoldenSet && match.teamACode !== 'G' && match.teamBCode !== 'G') {
        return;
      }
      
      // Per i Golden Set, cerchiamo di trovare il gruppo corrispondente
      const teamAName = match.teamA?.name || '';
      const teamBName = match.teamB?.name || '';
      
      // Verifichiamo che non sia un Golden Set generico
      const isGenericGoldenSet = 
        teamAName === 'Golden Set Team A' || 
        teamAName === 'Golden Set Team B' || 
        teamBName === 'Golden Set Team A' || 
        teamBName === 'Golden Set Team B';
      
      // Se è un Golden Set generico, lo saltiamo
      if (isGenericGoldenSet) {
        return;
      }
      
      // Estrai la parte base della fase (senza dettagli specifici)
      let basePhase = match.phase || '';
      if (basePhase.includes('-A vs') || basePhase.includes('-B vs') ||
          basePhase.includes(' - ')) {
        basePhase = match.sheetName || basePhase.split(' - ')[0];
      }
      
      // Controlla in entrambe le direzioni A-B e B-A
      const teamKey1 = teamAName < teamBName 
        ? `${teamAName}-${teamBName}` 
        : `${teamBName}-${teamAName}`;
      
      const groupKey1 = `${teamKey1}-${basePhase}-${match.category}`;
      
      // Cerca il gruppo corretto
      if (groupMap[groupKey1]) {
        groupMap[groupKey1].goldenSet = match;
      } else {
        // Se non troviamo una corrispondenza esatta, cerchiamo una basata sulle squadre
        const possibleGroups = Object.values(groupMap).filter(group => 
          (group.teamA.name === teamAName && group.teamB.name === teamBName) ||
          (group.teamA.name === teamBName && group.teamB.name === teamAName));
        
        if (possibleGroups.length > 0) {
          // Associa con il gruppo più recente (basato sulla data)
          const mostRecentGroup = possibleGroups.reduce((prev, current) => 
            new Date(current.date) > new Date(prev.date) ? current : prev, possibleGroups[0]);
          
          mostRecentGroup.goldenSet = match;
        }
      }
    });
    
    // Convertiamo la mappa in un array
    return Object.values(groupMap);
  };

  const loadMatches = async () => {
    setLoading(true);
    setError('');
  
    try {
      const filterParams = {};
  
      if (tabValue === 0 && filters.date) {
        filterParams.date = moment(filters.date).format('YYYY-MM-DD');
      }
  
      if (filters.category) {
        filterParams.category = filters.category;
      }
  
      if (filters.team) {
        filterParams.team = filters.team;
      }
  
      const fetchedMatches = await getMatches(filterParams);
      let filteredMatches = [];
  
      // Identifichiamo i Golden Set per preservarli 
      const goldenSets = fetchedMatches.filter(match => 
        match.isGoldenSet || match.teamACode === 'G' || match.teamBCode === 'G'
      );
      
      console.log(`Trovati ${goldenSets.length} Golden Set da preservare dal filtro temporale`);
      
      // In base al tab selezionato, applichiamo il filtro appropriato
      if (tabValue === 0) {
        // Tab "Oggi"
        const today = moment(filters.date).startOf('day');
        
        filteredMatches = fetchedMatches.filter(match => {
          // I Golden Set sono sempre inclusi
          if (match.isGoldenSet || match.teamACode === 'G' || match.teamBCode === 'G') {
            return true;
          }
          
          // Partite Play-In con data futura sono sempre incluse
          if ((match.sheetName === 'Play-In' || 
               (match.phase && match.phase.toLowerCase().includes('play-in'))) && 
              match.date) {
            const matchDate = moment(match.date).startOf('day');
            return matchDate.isSame(today, 'day') || matchDate.isAfter(today);
          }
          
          // Partite normali solo del giorno selezionato
          return moment(match.date).isSame(today, 'day');
        });
        
      } else if (tabValue === 1) {
        // Tab "Future"
        const today = moment().startOf('day');
        
        filteredMatches = fetchedMatches.filter(match => {
          // I Golden Set sono inclusi se la partita correlata è futura
          if (match.isGoldenSet || match.teamACode === 'G' || match.teamBCode === 'G') {
            // Per evitare Golden Set isolati, controlliamo se c'è almeno una partita futura con le stesse squadre
            const teamAName = match.teamA?.name?.replace(/\s+Team [ABG]$/, '') || '';
            const teamBName = match.teamB?.name?.replace(/\s+Team [ABG]$/, '') || '';
            
            const relatedMatch = fetchedMatches.find(m => 
              !m.isGoldenSet && m.teamACode !== 'G' && m.teamBCode !== 'G' &&
              ((m.teamA?.name === teamAName && m.teamB?.name === teamBName) ||
               (m.teamA?.name === teamBName && m.teamB?.name === teamAName)) &&
              moment(m.date).isAfter(today)
            );
            
            return !!relatedMatch; // Includi solo se c'è una partita correlata futura
          }
          
          // Partite Play-In sono incluse se hanno data futura
          if ((match.sheetName === 'Play-In' || 
               (match.phase && match.phase.toLowerCase().includes('play-in'))) &&
              match.date) {
            return moment(match.date).isAfter(today);
          }
          
          // Partite normali future
          return moment(match.date).isAfter(today);
        });
        
      } else if (tabValue === 2) {
        // Tab "Completate" - includi tutte le partite con risultato, inclusi Golden Set
        filteredMatches = fetchedMatches.filter(match => {
          // Partite con risultato
          const hasResult = match.officialResult && match.officialResult !== 'pending';
          
          // Golden Set completati
          const isCompletedGoldenSet = 
            (match.isGoldenSet || match.teamACode === 'G' || match.teamBCode === 'G') &&
            match.officialScoreA && match.officialScoreB && match.officialScoreA.length > 0;
          
          return hasResult || isCompletedGoldenSet;
        });
      }
      
      console.log(`Filtrate ${filteredMatches.length} partite su ${fetchedMatches.length} totali`);
      
      // Log per debugging - vediamo quante partite Play-In rimangono
      const remainingPlayInMatches = filteredMatches.filter(match => 
        match.sheetName === 'Play-In' || 
        (match.phase && match.phase.toLowerCase().includes('play-in'))
      );
      console.log(`Dopo filtro: ${remainingPlayInMatches.length} partite Play-In`);
      
      setMatches(filteredMatches);
      
      // Raggruppa le partite correlate
      const grouped = groupRelatedMatches(filteredMatches);
      setGroupedMatches(grouped);
  
    } catch (err) {
      console.error('Error loading matches:', err);
      setError(err.message || 'Errore durante il caricamento delle partite');
    } finally {
      setLoading(false);
    }
  };

  const loadTeams = async () => {
    try {
      const fetchedTeams = await getTeams();
      setTeams(fetchedTeams);
    } catch (err) {
      console.error('Error loading teams:', err);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters({
      ...filters,
      [field]: value,
    });
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Calcola il risultato in set per un match
  const calculateSetResult = (match) => {
    if (!match || !match.officialScoreA || !match.officialScoreB || match.officialScoreA.length === 0) {
      return '';
    }
    
    let setsA = 0;
    let setsB = 0;
    for (let i = 0; i < match.officialScoreA.length; i++) {
      if (parseInt(match.officialScoreA[i]) > parseInt(match.officialScoreB[i])) {
        setsA++;
      } else if (parseInt(match.officialScoreB[i]) > parseInt(match.officialScoreA[i])) {
        setsB++;
      }
    }
    
    return `${setsA} - ${setsB}`;
  };
  
  // Formatta il punteggio dettagliato
  const formatDetailedScore = (match) => {
    if (!match || !match.officialScoreA || !match.officialScoreB || match.officialScoreA.length === 0) {
      return '';
    }
    
    return match.officialScoreA.map((score, i) => 
      `${score}-${match.officialScoreB[i]}`
    ).join(', ');
  };
  
 // Determina il vincitore del match group
  const determineGroupWinner = (group) => {
  // Caso 1: Se c'è un Golden Set con un risultato, questo è decisivo
  if (group.goldenSet && 
      group.goldenSet.officialScoreA && 
      group.goldenSet.officialScoreB && 
      group.goldenSet.officialScoreA.length > 0) {
    
    const scoreA = parseInt(group.goldenSet.officialScoreA[0]);
    const scoreB = parseInt(group.goldenSet.officialScoreB[0]);
    
    if (scoreA > scoreB) {
      return group.teamA;
    } else if (scoreB > scoreA) {
      return group.teamB;
    }
    return null; // Pareggio o risultato non chiaro
  }
  
  // Caso 2: Se non c'è Golden Set, contiamo le vittorie normali
  if (!group.matches || group.matches.length === 0) {
    return null;
  }
  
  // Conta le vittorie per squadra
  let teamAWins = 0;
  let teamBWins = 0;
  
  group.matches.forEach(match => {
    if (match.officialResult === 'teamA') {
      teamAWins++;
    } else if (match.officialResult === 'teamB') {
      teamBWins++;
    }
  });
  
  // Se una squadra ha vinto più partite dell'altra
  if (teamAWins > teamBWins) {
    return group.teamA;
  } else if (teamBWins > teamAWins) {
    return group.teamB;
  }

  return null; // Pareggio o risultato non chiaro
  };

  useEffect(() => {
    loadMatches();
  }, [filters, tabValue]);

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
                    slotProps={{ 
                      textField: { 
                        fullWidth: true,
                        sx: {
                          '.MuiInputBase-root': {
                            height: '45px',
                          },
                          '.MuiInputBase-input': {
                            fontSize: '1.1rem',
                            padding: '14px 14px'
                          }
                        } 
                      } 
                    }}
                  />
                </Grid>
              )}

              <Grid item xs={12} sm={tabValue === 0 ? 4 : 6}>
                <FormControl sx={{ minWidth: '250px', width: '100%' }}>
                  <InputLabel>Categoria</InputLabel>
                  <Select
                    value={filters.category}
                    label="Categoria"
                    onChange={(e) => handleFilterChange('category', e.target.value)}
                    sx={{
                      height: '45px',
                      '.MuiSelect-select': {
                        fontSize: '1.1rem',
                        padding: '14px 14px'
                      }
                    }}
                  >
                    <MenuItem value="">
                      <em>Tutte le categorie</em>
                    </MenuItem>
                    {categories.map((category) => (
                      <MenuItem key={category} value={category} sx={{ fontSize: '1rem' }}>
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
                    sx={{
                      height: '45px',
                      minWidth: '250px',
                      '.MuiSelect-select': {
                        fontSize: '1.1rem',
                        padding: '14px 14px'
                      }
                    }}
                  >
                    <MenuItem value="">
                      <em>Tutte le squadre</em>
                    </MenuItem>
                    {teams.map((team) => (
                      <MenuItem key={team._id} value={team._id} sx={{ fontSize: '1rem' }}>
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
          ) : groupedMatches.length === 0 ? (
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
              {groupedMatches.map((group) => {
                const winner = determineGroupWinner(group);
                const areMatchesComplete = group.matches.every(m => 
                  m.officialResult && m.officialResult !== 'pending'
                );
                const hasGoldenSetResult = group.goldenSet && 
                  group.goldenSet.officialResult && 
                  group.goldenSet.officialResult !== 'pending';
                
                return (
                  <Grid item xs={12} sm={6} md={4} key={group.id}>
                    <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                          <Chip 
                            label={group.category}
                            size="small" 
                            color="primary" 
                            variant="outlined" 
                            sx={{ 
                              ...getCategoryChipStyles(group.category),
                              mr: 1 
                            }}
                          />
                          <Chip 
                            label={group.phase} 
                            size="small" 
                            variant="outlined" 
                          />
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0, mt: 1, width: '100%' }}>
                            {moment(group.date).format('DD MMMM YYYY')} - {group.time} - Campo: {group.court}
                          </Typography>
                        </Box>

                        {/* Nomi delle squadre principali - dimensione ridotta su mobile */}
                        <Typography 
                          variant="h6" 
                          component="div" 
                          sx={{ 
                            fontWeight: 'bold', 
                            mb: 2, 
                            fontSize: { xs: '0.95rem', sm: '1.25rem' } // Ridotto su mobile, normale su desktop
                          }}
                        >
                          {group.teamA.name}<br/>
                          {group.teamB.name}
                        </Typography>
                        
                        {/* Elenco dei match */}
                        <Box sx={{ mb: 2, minWidth: { sm: '300px', md: '530px' } }}>
                          {group.matches.map((match, index) => {
                            const isRealScore = match.officialScoreA && match.officialScoreB && 
                                                match.officialScoreA.length > 0 && 
                                                !(match.officialScoreA.length === 1 && 
                                                  match.officialScoreA[0] === '0' && 
                                                  match.officialScoreB[0] === '0');
                            const setResult = isRealScore ? calculateSetResult(match) : '';
                            const detailedScore = isRealScore ? formatDetailedScore(match) : '';
                            const isWinner = match.officialResult && match.officialResult !== 'pending';
                            return (
                              <Box key={match._id} sx={{ mb: 1 }}>
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    fontWeight: isWinner ? 'bold' : 'normal',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    fontSize: { xs: '0.8rem', sm: '0.875rem' } // Ridotto su mobile
                                  }}
                                >
                                  <span>Team {match.teamACode} vs Team {match.teamBCode}</span>
                                  {setResult && (
                                    <span style={{ 
                                      fontWeight: 'bold', 
                                      fontSize: { xs: '1em', sm: '1.2em' } // Ridotto su mobile
                                    }}>
                                      {setResult}
                                      {detailedScore && (
                                        <span style={{ 
                                          fontWeight: 'normal', 
                                          fontSize: '0.8em', 
                                          color: 'text.secondary', 
                                          marginLeft: '5px' 
                                        }}>
                                          ({detailedScore})
                                        </span>
                                      )}
                                    </span>
                                  )}
                                </Typography>
                              </Box>
                            );
                          })}
                          
                          {/* Golden Set */}
                          {group.goldenSet && (
                            <Box sx={{ mt: 1, pt: 1, borderTop: '1px dashed #eee' }}>
                              {(() => {
                                const isRealGoldenSet = group.goldenSet.officialScoreA && 
                                                      group.goldenSet.officialScoreB && 
                                                      group.goldenSet.officialScoreA.length > 0 &&
                                                      !(group.goldenSet.officialScoreA.length === 1 && 
                                                        group.goldenSet.officialScoreA[0] === '0' && 
                                                        group.goldenSet.officialScoreB[0] === '0');
                                return (
                                  <Typography variant="body2" sx={{ 
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    fontSize: { xs: '0.8rem', sm: '0.875rem' } // Consistente con gli altri punteggi
                                  }}>
                                    <span style={{ fontWeight: isRealGoldenSet ? 'bold' : 'normal' }}>Golden Set</span>
                                    {isRealGoldenSet ? (
                                      <span style={{ fontWeight: 'bold', fontSize: '1.1em' }}>
                                        {group.goldenSet.officialScoreA[0]}-{group.goldenSet.officialScoreB[0]}
                                      </span>
                                    ) : (
                                      <span style={{ color: 'text.secondary', fontStyle: 'italic' }}>
                                        Non disputato
                                      </span>
                                    )}
                                  </Typography>
                                );
                              })()}
                            </Box>
                          )}
                        </Box>

                        {/* Risultato finale */}
                          {(areMatchesComplete || hasGoldenSetResult) && winner && (
                            <Box sx={{ 
                              mt: 1, 
                              pt: { xs: 1, sm: 2 },  // Padding-top ridotto su mobile
                              borderTop: '1px solid #eee', 
                              backgroundColor: 'lightgreen', 
                              p: { xs: 0.75, sm: 1 },  // Padding generale ridotto su mobile
                              borderRadius: '4px'
                            }}>
                              <Typography 
                                variant="subtitle1" 
                                sx={{ 
                                  fontWeight: 'bold',
                                  fontSize: { xs: '0.9rem', sm: '1rem' }  // Font ridotto su mobile
                                }}
                              >
                                VINCE: {winner.name}
                              </Typography>
                              {/* Mostra come è stata decisa la vittoria */}
                              {hasGoldenSetResult ? (
                                <Typography 
                                  variant="body2" 
                                  color="text.secondary"
                                  sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}  // Font ridotto su mobile
                                >
                                  Sfida decisa al Golden Set
                                </Typography>
                              ) : (
                                <Typography 
                                  variant="body2" 
                                  color="text.secondary"
                                  sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}  // Font ridotto su mobile
                                >
                                  {group.matches.filter(m => 
                                    (m.officialResult === 'teamA' && winner === group.teamA) || 
                                    (m.officialResult === 'teamB' && winner === group.teamB)
                                  ).length} - {group.matches.filter(m => 
                                    (m.officialResult === 'teamB' && winner === group.teamA) || 
                                    (m.officialResult === 'teamA' && winner === group.teamB)
                                  ).length}
                                </Typography>
                              )}
                            </Box>
                          )}
                      </CardContent>
                      <CardActions>
                        {group.matches.length > 0 && (
                          <Button 
                            size="small" 
                            component={RouterLink} 
                            to={`/matches/${group.matches[0]._id}`}
                          >
                            Dettagli
                          </Button>
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
    </LocalizationProvider>
  );
};

export default Matches;
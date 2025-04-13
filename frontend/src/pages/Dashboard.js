import React, { useState, useEffect, useContext } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Button
} from '@mui/material';
import { BugReport as DebugIcon } from '@mui/icons-material';
import { AuthContext } from '../context/AuthContext';
import { getMatches } from '../services/matchService';
import { getSubscribedTeams } from '../services/userService';
import { getNotifications } from '../services/notificationService';
import moment from 'moment';
import 'moment/locale/it';

// Componenti
import DebugPanel from '../components/dashboard/DebugPanel';
import MatchesSection from '../components/dashboard/MatchesSection';
import TeamsSection from '../components/dashboard/TeamsSection';
import NotificationsSection from '../components/dashboard/NotificationsSection';
import SignupPrompt from '../components/dashboard/SignupPrompt';
import { groupRelatedMatches, filterRelevantGroups } from '../components/dashboard/MatchUtils';

// Imposta la lingua italiana per moment
moment.locale('it');

const Dashboard = () => {
  const { currentUser } = useContext(AuthContext);
  const [allMatches, setAllMatches] = useState([]);
  const [filteredMatches, setFilteredMatches] = useState([]);
  const [groupedMatches, setGroupedMatches] = useState([]);
  const [subscribedTeams, setSubscribedTeams] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showOnlySubscribed, setShowOnlySubscribed] = useState(true);
  const [debugInfo, setDebugInfo] = useState({
    totalMatches: 0,
    relevantMatches: 0,
    groupedCount: 0,
    goldenSetsCount: 0,
    filterApplied: false,
    dataFetched: false,
    timeFiltered: false
  });
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
  const [showDebug, setShowDebug] = useState(false);

  // Carica tutte le partite
  const loadAllMatches = async () => {
    setLoading(prev => ({ ...prev, matches: true }));
    setError(prev => ({ ...prev, matches: '' }));
    
    try {
      // Ottieni tutte le partite, senza filtri
      console.log("Caricamento di tutte le partite");
      const matches = await getMatches();
      console.log("Partite caricate:", matches.length);
      
      // Conta i Golden Set
      const goldenSets = matches.filter(m => m.isGoldenSet || m.teamACode === 'G' || m.teamBCode === 'G').length;
      console.log("Golden Set trovati:", goldenSets);
      
      // Salva tutte le partite
      setAllMatches(matches);
      setDebugInfo(prev => ({
        ...prev,
        totalMatches: matches.length,
        goldenSetsCount: goldenSets,
        dataFetched: true
      }));
      
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
      console.log("Caricamento squadre sottoscritte");
      const teams = await getSubscribedTeams();
      console.log("Squadre sottoscritte caricate:", teams.length);
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

  // Toggle per mostrare solo le partite delle squadre sottoscritte
  const handleToggleSubscribed = () => {
    setShowOnlySubscribed(!showOnlySubscribed);
  };

  // Toggle per mostrare/nascondere info di debug
  const handleToggleDebug = () => {
    setShowDebug(!showDebug);
  };

  // Esegui un test diretto alla API per verificare che restituisca dati
  const testDirectApi = async () => {
    console.log("Test diretto API getMatches");
    try {
      const testMatches = await getMatches();
      console.log("API test risultato:", testMatches.length, "partite trovate");
      
      // Conta i Golden Set
      const goldenSets = testMatches.filter(m => m.isGoldenSet || m.teamACode === 'G' || m.teamBCode === 'G').length;
      console.log("Golden Set trovati:", goldenSets);
      
      alert(`Test API: ${testMatches.length} partite trovate, ${goldenSets} Golden Set`);
    } catch (err) {
      console.error("Test API fallito:", err);
      alert(`Test API fallito: ${err.message}`);
    }
  };

  // Carica i dati all'avvio
  useEffect(() => {
    console.log("Componente Dashboard montato");
    loadAllMatches();
    
    // Aggiorna le partite ogni minuto per mantenere la vista aggiornata
    const interval = setInterval(() => {
      loadAllMatches();
    }, 60000); // 60000 ms = 1 minuto
    
    return () => clearInterval(interval);
  }, []);

  // Carica i dati dell'utente se autenticato
  useEffect(() => {
    if (currentUser) {
      console.log("Utente autenticato, carico dati utente");
      loadSubscribedTeams();
      loadNotifications();
    }
  }, [currentUser]);

  // Applica il filtro quando cambiano i dati o le preferenze
  useEffect(() => {
    console.log("Dati cambiati, applico raggruppamento e filtro gruppi");
  
    // Step 1: Raggruppa sempre tutte le partite
    const groupedAll = groupRelatedMatches(allMatches);
  
    // Step 2: Filtra per data (solo partite recenti o future)
    const relevantGroups = filterRelevantGroups(groupedAll);
  
    // Step 3: Se necessario, applica ulteriore filtro per squadre sottoscritte
    const finalGroups = currentUser && showOnlySubscribed && subscribedTeams.length > 0
      ? relevantGroups.filter(group => 
          subscribedTeams.some(team => 
            team._id === group.teamA.id || team._id === group.teamB.id
          ))
      : relevantGroups;
  
    // Aggiorna lo stato con i gruppi finali filtrati
    setGroupedMatches(finalGroups);
  
    // Debug info aggiornate
    const goldenSetGroups = finalGroups.filter(g => g.goldenSet).length;
  
    setDebugInfo(prev => ({
      ...prev,
      totalMatches: allMatches.length,
      groupedCount: finalGroups.length,
      relevantMatches: finalGroups.reduce((acc, group) => acc + group.matches.length + (group.goldenSet ? 1 : 0), 0),
      goldenSetsCount: goldenSetGroups,
      filterApplied: showOnlySubscribed && subscribedTeams.length > 0,
      dataFetched: true,
      timeFiltered: true
    }));
  
  }, [allMatches, showOnlySubscribed, subscribedTeams, currentUser]);
  

  useEffect(() => {
    // Se l'utente ha squadre sottoscritte, attiva automaticamente il filtro
    if (subscribedTeams.length > 0) {
      setShowOnlySubscribed(true);
    }
  }, [subscribedTeams]);

  return (
    <Container maxWidth="lg">
      <Box py={3}>
        {/* Header responsivo */}
        <Box mb={3}>
          <Typography 
            variant="h4" 
            component="h1" 
            gutterBottom
            sx={{
              fontSize: { xs: '1.75rem', sm: '2rem', md: '2.125rem' }
            }}
          >
            AIBVC Club Series Finals
          </Typography>
          
          <Typography 
            variant="subtitle1" 
            color="text.secondary" 
            paragraph
            sx={{
              fontSize: { xs: '0.875rem', sm: '1rem' },
              lineHeight: { xs: 1.4, sm: 1.5 }
            }}
          >
            Benvenuto nel sistema di notifiche per le finali AIBVC Club Series. Ricevi aggiornamenti in tempo reale sulle partite delle tue squadre preferite.
          </Typography>
        </Box>

        {/* Sezione debug */}
        {showDebug && (
          <DebugPanel
            debugInfo={debugInfo}
            showOnlySubscribed={showOnlySubscribed}
            subscribedTeams={subscribedTeams}
            testDirectApi={testDirectApi}
            loadAllMatches={loadAllMatches}
          />
        )}

        <Grid container spacing={4} sx={{ mt: 2 }}>
          {/* Sezione principale con le partite recenti e imminenti */}
          <Grid xs={12}>
            <MatchesSection
              loading={loading.matches}
              error={error.matches}
              groupedMatches={groupedMatches}
              allMatches={allMatches}
              showOnlySubscribed={showOnlySubscribed}
              subscribedTeams={subscribedTeams}
              handleToggleSubscribed={handleToggleSubscribed}
              currentUser={currentUser}
            />
          </Grid>
          
          {!currentUser ? (
            <Grid xs={12}>
              <SignupPrompt />
            </Grid>
          ) : (
            <>
              <Grid xs={12} sm={6}>
                <TeamsSection
                  loading={loading.teams}
                  error={error.teams}
                  subscribedTeams={subscribedTeams}
                />
              </Grid>

              <Grid xs={12} sm={6}>
                <NotificationsSection
                  loading={loading.notifications}
                  error={error.notifications}
                  notifications={notifications}
                />
              </Grid>
            </>
          )}
        </Grid>
        
        {/* Pulsante Debug spostato in fondo alla pagina */}
        <Box display="flex" justifyContent="center" mt={6} mb={2}>
          <Button 
            startIcon={<DebugIcon />} 
            color="info" 
            variant="outlined" 
            onClick={handleToggleDebug}
            size="small"
          >
            Debug {showDebug ? 'Nascondi' : 'Mostra'}
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default Dashboard;
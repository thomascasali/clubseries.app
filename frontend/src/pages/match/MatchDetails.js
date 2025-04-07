// frontend/src/pages/match/MatchDetails.js
import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Grid,
  Paper,
  Divider,
  Button,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import {
  SportsTennis as SportsIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { getMatchById, getMatches, submitMatchResult, confirmMatchResult } from '../../services/matchService';
import { AuthContext } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import moment from 'moment';
import 'moment/locale/it';

// Import dei componenti estratti
import MatchCard from '../../components/match/MatchCard';
import ResultSubmitDialog from '../../components/match/ResultSubmitDialog';
import ResultConfirmDialog from '../../components/match/ResultConfirmDialog';

// Import delle utility estratte
import { findRelatedMatches, determineOverallWinner } from '../../utils/matchUtils';

moment.locale('it');

const MatchDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useContext(AuthContext);

  const [match, setMatch] = useState(null);
  const [matchesA, setMatchesA] = useState([]);
  const [matchesB, setMatchesB] = useState([]);
  const [goldenSet, setGoldenSet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  // Stati per i dialoghi
  const [openResultDialog, setOpenResultDialog] = useState(false);
  const [teamPassword, setTeamPassword] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [scores, setScores] = useState({
    set1A: '',
    set1B: '',
    set2A: '',
    set2B: '',
    set3A: '',
    set3B: '',
  });

  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [confirmTeamPassword, setConfirmTeamPassword] = useState('');
  const [confirmAction, setConfirmAction] = useState(true);

  // Carica i dettagli della partita principale e trova le partite correlate
const loadMatchWithRelated = async () => {
  setLoading(true);
  setError('');
  try {
    // Carica la partita corrente
    const matchData = await getMatchById(id);
    console.log('Loaded current match:', matchData);
    setMatch(matchData);

    // Carica tutte le partite per trovare quelle correlate
    const allMatches = await getMatches();
    console.log('Loaded all matches:', allMatches.length);
    
    // Controlla che le partite abbiano le proprietà necessarie
    const validMatches = allMatches.filter(m => m && m.teamA && m.teamB);
    console.log('Valid matches:', validMatches.length);
    
    // Trova le partite correlate
    const { matchesA, matchesB, goldenSet } = findRelatedMatches(validMatches, matchData);
    
    console.log('Related matches found:', {
      matchesA: matchesA.length,
      matchesB: matchesB.length,
      goldenSet: goldenSet ? 'Yes' : 'No'
    });
    
    setMatchesA(matchesA);
    setMatchesB(matchesB);
    setGoldenSet(goldenSet);
  } catch (err) {
    console.error('Error loading match details:', err);
    setError(err.message || 'Errore durante il caricamento della partita');
  } finally {
    setLoading(false);
  }
};

  // Handlers per i dialoghi
  const handleOpenResultDialog = (match, teamId) => {
    setSelectedMatch(match);
    setSelectedTeam(teamId);
    setOpenResultDialog(true);
  };

  const handleCloseResultDialog = () => {
    setOpenResultDialog(false);
    setTeamPassword('');
    setScores({ set1A: '', set1B: '', set2A: '', set2B: '', set3A: '', set3B: '' });
    setSelectedMatch(null);
  };

  const handleOpenConfirmDialog = (match, teamId, confirm) => {
    setSelectedMatch(match);
    setSelectedTeam(teamId);
    setConfirmAction(confirm);
    setOpenConfirmDialog(true);
  };

  const handleCloseConfirmDialog = () => {
    setOpenConfirmDialog(false);
    setConfirmTeamPassword('');
    setSelectedMatch(null);
  };

  const handleScoreChange = (e) => {
    setScores({ ...scores, [e.target.name]: e.target.value });
  };

  // Submit dei risultati
  const handleSubmitResult = async () => {
    if (!teamPassword) return toast.error('Inserisci la password della squadra');
    const scoreFields = ['set1A', 'set1B', 'set2A', 'set2B'];
    for (const field of scoreFields) {
      if (scores[field] === '' || isNaN(parseInt(scores[field]))) {
        return toast.error('Inserisci punteggi validi per tutti i set');
      }
    }
    setSubmitLoading(true);
    try {
      const scoreA = [scores.set1A, scores.set2A];
      const scoreB = [scores.set1B, scores.set2B];
      if (scores.set3A && scores.set3B) {
        scoreA.push(scores.set3A);
        scoreB.push(scores.set3B);
      }
      await submitMatchResult(selectedMatch._id, { teamId: selectedTeam, password: teamPassword, scoreA, scoreB });
      toast.success('Risultato inserito con successo!');
      handleCloseResultDialog();
      await loadMatchWithRelated();
    } catch (err) {
      toast.error(err.message || 'Errore durante l\'inserimento del risultato');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Conferma dei risultati
  const handleConfirmResult = async () => {
    if (!confirmTeamPassword) return toast.error('Inserisci la password della squadra');
    setSubmitLoading(true);
    try {
      await confirmMatchResult(selectedMatch._id, { teamId: selectedTeam, password: confirmTeamPassword, confirm: confirmAction });
      toast.success(confirmAction ? 'Risultato confermato!' : 'Risultato rifiutato!');
      handleCloseConfirmDialog();
      await loadMatchWithRelated();
    } catch (err) {
      toast.error(err.message || 'Errore durante la conferma');
    } finally {
      setSubmitLoading(false);
    }
  };

  useEffect(() => { loadMatchWithRelated(); }, [id]);

  // Determina il vincitore complessivo
  const overallWinner = match && (matchesA.length > 0 || matchesB.length > 0) 
    ? determineOverallWinner(match, matchesA, matchesB, goldenSet) 
    : null;

  if (loading) {
    return (
      <Container maxWidth="md">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md">
        <Alert severity="error" sx={{ mt: 3 }}>{error}</Alert>
        <Button 
          variant="outlined" 
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/matches')} 
          sx={{ mt: 2 }}
        >
          Torna alla lista
        </Button>
      </Container>
    );
  }

  if (!match) {
    return (
      <Container maxWidth="md">
        <Alert severity="info" sx={{ mt: 3 }}>Partita non trovata</Alert>
        <Button 
          variant="outlined" 
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/matches')} 
          sx={{ mt: 2 }}
        >
          Torna alla lista
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Box py={3}>
        <Button 
          component={RouterLink} 
          to="/matches" 
          startIcon={<ArrowBackIcon />}
          sx={{ mb: 3 }}
        >
          Torna alla lista partite
        </Button>
        
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" mb={2}>
            <Box>
              <Typography variant="h4" gutterBottom>
                {match.teamA.name} vs {match.teamB.name}
              </Typography>
              
              <Box display="flex" gap={1} flexWrap="wrap">
                <Chip label={match.category} color="primary" />
                <Chip label={match.phase.replace(/\s*-\s*[\w\d]+\s*vs\s*[\w\d]+$/, '').trim()} />
              </Box>
            </Box>
          </Box>
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <SportsIcon color="primary" sx={{ mr: 1 }} />
            Dettaglio Partite
          </Typography>
          
          {(matchesA.length > 0 || matchesB.length > 0 || goldenSet) ? (
            <Box>
              {/* Team A vs Team A */}
              {matchesA.length > 0 && (
                <Box mb={3}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    🔵 Team A vs Team A
                  </Typography>
                  {matchesA.map(match => (
                    <MatchCard 
                      key={match._id}
                      match={match}
                      teamType="A"
                      onOpenResultDialog={handleOpenResultDialog}
                      onOpenConfirmDialog={handleOpenConfirmDialog}
                    />
                  ))}
                </Box>
              )}
              
              {/* Team B vs Team B */}
              {matchesB.length > 0 && (
                <Box mb={3}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    🟠 Team B vs Team B
                  </Typography>
                  {matchesB.map(match => (
                    <MatchCard 
                      key={match._id}
                      match={match}
                      teamType="B"
                      onOpenResultDialog={handleOpenResultDialog}
                      onOpenConfirmDialog={handleOpenConfirmDialog}
                    />
                  ))}
                </Box>
              )}
              
              {/* Golden Set */}
              {goldenSet && (
                <Box mb={3}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    🏆 Golden Set
                  </Typography>
                  <MatchCard 
                    match={goldenSet}
                    isGoldenSet={true}
                    onOpenResultDialog={handleOpenResultDialog}
                    onOpenConfirmDialog={handleOpenConfirmDialog}
                  />
                </Box>
              )}
              
              {/* Overall Winner Display */}
              {overallWinner && (
                <Paper 
                  elevation={3} 
                  sx={{ 
                    p: 3, 
                    bgcolor: 'success.light', 
                    borderRadius: 2,
                    mt: 3,
                    color: 'white'
                  }}
                >
                  <Box display="flex" alignItems="center" mb={1}>
                    <Typography variant="h5" fontWeight="bold">
                      VINCE: {overallWinner.team.name}
                    </Typography>
                  </Box>
                  <Typography variant="body1">
                    {overallWinner.decidedBy === 'goldenSet' 
                      ? `Decisivo il Golden Set (${overallWinner.score})` 
                      : `Vittoria per ${overallWinner.score}`}
                  </Typography>
                </Paper>
              )}
            </Box>
          ) : (
            <Alert severity="info" sx={{ mt: 2 }}>
              Non sono state trovate altre partite correlate a questa sfida.
            </Alert>
          )}
        </Paper>
      </Box>

      {/* Dialog componenti */}
      <ResultSubmitDialog
        open={openResultDialog}
        onClose={handleCloseResultDialog}
        selectedMatch={selectedMatch}
        selectedTeam={selectedTeam}
        teamPassword={teamPassword}
        setTeamPassword={setTeamPassword}
        scores={scores}
        handleScoreChange={handleScoreChange}
        handleSubmitResult={handleSubmitResult}
        submitLoading={submitLoading}
      />

      <ResultConfirmDialog
        open={openConfirmDialog}
        onClose={handleCloseConfirmDialog}
        selectedMatch={selectedMatch}
        selectedTeam={selectedTeam}
        confirmTeamPassword={confirmTeamPassword}
        setConfirmTeamPassword={setConfirmTeamPassword}
        confirmAction={confirmAction}
        handleConfirmResult={handleConfirmResult}
        submitLoading={submitLoading}
      />
    </Container>
  );
};

export default MatchDetails;
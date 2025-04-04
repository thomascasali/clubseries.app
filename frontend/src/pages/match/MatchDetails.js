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
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  CircularProgress,
  Alert,
  Chip,
  Card,
  CardContent,
} from '@mui/material';
import {
  CalendarMonth as CalendarIcon,
  SportsTennis as SportsIcon,
  Place as PlaceIcon,
  Flag as FlagIcon,
  EmojiEvents as ResultIcon,
  Lock as LockIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { getMatchById, getMatches, submitMatchResult, confirmMatchResult } from '../../services/matchService';
import { AuthContext } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import moment from 'moment';
import 'moment/locale/it';
import { calculateSetResult, formatDetailedScore } from '../../components/dashboard/MatchUtils';

moment.locale('it');

// Funzione aggiornata per trovare le partite correlate
const findRelatedMatches = (allMatches, currentMatch) => {
  if (!currentMatch || !currentMatch.teamA || !currentMatch.teamB) {
    return { matches: [], goldenSet: null };
  }

  const teamAName = currentMatch.teamA.name;
  const teamBName = currentMatch.teamB.name;
  const phase = currentMatch.phase.replace(/ - [\w\d]+\s*vs\s*[\w\d]+$/, '').trim();
  const category = currentMatch.category;

  // Trova partite normali correlate
  const relatedMatches = allMatches.filter(match => {
    if (!match.teamA || !match.teamB || match.isGoldenSet || match.teamACode === 'G' || match.teamBCode === 'G') return false;

    const matchPhase = match.phase.replace(/ - [\w\d]+\s*vs\s*[\w\d]+$/, '').trim();
    const sameTeams = (
      (match.teamA.name === teamAName && match.teamB.name === teamBName) ||
      (match.teamA.name === teamBName && match.teamB.name === teamAName)
    );

    return match.category === category && matchPhase === phase && sameTeams;
  });

  // Trova il golden set associato usando una logica più robusta
  const goldenSet = allMatches.find(match => {
    if (!match.teamA || !match.teamB || (!match.isGoldenSet && match.teamACode !== 'G' && match.teamBCode !== 'G')) return false;

    const matchPhase = match.phase.replace(/ - [\w\d]+\s*vs\s*[\w\d]+$/, '').trim();
    const sameTeams = (
      (match.teamA.name === teamAName && match.teamB.name === teamBName) ||
      (match.teamA.name === teamBName && match.teamB.name === teamAName)
    );

    return match.category === category && matchPhase === phase && sameTeams;
  });

  return { matches: relatedMatches, goldenSet };
};


/// Funzione per determinare il vincitore complessivo
const determineOverallWinner = (currentMatch, relatedMatches, goldenSet) => {
  if (!currentMatch || !relatedMatches.length) return null;

  // Se c'è un golden set con risultato, questo è decisivo
  if (goldenSet && goldenSet.officialScoreA && goldenSet.officialScoreA.length > 0) {
    const teamA = parseInt(goldenSet.officialScoreA[0]);
    const teamB = parseInt(goldenSet.officialScoreB[0]);
    
    if (!isNaN(teamA) && !isNaN(teamB)) {
      if (teamA > teamB) {
        return { team: currentMatch.teamA, decidedBy: 'goldenSet' };
      } else if (teamB > teamA) {
        return { team: currentMatch.teamB, decidedBy: 'goldenSet' };
      }
    }
  }
  
  // Altrimenti conta le vittorie
  let teamAWins = 0;
  let teamBWins = 0;
  
  relatedMatches.forEach(match => {
    if (match.officialResult === 'teamA') {
      teamAWins++;
    } else if (match.officialResult === 'teamB') {
      teamBWins++;
    }
  });
  
  console.log(`Vittorie: TeamA=${teamAWins}, TeamB=${teamBWins}`);
  
  if (teamAWins > teamBWins) {
    return { team: currentMatch.teamA, decidedBy: 'matches', score: `${teamAWins}-${teamBWins}` };
  } else if (teamBWins > teamAWins) {
    return { team: currentMatch.teamB, decidedBy: 'matches', score: `${teamBWins}-${teamAWins}` };
  }
  
  return null; // Nessun vincitore chiaro
};

const MatchDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useContext(AuthContext);

  const [match, setMatch] = useState(null);
  const [relatedMatches, setRelatedMatches] = useState([]);
  const [goldenSet, setGoldenSet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

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
      setMatch(matchData);

      // Carica tutte le partite per trovare quelle correlate
      const allMatches = await getMatches();
      
      // Trova le partite correlate
      const { matches, goldenSet } = findRelatedMatches(allMatches, matchData);
      
      // Ordina le partite per Team
      const sortedMatches = [...matches].sort((a, b) => {
        // Ordina prima per Team Code
        const codeA = a.teamACode + a.teamBCode;
        const codeB = b.teamACode + b.teamBCode;
        return codeA.localeCompare(codeB);
      });
      
      setRelatedMatches(sortedMatches);
      setGoldenSet(goldenSet);
    } catch (err) {
      console.error('Error loading match details:', err);
      setError(err.message || 'Errore durante il caricamento della partita');
    } finally {
      setLoading(false);
    }
  };

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

  // Renderizza la card di una singola partita
  const renderMatchCard = (match, isGoldenSet = false) => {
    const setResult = calculateSetResult(match);
    const detailedScore = formatDetailedScore(match);
    const hasResult = match.officialScoreA && match.officialScoreA.length > 0;
    const awaitingConfirmation = hasResult && !(match.confirmedByTeamA && match.confirmedByTeamB);
    
    let statusText = '';
    if (hasResult) {
      if (match.confirmedByTeamA && match.confirmedByTeamB) {
        statusText = 'Risultato confermato';
      } else if (match.confirmedByTeamA) {
        statusText = 'In attesa di conferma da Team B';
      } else if (match.confirmedByTeamB) {
        statusText = 'In attesa di conferma da Team A';
      } else {
        statusText = 'In attesa di conferma';
      }
    }

    return (
      <Card variant="outlined" sx={{ mb: 3, position: 'relative' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom color="primary">
            {isGoldenSet ? 'Golden Set' : `Team ${match.teamACode} vs Team ${match.teamBCode}`}
          </Typography>
          
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6}>
              <Typography variant="body1" mb={1}>
                {match.teamA.name} vs {match.teamB.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {match.phase}
              </Typography>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Box display="flex" alignItems="center" justifyContent="flex-end" mb={1}>
                <CalendarIcon fontSize="small" sx={{ mr: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  {moment(match.date).format('LL')} • {match.time}
                </Typography>
              </Box>
              <Box display="flex" alignItems="center" justifyContent="flex-end">
                <PlaceIcon fontSize="small" sx={{ mr: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  Campo {match.court}
                </Typography>
              </Box>
            </Grid>
          </Grid>
          
          <Divider sx={{ my: 2 }} />
          
          {hasResult ? (
            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="subtitle1">Risultato:</Typography>
                <Typography variant="h6" fontWeight="bold">
                  {setResult}
                </Typography>
              </Box>
              
              <Typography variant="body2" align="right" color="text.secondary" mb={2}>
                {detailedScore}
              </Typography>
              
              {statusText && (
                <Alert severity={match.confirmedByTeamA && match.confirmedByTeamB ? "success" : "info"} sx={{ mb: 2 }}>
                  {statusText}
                </Alert>
              )}
              
              {awaitingConfirmation && (
                <Box display="flex" justifyContent="space-between" flexWrap="wrap" gap={1}>
                  {!match.confirmedByTeamA && (
                    <Button 
                      variant="outlined" 
                      size="small"
                      startIcon={<LockIcon />}
                      onClick={() => handleOpenConfirmDialog(match, match.teamA._id, true)}
                    >
                      Conferma come Team A
                    </Button>
                  )}
                  
                  {!match.confirmedByTeamB && (
                    <Button 
                      variant="outlined" 
                      size="small"
                      startIcon={<LockIcon />}
                      onClick={() => handleOpenConfirmDialog(match, match.teamB._id, true)}
                    >
                      Conferma come Team B
                    </Button>
                  )}
                  
                  {match.confirmedByTeamA && !match.confirmedByTeamB && (
                    <Button 
                      variant="outlined" 
                      size="small"
                      color="error"
                      onClick={() => handleOpenConfirmDialog(match, match.teamA._id, false)}
                    >
                      Rifiuta come Team A
                    </Button>
                  )}
                  
                  {match.confirmedByTeamB && !match.confirmedByTeamA && (
                    <Button 
                      variant="outlined" 
                      size="small"
                      color="error"
                      onClick={() => handleOpenConfirmDialog(match, match.teamB._id, false)}
                    >
                      Rifiuta come Team B
                    </Button>
                  )}
                </Box>
              )}
            </Box>
          ) : (
            <Box textAlign="center" py={2}>
              <Typography variant="body1" color="text.secondary">
                Nessun risultato disponibile
              </Typography>
              
              <Box display="flex" justifyContent="center" gap={2} mt={2}>
                <Button 
                  variant="outlined" 
                  startIcon={<ResultIcon />}
                  onClick={() => handleOpenResultDialog(match, match.teamA._id)}
                >
                  Inserisci come Team A
                </Button>
                
                <Button 
                  variant="outlined" 
                  startIcon={<ResultIcon />}
                  onClick={() => handleOpenResultDialog(match, match.teamB._id)}
                >
                  Inserisci come Team B
                </Button>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  useEffect(() => { loadMatchWithRelated(); }, [id]);

  // Determina il vincitore complessivo
  const overallWinner = match && relatedMatches ? determineOverallWinner(match, relatedMatches, goldenSet) : null;

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
          
          {relatedMatches.length > 0 ? (
            <Box>
              {relatedMatches.map(relMatch => renderMatchCard(relMatch))}
              
              {goldenSet && renderMatchCard(goldenSet, true)}
              
              {overallWinner && (
                <Paper 
                  elevation={0} 
                  sx={{ 
                    p: 3, 
                    bgcolor: 'success.light', 
                    borderRadius: 2,
                    mt: 3,
                    color: 'white'
                  }}
                >
                  <Typography variant="h5" fontWeight="bold">
                    VINCE: {overallWinner.team.name}
                  </Typography>
                  <Typography variant="body1" sx={{ mt: 1 }}>
                    {overallWinner.decidedBy === 'goldenSet' 
                      ? 'Sfida decisa al Golden Set' 
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

      {/* Dialog per inserire il risultato */}
      <Dialog open={openResultDialog} onClose={handleCloseResultDialog}>
        <DialogTitle>Inserisci risultato</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Stai inserendo il risultato come {selectedMatch?.teamA?._id === selectedTeam ? selectedMatch?.teamA?.name : selectedMatch?.teamB?.name}.
            Inserisci la password della squadra per confermare.
          </DialogContentText>
          
          <TextField
            margin="dense"
            label="Password della squadra"
            type="password"
            fullWidth
            variant="outlined"
            value={teamPassword}
            onChange={(e) => setTeamPassword(e.target.value)}
            sx={{ mb: 3 }}
          />
          
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>Set 1</Typography>
            </Grid>
            <Grid item xs={6}>
              <TextField
                label={`${selectedMatch?.teamA?.name} (A)`}
                name="set1A"
                type="number"
                fullWidth
                variant="outlined"
                value={scores.set1A}
                onChange={handleScoreChange}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label={`${selectedMatch?.teamB?.name} (B)`}
                name="set1B"
                type="number"
                fullWidth
                variant="outlined"
                value={scores.set1B}
                onChange={handleScoreChange}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>Set 2</Typography>
            </Grid>
            <Grid item xs={6}>
              <TextField
                label={`${selectedMatch?.teamA?.name} (A)`}
                name="set2A"
                type="number"
                fullWidth
                variant="outlined"
                value={scores.set2A}
                onChange={handleScoreChange}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label={`${selectedMatch?.teamB?.name} (B)`}
                name="set2B"
                type="number"
                fullWidth
                variant="outlined"
                value={scores.set2B}
                onChange={handleScoreChange}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>Set 3 (opzionale)</Typography>
            </Grid>
            <Grid item xs={6}>
              <TextField
                label={`${selectedMatch?.teamA?.name} (A)`}
                name="set3A"
                type="number"
                fullWidth
                variant="outlined"
                value={scores.set3A}
                onChange={handleScoreChange}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label={`${selectedMatch?.teamB?.name} (B)`}
                name="set3B"
                type="number"
                fullWidth
                variant="outlined"
                value={scores.set3B}
                onChange={handleScoreChange}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseResultDialog}>Annulla</Button>
          <Button 
            onClick={handleSubmitResult} 
            variant="contained" 
            disabled={submitLoading}
          >
            {submitLoading ? 'Invio in corso...' : 'Invia risultato'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog per confermare il risultato */}
      <Dialog open={openConfirmDialog} onClose={handleCloseConfirmDialog}>
        <DialogTitle>
          {confirmAction ? 'Conferma risultato' : 'Rifiuta risultato'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmAction 
              ? `Stai confermando il risultato come ${selectedTeam === selectedMatch?.teamA?._id ? selectedMatch?.teamA?.name : selectedMatch?.teamB?.name}.`
              : `Stai rifiutando il risultato come ${selectedTeam === selectedMatch?.teamA?._id ? selectedMatch?.teamA?.name : selectedMatch?.teamB?.name}.`
            }
            Inserisci la password della squadra per procedere.
          </DialogContentText>
          
          <TextField
            margin="dense"
            label="Password della squadra"
            type="password"
            fullWidth
            variant="outlined"
            value={confirmTeamPassword}
            onChange={(e) => setConfirmTeamPassword(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfirmDialog}>Annulla</Button>
          <Button 
            onClick={handleConfirmResult} 
            variant="contained" 
            color={confirmAction ? 'primary' : 'error'}
            disabled={submitLoading}
          >
            {submitLoading 
              ? 'Elaborazione...' 
              : confirmAction ? 'Conferma risultato' : 'Rifiuta risultato'
            }
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default MatchDetails;
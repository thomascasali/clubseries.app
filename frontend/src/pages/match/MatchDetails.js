import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
} from '@mui/icons-material';
import { getMatchById, submitMatchResult, confirmMatchResult } from '../../services/matchService';
import { AuthContext } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import moment from 'moment';
import 'moment/locale/it';

// Imposta la lingua italiana per moment
moment.locale('it');

const MatchDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useContext(AuthContext);
  
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  
  // Stati per l'inserimento del risultato
  const [openResultDialog, setOpenResultDialog] = useState(false);
  const [teamPassword, setTeamPassword] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [scores, setScores] = useState({
    set1A: '',
    set1B: '',
    set2A: '',
    set2B: '',
    set3A: '',
    set3B: '',
  });
  
  // Stati per la conferma del risultato
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [confirmTeamPassword, setConfirmTeamPassword] = useState('');
  const [confirmAction, setConfirmAction] = useState(true); // true per confermare, false per rifiutare
  
  // Carica i dettagli della partita
  const loadMatch = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Utilizzare l'API reale
      const matchData = await getMatchById(id);
      setMatch(matchData);
    } catch (err) {
      console.error('Error loading match:', err);
      setError(err.message || 'Errore durante il caricamento della partita');
    } finally {
      setLoading(false);
    }
  };
  
  // Gestisce l'apertura del dialog per inserire il risultato
  const handleOpenResultDialog = (teamId) => {
    setSelectedTeam(teamId);
    setOpenResultDialog(true);
  };
  
  // Gestisce la chiusura del dialog per inserire il risultato
  const handleCloseResultDialog = () => {
    setOpenResultDialog(false);
    setTeamPassword('');
    setScores({
      set1A: '',
      set1B: '',
      set2A: '',
      set2B: '',
      set3A: '',
      set3B: '',
    });
  };
  
  // Gestisce l'apertura del dialog di conferma
  const handleOpenConfirmDialog = (teamId, confirm) => {
    setSelectedTeam(teamId);
    setConfirmAction(confirm);
    setOpenConfirmDialog(true);
  };
  
  // Gestisce la chiusura del dialog di conferma
  const handleCloseConfirmDialog = () => {
    setOpenConfirmDialog(false);
    setConfirmTeamPassword('');
  };
  
  // Gestisce il cambiamento dei punteggi
  const handleScoreChange = (e) => {
    setScores({
      ...scores,
      [e.target.name]: e.target.value,
    });
  };
  
  // Invia il risultato della partita
  const handleSubmitResult = async () => {
    if (!teamPassword) {
      toast.error('Inserisci la password della squadra');
      return;
    }
    
    // Verifica che i punteggi siano numeri validi
    const scoreFields = ['set1A', 'set1B', 'set2A', 'set2B'];
    for (const field of scoreFields) {
      if (scores[field] === '' || isNaN(parseInt(scores[field]))) {
        toast.error('Inserisci punteggi validi per tutti i set');
        return;
      }
    }
    
    setSubmitLoading(true);
    
    try {
      // Prepara i punteggi nel formato richiesto dall'API
      const scoreA = [scores.set1A, scores.set2A];
      const scoreB = [scores.set1B, scores.set2B];
      
      // Aggiungi il terzo set solo se è stato inserito
      if (scores.set3A && scores.set3B) {
        scoreA.push(scores.set3A);
        scoreB.push(scores.set3B);
      }
      
      // Chiamata API reale
      await submitMatchResult(id, {
        teamId: selectedTeam,
        password: teamPassword,
        scoreA,
        scoreB,
      });
      
      toast.success('Risultato inserito con successo! In attesa di conferma dalla squadra avversaria.');
      handleCloseResultDialog();
      
      // Ricarica i dati della partita
      await loadMatch();
    } catch (err) {
      console.error('Error submitting result:', err);
      toast.error(err.message || 'Errore durante l\'inserimento del risultato');
    } finally {
      setSubmitLoading(false);
    }
  };
  
  // Conferma o rifiuta il risultato
  const handleConfirmResult = async () => {
    if (!confirmTeamPassword) {
      toast.error('Inserisci la password della squadra');
      return;
    }
    
    setSubmitLoading(true);
    
    try {
      // Chiamata API reale
      await confirmMatchResult(id, {
        teamId: selectedTeam,
        password: confirmTeamPassword,
        confirm: confirmAction,
      });
      
      if (confirmAction) {
        toast.success('Risultato confermato con successo!');
      } else {
        toast.success('Risultato rifiutato con successo!');
      }
      
      handleCloseConfirmDialog();
      
      // Ricarica i dati della partita
      await loadMatch();
    } catch (err) {
      console.error('Error confirming result:', err);
      toast.error(err.message || 'Errore durante la conferma del risultato');
    } finally {
      setSubmitLoading(false);
    }
  };
  
  // Carica i dettagli della partita all'avvio
  useEffect(() => {
    loadMatch();
  }, [id]);
  
  // Mostra un loader durante il caricamento
  if (loading) {
    return (
      <Container maxWidth="md">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }
  
  // Mostra un messaggio di errore se c'è stato un problema
  if (error) {
    return (
      <Container maxWidth="md">
        <Alert severity="error" sx={{ mt: 3 }}>
          {error}
        </Alert>
        <Button 
          variant="outlined" 
          onClick={() => navigate('/matches')} 
          sx={{ mt: 2 }}
        >
          Torna alla lista delle partite
        </Button>
      </Container>
    );
  }
  
  // Se non è stata trovata la partita
  if (!match) {
    return (
      <Container maxWidth="md">
        <Alert severity="info" sx={{ mt: 3 }}>
          Partita non trovata
        </Alert>
        <Button 
          variant="outlined" 
          onClick={() => navigate('/matches')} 
          sx={{ mt: 2 }}
        >
          Torna alla lista delle partite
        </Button>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="md">
      <Box py={3}>
        <Box display="flex" alignItems="center" mb={2}>
          <Button 
            variant="outlined" 
            onClick={() => navigate('/matches')} 
            sx={{ mr: 2 }}
          >
            Indietro
          </Button>
          <Typography variant="h4">
            Dettagli Partita
          </Typography>
        </Box>
        
        <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
          <Box sx={{ mb: 2 }}>
            <Chip 
              label={match.category} 
              color="primary" 
              sx={{ mr: 1 }} 
            />
            <Chip 
              label={match.phase} 
              variant="outlined" 
            />
          </Box>
          
          <Typography variant="h5" gutterBottom>
            {match.teamA.name} vs {match.teamB.name}
          </Typography>
          
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <Box display="flex" alignItems="center" mb={2}>
                <CalendarIcon color="primary" sx={{ mr: 1 }} />
                <Typography>
                  {moment(match.date).format('dddd D MMMM YYYY')}
                </Typography>
              </Box>
              
              <Box display="flex" alignItems="center" mb={2}>
                <SportsIcon color="primary" sx={{ mr: 1 }} />
                <Typography>
                  Ora: {match.time}
                </Typography>
              </Box>
              
              <Box display="flex" alignItems="center" mb={2}>
                <PlaceIcon color="primary" sx={{ mr: 1 }} />
                <Typography>
                  Campo: {match.court}
                </Typography>
              </Box>
              
              <Box display="flex" alignItems="center">
                <FlagIcon color="primary" sx={{ mr: 1 }} />
                <Typography>
                  Match ID: {match.matchId}
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              {match.result && match.result !== 'pending' ? (
                <Card variant="outlined" sx={{ p: 1, bgcolor: 'rgba(0, 128, 0, 0.05)' }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={1}>
                      <ResultIcon color="success" sx={{ mr: 1 }} />
                      <Typography variant="h6">
                        Risultato Finale
                      </Typography>
                    </Box>
                    
                    <Typography variant="body1" gutterBottom>
                      {match.result === 'teamA' 
                        ? `${match.teamA.name} ha vinto` 
                        : match.result === 'teamB' 
                          ? `${match.teamB.name} ha vinto` 
                          : 'Partita terminata in pareggio'
                      }
                    </Typography>
                    
                    {match.scoreA && match.scoreB && (
                      <Box mt={1}>
                        <Typography variant="subtitle2">Punteggi:</Typography>
                        {match.scoreA.map((score, index) => (
                          <Typography key={index} variant="body2">
                            Set {index + 1}: {score} - {match.scoreB[index]}
                          </Typography>
                        ))}
                      </Box>
                    )}
                    
                    <Box mt={2} display="flex">
                      {match.confirmedByTeamA && (
                        <Chip 
                          size="small" 
                          color="success" 
                          label={`Confermato da ${match.teamA.name}`} 
                          sx={{ mr: 1 }}
                        />
                      )}
                      {match.confirmedByTeamB && (
                        <Chip 
                          size="small" 
                          color="success" 
                          label={`Confermato da ${match.teamB.name}`} 
                        />
                      )}
                    </Box>
                  </CardContent>
                </Card>
              ) : (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Risultato in attesa
                  </Typography>
                  
                  {match.confirmedByTeamA && !match.confirmedByTeamB && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      Risultato inserito da {match.teamA.name}, in attesa di conferma da {match.teamB.name}
                    </Alert>
                  )}
                  
                  {!match.confirmedByTeamA && match.confirmedByTeamB && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      Risultato inserito da {match.teamB.name}, in attesa di conferma da {match.teamA.name}
                    </Alert>
                  )}
                  
                  <Box sx={{ mt: 2 }}>
                    <Button
                      variant="contained"
                      onClick={() => handleOpenResultDialog(match.teamA._id)}
                      sx={{ mr: 2, mb: 1 }}
                    >
                      {match.teamA.name}
                    </Button>
                    <Button
                      variant="contained"
                      onClick={() => handleOpenResultDialog(match.teamB._id)}
                      sx={{ mb: 1 }}
                    >
                      {match.teamB.name}
                    </Button>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Seleziona la tua squadra per inserire il risultato. Avrai bisogno della password della squadra.
                    </Typography>
                  </Box>
                </Box>
              )}
              
              {/* Mostra bottoni di conferma/rifiuto se il risultato è in attesa di conferma */}
              {match.result !== 'pending' && (
                (match.confirmedByTeamA && !match.confirmedByTeamB) ||
                (!match.confirmedByTeamA && match.confirmedByTeamB)
              ) && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Conferma o rifiuta il risultato:
                  </Typography>
                  <Button
                    variant="contained"
                    color="success"
                    onClick={() => handleOpenConfirmDialog(
                      match.confirmedByTeamA ? match.teamB._id : match.teamA._id, 
                      true
                    )}
                    sx={{ mr: 2 }}
                  >
                    Conferma
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => handleOpenConfirmDialog(
                      match.confirmedByTeamA ? match.teamB._id : match.teamA._id, 
                      false
                    )}
                  >
                    Rifiuta
                  </Button>
                </Box>
              )}
            </Grid>
          </Grid>
        </Paper>
      </Box>
      
      {/* Dialog per inserimento risultato */}
      <Dialog open={openResultDialog} onClose={handleCloseResultDialog}>
        <DialogTitle>
          Inserisci Risultato
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Stai inserendo il risultato per la squadra: {selectedTeam === match?.teamA?._id ? match?.teamA?.name : match?.teamB?.name}
          </DialogContentText>
          
          <Box sx={{ mt: 2, mb: 2 }}>
            <TextField
              label="Password della Squadra"
              type="password"
              fullWidth
              required
              value={teamPassword}
              onChange={(e) => setTeamPassword(e.target.value)}
              sx={{ mb: 3 }}
              InputProps={{
                startAdornment: <LockIcon color="action" sx={{ mr: 1 }} />,
              }}
            />
            
            <Typography variant="subtitle2" gutterBottom>
              Set 1:
            </Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <TextField
                  label={`Punti ${match?.teamA?.name}`}
                  name="set1A"
                  type="number"
                  fullWidth
                  required
                  value={scores.set1A}
                  onChange={handleScoreChange}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label={`Punti ${match?.teamB?.name}`}
                  name="set1B"
                  type="number"
                  fullWidth
                  required
                  value={scores.set1B}
                  onChange={handleScoreChange}
                />
              </Grid>
            </Grid>
            
            <Typography variant="subtitle2" gutterBottom>
              Set 2:
            </Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <TextField
                  label={`Punti ${match?.teamA?.name}`}
                  name="set2A"
                  type="number"
                  fullWidth
                  required
                  value={scores.set2A}
                  onChange={handleScoreChange}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label={`Punti ${match?.teamB?.name}`}
                  name="set2B"
                  type="number"
                  fullWidth
                  required
                  value={scores.set2B}
                  onChange={handleScoreChange}
                />
              </Grid>
            </Grid>
            
            <Typography variant="subtitle2" gutterBottom>
              Set 3 (opzionale):
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label={`Punti ${match?.teamA?.name}`}
                  name="set3A"
                  type="number"
                  fullWidth
                  value={scores.set3A}
                  onChange={handleScoreChange}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label={`Punti ${match?.teamB?.name}`}
                  name="set3B"
                  type="number"
                  fullWidth
                  value={scores.set3B}
                  onChange={handleScoreChange}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseResultDialog}>
            Annulla
          </Button>
          <Button 
            onClick={handleSubmitResult} 
            variant="contained"
            disabled={submitLoading}
          >
            {submitLoading ? <CircularProgress size={24} /> : 'Invia Risultato'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Dialog per conferma/rifiuto risultato */}
      <Dialog open={openConfirmDialog} onClose={handleCloseConfirmDialog}>
        <DialogTitle>
          {confirmAction ? 'Conferma Risultato' : 'Rifiuta Risultato'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Stai {confirmAction ? 'confermando' : 'rifiutando'} il risultato per la squadra: {selectedTeam === match?.teamA?._id ? match?.teamA?.name : match?.teamB?.name}
          </DialogContentText>
          
          {!confirmAction && (
            <Alert severity="warning" sx={{ mt: 2, mb: 2 }}>
              Rifiutando il risultato, sarà necessario contattare l'altra squadra o il direttore di competizione per risolvere la discrepanza.
            </Alert>
          )}
          
          <TextField
            label="Password della Squadra"
            type="password"
            fullWidth
            required
            value={confirmTeamPassword}
            onChange={(e) => setConfirmTeamPassword(e.target.value)}
            sx={{ mt: 2 }}
            InputProps={{
              startAdornment: <LockIcon color="action" sx={{ mr: 1 }} />,
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfirmDialog}>
            Annulla
          </Button>
          <Button 
            onClick={handleConfirmResult} 
            variant="contained"
            color={confirmAction ? 'primary' : 'error'}
            disabled={submitLoading}
          >
            {submitLoading ? <CircularProgress size={24} /> : confirmAction ? 'Conferma' : 'Rifiuta'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default MatchDetails;
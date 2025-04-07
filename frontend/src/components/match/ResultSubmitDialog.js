// frontend/src/components/match/ResultSubmitDialog.js
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  TextField,
  Grid,
  Typography
} from '@mui/material';

const ResultSubmitDialog = ({
  open,
  onClose,
  selectedMatch,
  selectedTeam,
  teamPassword,
  setTeamPassword,
  scores,
  handleScoreChange,
  handleSubmitResult,
  submitLoading
}) => {
  if (!selectedMatch) return null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Inserisci risultato</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Stai inserendo il risultato come {
            selectedMatch.teamA?._id === selectedTeam 
              ? selectedMatch.teamA?.name 
              : selectedMatch.teamB?.name
          }.
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
              label={`${selectedMatch.teamA?.name} (A)`}
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
              label={`${selectedMatch.teamB?.name} (B)`}
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
              label={`${selectedMatch.teamA?.name} (A)`}
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
              label={`${selectedMatch.teamB?.name} (B)`}
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
              label={`${selectedMatch.teamA?.name} (A)`}
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
              label={`${selectedMatch.teamB?.name} (B)`}
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
        <Button onClick={onClose}>Annulla</Button>
        <Button 
          onClick={handleSubmitResult} 
          variant="contained" 
          disabled={submitLoading}
        >
          {submitLoading ? 'Invio in corso...' : 'Invia risultato'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ResultSubmitDialog;

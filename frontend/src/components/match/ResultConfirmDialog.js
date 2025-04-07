// frontend/src/components/match/ResultConfirmDialog.js
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  TextField
} from '@mui/material';

const ResultConfirmDialog = ({
  open,
  onClose,
  selectedMatch,
  selectedTeam,
  confirmTeamPassword,
  setConfirmTeamPassword,
  confirmAction,
  handleConfirmResult,
  submitLoading
}) => {
  if (!selectedMatch) return null;

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>
        {confirmAction ? 'Conferma risultato' : 'Rifiuta risultato'}
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          {confirmAction 
            ? `Stai confermando il risultato come ${
                selectedTeam === selectedMatch.teamA?._id 
                  ? selectedMatch.teamA?.name 
                  : selectedMatch.teamB?.name
              }.`
            : `Stai rifiutando il risultato come ${
                selectedTeam === selectedMatch.teamA?._id 
                  ? selectedMatch.teamA?.name 
                  : selectedMatch.teamB?.name
              }.`
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
        <Button onClick={onClose}>Annulla</Button>
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
  );
};

export default ResultConfirmDialog;

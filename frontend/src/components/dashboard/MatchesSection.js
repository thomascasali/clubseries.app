import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Paper,
  Typography,
  Box,
  Grid,
  Divider,
  CircularProgress,
  Alert,
  FormControlLabel,
  Switch,
  Button
} from '@mui/material';
import { CalendarMonth as CalendarIcon } from '@mui/icons-material';
import MatchGroupCard from './MatchGroupCard';

const MatchesSection = ({
  loading,
  error,
  groupedMatches,
  allMatches,
  showOnlySubscribed,
  subscribedTeams,
  handleToggleSubscribed,
  currentUser
}) => {
  // Verifica che i match raggruppati abbiano i Golden Set
  const checkGoldenSets = () => {
    if (!groupedMatches || groupedMatches.length === 0) return 0;
    return groupedMatches.filter(g => g.goldenSet).length;
  };
  
  const goldenSetsCount = checkGoldenSets();
  
  return (
    <Paper elevation={2} sx={{ p: 3, width:'100% !important' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box display="flex" alignItems="center">
          <CalendarIcon color="primary" sx={{ mr: 1 }} />
          <Typography variant="h6">Partite</Typography>
        </Box>
        
        {currentUser && subscribedTeams && subscribedTeams.length > 0 && (
          <FormControlLabel
            control={
              <Switch
                checked={showOnlySubscribed}
                onChange={handleToggleSubscribed}
                color="primary"
              />
            }
            label="Solo mie"
          />
        )}
      </Box>
      <Divider sx={{ mb: 2 }} />
      
      {loading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
          </Box>
            ) : error ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            ) : allMatches.length === 0 ? (
              // Se non ci sono partite in assoluto
              <Alert severity="info" sx={{ mb: 2 }}>
                Nessuna partita presente nel database
              </Alert>
            ) : groupedMatches.length === 0 ? (
              <Typography align="center" color="text.secondary" p={2}>
                {showOnlySubscribed ? 
                  "Nessuna partita recente o programmata per le tue squadre" : 
                  "Nessuna partita recente o programmata"
                }
              </Typography>
            ) : (
        <>
          <Grid container spacing={2}>
            {groupedMatches.map((group) => (
              <Grid item key={group.id}
                sx={{ width: {
                        xs: '100%',   // mobile → 1 per riga
                        md: '48%',  // desktop → 3 per riga con margine
                        lg: '31.5%'   // large screen → 4 per riga
                      }
                    }}          
              >
                <MatchGroupCard group={group} />
              </Grid>
            ))}
          </Grid>
        </>
      )}
      
      <Box display="flex" justifyContent="center" mt={2}>
        <Button 
          variant="contained" 
          component={RouterLink} 
          to="/matches"
        >
          Vedi tutte le partite
        </Button>
      </Box>
    </Paper>
  );
};

export default MatchesSection;
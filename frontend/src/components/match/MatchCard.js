// frontend/src/components/match/MatchCard.js
import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Divider,
  Button,
  Alert,
} from '@mui/material';
import {
  CalendarMonth as CalendarIcon,
  Place as PlaceIcon,
  EmojiEvents as ResultIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import moment from 'moment';
import { calculateSetResult, formatDetailedScore } from '../../components/dashboard/MatchUtils';
import { getMatchCardTitle, getMatchCardColor, getResultStatusText } from '../../utils/matchUtils';

const MatchCard = ({ 
  match, 
  teamType = null, 
  isGoldenSet = false,
  onOpenResultDialog,
  onOpenConfirmDialog
}) => {
  if (!match) return null;
  
  const setResult = calculateSetResult(match);
  const detailedScore = formatDetailedScore(match);
  const hasResult = match.officialScoreA && match.officialScoreA.length > 0;
  const awaitingConfirmation = hasResult && !(match.confirmedByTeamA && match.confirmedByTeamB);
  const statusText = getResultStatusText(match);
  const cardTitle = getMatchCardTitle(match, teamType, isGoldenSet);
  const cardColor = getMatchCardColor(teamType, isGoldenSet);

  return (
    <Card variant="outlined" sx={{ mb: 3, position: 'relative', bgcolor: cardColor }}>
      <CardContent>
        <Typography variant="h6" gutterBottom color="primary">
          {cardTitle}
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
                    onClick={() => onOpenConfirmDialog(match, match.teamA._id, true)}
                  >
                    Conferma come Team A
                  </Button>
                )}
                
                {!match.confirmedByTeamB && (
                  <Button 
                    variant="outlined" 
                    size="small"
                    startIcon={<LockIcon />}
                    onClick={() => onOpenConfirmDialog(match, match.teamB._id, true)}
                  >
                    Conferma come Team B
                  </Button>
                )}
                
                {match.confirmedByTeamA && !match.confirmedByTeamB && (
                  <Button 
                    variant="outlined" 
                    size="small"
                    color="error"
                    onClick={() => onOpenConfirmDialog(match, match.teamA._id, false)}
                  >
                    Rifiuta come Team A
                  </Button>
                )}
                
                {match.confirmedByTeamB && !match.confirmedByTeamA && (
                  <Button 
                    variant="outlined" 
                    size="small"
                    color="error"
                    onClick={() => onOpenConfirmDialog(match, match.teamB._id, false)}
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
                onClick={() => onOpenResultDialog(match, match.teamA._id)}
              >
                Inserisci come Team A
              </Button>
              
              <Button 
                variant="outlined" 
                startIcon={<ResultIcon />}
                onClick={() => onOpenResultDialog(match, match.teamB._id)}
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

export default MatchCard;

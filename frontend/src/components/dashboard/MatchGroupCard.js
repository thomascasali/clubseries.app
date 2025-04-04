
import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  Chip,
  Button
} from '@mui/material';
import moment from 'moment';
import 'moment/locale/it';
import { calculateSetResult, formatDetailedScore, determineGroupWinner } from './MatchUtils';
import { getCategoryChipStyles } from '../../utils/categoryUtils';

const MatchGroupCard = ({ group }) => {
  // Verifica la presenza del Golden Set
  const hasGoldenSet = !!group.goldenSet;
  
  const winner = determineGroupWinner(group);
  const areMatchesComplete = group.matches && group.matches.every(m => 
    m.officialResult && m.officialResult !== 'pending'
  );
  const hasGoldenSetResult = hasGoldenSet && 
    group.goldenSet.officialScoreA && 
    group.goldenSet.officialScoreB && 
    group.goldenSet.officialScoreA.length > 0;
  
  const matchDateTime = moment(`${group.date}T${group.time}`);
  const isRecent = matchDateTime.isBefore(moment()) && 
                  matchDateTime.isAfter(moment().subtract(2, 'hours'));

  // Debug log per verificare la presenza del Golden Set
  console.log(`Gruppo ${group.id}: Golden Set presente: ${hasGoldenSet}, con risultato: ${hasGoldenSetResult}`);
  
  return (
    <Card 
      variant="outlined" 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        backgroundColor: isRecent ? '#fff8e1' : 'white' // Colore di sfondo giallo per partite recenti
      }}
    >
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

        {/* Nomi delle squadre principali */}
        <Typography 
          variant="h6" 
          component="div" 
          sx={{ 
            fontWeight: 'bold', 
            mb: 2, 
            fontSize: { xs: '0.95rem', sm: '1.25rem' }
          }}
        >
          {group.teamA.name}<br/>
          {group.teamB.name}
        </Typography>
        
        {/* Elenco dei match */}
        <Box sx={{ mb: 2, minWidth: { sm: '300px', md: '500px' } }}>
          {group.matches.map((match, index) => {
            // Controlliamo se è un match realmente disputato o solo un placeholder (0-0)
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
                    fontSize: { xs: '0.8rem', sm: '0.875rem' }
                  }}
                >
                  <span>Team {match.teamACode} vs Team {match.teamBCode}</span>
                  {setResult ? (
                    <span style={{ 
                      fontWeight: 'bold', 
                      fontSize: { xs: '1em', sm: '1.2em' }
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
                  ) : (
                    <span style={{ 
                      color: 'text.secondary', 
                      fontStyle: 'italic', 
                      fontSize: '0.8em' 
                    }}>
                      Non disputato
                    </span>
                  )}
                </Typography>
              </Box>
            );
          })}
          
          {/* Golden Set */}
          {group.goldenSet && (
            <Box sx={{ mt: 1, pt: 1, borderTop: '1px dashed #eee' }}>
              <Typography variant="body2" sx={{ 
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: { xs: '0.8rem', sm: '0.875rem' }
              }}>
                <span style={{ fontWeight: 'bold' }}>Golden Set</span>
                {group.goldenSet.officialScoreA && 
                group.goldenSet.officialScoreB && 
                group.goldenSet.officialScoreA.length > 0 &&
                !(group.goldenSet.officialScoreA.length === 1 && 
                  group.goldenSet.officialScoreA[0] === '0' && 
                  group.goldenSet.officialScoreB[0] === '0') ? (
                  <span style={{ fontWeight: 'bold', fontSize: '1.1em' }}>
                    {group.goldenSet.officialScoreA[0]}-{group.goldenSet.officialScoreB[0]}
                  </span>
                ) : (
                  <span style={{ color: 'text.secondary', fontStyle: 'italic' }}>
                    Non disputato
                  </span>
                )}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Risultato finale */}
        {(areMatchesComplete || hasGoldenSetResult) && winner && (
          <Box sx={{ 
            mt: 1, 
            pt: { xs: 1, sm: 2 },
            borderTop: '1px solid #eee', 
            backgroundColor: 'lightgreen', 
            p: { xs: 0.75, sm: 1 },
            borderRadius: '4px'
          }}>
            <Typography 
              variant="subtitle1" 
              sx={{ 
                fontWeight: 'bold',
                fontSize: { xs: '0.9rem', sm: '1rem' }
              }}
            >
              VINCE: {winner.name}
            </Typography>
            {/* Mostra come è stata decisa la vittoria */}
            {hasGoldenSetResult ? (
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
              >
                Sfida decisa al Golden Set
              </Typography>
            ) : (
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
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
        {group.matches && group.matches.length > 0 && (
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
  );
};

export default MatchGroupCard;
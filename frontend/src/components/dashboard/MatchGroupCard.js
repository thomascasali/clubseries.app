// src/components/dashboard/MatchGroupCard.js

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
// Assicurati che questo import punti al file MatchGroupUtils.js finale!
import { calculateSetResult, formatDetailedScore, determineGroupWinner } from './MatchGroupUtils';
import { getCategoryChipStyles } from '../../utils/categoryUtils';

const MatchGroupCard = ({ group }) => {
  // Verifica la presenza del Golden Set
  const hasGoldenSet = !!group?.goldenSet;

  // Determina vincitore (usa la funzione da MatchGroupUtils)
  const winner = determineGroupWinner(group);

  // Controlla se tutti i match normali sono completi
  const areMatchesComplete = group?.matches?.every(m =>
     !m.isGoldenSet && m.officialResult && m.officialResult !== 'pending'
  );
  // Controlla se il golden set ha un risultato valido
  const hasGoldenSetResult = hasGoldenSet &&
      group.goldenSet.officialScoreA?.length > 0 &&
      !(group.goldenSet.officialScoreA.length === 1 &&
        group.goldenSet.officialScoreA[0] === '0' &&
        group.goldenSet.officialScoreB?.[0] === '0'); // Ignora 0-0 nel golden set

  // Calcola se la partita è recente (ultime 2 ore)
  const matchDateTime = group?.date && group.time ? moment(`${group.date}T${group.time}`) : null;
  const isRecent = matchDateTime?.isValid() &&
                   matchDateTime.isBefore(moment()) &&
                   matchDateTime.isAfter(moment().subtract(2, 'hours'));

  // Fallback per dati mancanti
  const categoryLabel = group?.category || 'N/A';
  // *** USA displayPhase INVECE di phase ***
  const phaseLabel = group?.displayPhase || 'N/A';
  const dateLabel = matchDateTime?.isValid() ? matchDateTime.format('DD MMMM') : 'Data N/D';
  const timeLabel = group?.time || 'Ora N/D';
  const courtLabel = group?.court || 'N/D';
  const teamAName = group?.teamA?.name || 'Team A N/D';
  const teamBName = group?.teamB?.name || 'Team B N/D';

  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: isRecent ? '#fff8e1' : 'white'
      }}
    >
      <CardContent sx={{ flexGrow: 1, pb: 1, minWidth: 440}}>
        <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          {/* Chip Categoria */}
          <Chip
            label={categoryLabel}
            size="small"
            color="primary"
            variant="outlined"
            sx={{ ...getCategoryChipStyles(categoryLabel) }}
          />
          {/* Chip Fase (displayPhase) */}
          <Chip
            label={phaseLabel} // <-- Modifica chiave: usa displayPhase
            size="small"
            variant="outlined"
          />
        </Box>
         {/* Info Data/Ora/Campo */}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, width: '100%', fontSize: '0.8rem' }}>
             {dateLabel} - {timeLabel} - Campo: {courtLabel}
           </Typography>

        {/* Nomi Squadre Principali */}
        <Typography
          variant="h6"
          component="div"
          sx={{
            fontWeight: 'bold',
            mb: 1.5,
            fontSize: { xs: '0.95rem', sm: '1.15rem' }, // Leggermente ridotto
            lineHeight: 1.3 // Migliora leggibilità se nomi lunghi vanno a capo
          }}
        >
          {teamAName}<br/>
          {teamBName}
        </Typography>

        {/* Elenco dei match (A vs A, B vs B) */}
        <Box sx={{ mb: 1.5 }}>
          {group?.matches?.filter(m => !m.isGoldenSet).map((match) => { // Filtra esplicitamente Golden Set qui
            const isRealScore = match.officialScoreA?.length > 0 &&
                                !(match.officialScoreA.length === 1 && match.officialScoreA[0] === '0' && match.officialScoreB?.[0] === '0');

            const setResult = isRealScore ? calculateSetResult(match) : '';
            const detailedScore = isRealScore ? formatDetailedScore(match) : '';

            // Determina etichette A/B (più generico)
            const matchLabel = `Match ${match.teamACode || ''}${match.teamACode && match.teamBCode ? ' vs ' : ''}${match.teamBCode || ''}`;

            return (
              <Box key={match._id} sx={{ mb: 0.5 }}> {/* Riduci margine */}
                <Typography
                  variant="body2"
                  sx={{
                    display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1,
                    fontSize: { xs: '0.8rem', sm: '0.875rem' }
                  }}
                >
                  {/* Etichetta Match (es. Match A vs A) */}
                  <span style={{ opacity: 0.8 }}>{matchLabel}</span>

                  {/* Risultato */}
                  {setResult ? (
                    <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                      {setResult}
                      {detailedScore && (
                        <span style={{ fontWeight: 'normal', fontSize: '0.8em', color: 'text.secondary', marginLeft: '5px' }}>
                          ({detailedScore})
                        </span>
                      )}
                    </span>
                  ) : (
                    <span style={{ color: 'text.secondary', fontStyle: 'italic', fontSize: '0.8em' }}>
                      Non disp.
                    </span>
                  )}
                </Typography>
              </Box>
            );
          })}

          {/* Golden Set */}
          {hasGoldenSet && (
            <Box sx={{ mt: 1, pt: 0.5, borderTop: '1px dashed #eee' }}>
              <Typography variant="body2" sx={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  fontSize: { xs: '0.8rem', sm: '0.875rem' }
              }}>
                <span style={{ fontWeight: 'bold', color: '#c77700' }}>Golden Set</span>
                {hasGoldenSetResult ? (
                  <span style={{ fontWeight: 'bold', fontSize: '1.1em' }}>
                    {group.goldenSet.officialScoreA[0]}-{group.goldenSet.officialScoreB[0]}
                  </span>
                ) : (
                  <span style={{ color: 'text.secondary', fontStyle: 'italic', fontSize: '0.8em' }}>
                    Non disp.
                  </span>
                )}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Risultato Finale Gruppo */}
        {(areMatchesComplete || hasGoldenSetResult) && winner && (
          <Box sx={{
              mt: 'auto', // Spinge in basso se c'è spazio
              pt: 1, borderTop: '1px solid #eee',
              backgroundColor: '#e8f5e9', // Verde chiaro
              mx: -2, mb: -1, px: 2, py: 0.5, // Occupa tutta larghezza e aggiusta padding
              borderBottomLeftRadius: '4px', borderBottomRightRadius: '4px' // Arrotonda angoli bassi
          }}>
            <Typography
              variant="body1" // Leggermente più piccolo
              sx={{ fontWeight: 'bold', fontSize: { xs: '0.9rem', sm: '0.95rem' }, textAlign: 'center' }}
            >
              🏆 Vince: {winner.name}
               {/* Mostra dettaglio vittoria (opzionale) */}
               {/* <span style={{ fontSize: '0.8em', fontWeight: 'normal', marginLeft: '5px', opacity: 0.8 }}>
                 ({hasGoldenSetResult ? 'al Golden Set' : determineGroupScore(group, winner)})
               </span> */}
            </Typography>
          </Box>
        )}
      </CardContent>

      {/* Azioni Card (Link Dettagli) */}
       {/* Metti il link fuori dal content per non essere coperto dal box vincitore */}
       <CardActions sx={{ justifyContent: 'flex-end', pt: 0, pb: 1, px: 2 }}>
         {/* Link al primo match del gruppo come dettaglio generico */}
         {group?.matches?.[0]?._id && (
           <Button
             size="small"
             component={RouterLink}
             to={`/matches/${group.matches[0]._id}`} // Usare ID del gruppo (relatedMatchId) sarebbe forse meglio?
                                                     // to={`/group/${group.id}`} se hai una route per i gruppi
           >
             Dettagli
           </Button>
         )}
       </CardActions>
    </Card>
  );
};

// Funzione helper (opzionale) per mostrare il punteggio del gruppo (es. 2-1)
// const determineGroupScore = (group, winner) => {
//    let wins = 0;
//    let losses = 0;
//     group.matches.forEach(match => {
//        if (!match.isGoldenSet && match.officialResult && match.officialResult !== 'pending') {
//           const matchWinnerIsGroupWinner = (match.officialResult === 'teamA' && winner._id === group.teamA._id) ||
//                                           (match.officialResult === 'teamB' && winner._id === group.teamB._id);
//           if (matchWinnerIsGroupWinner) wins++; else losses++;
//        }
//     });
//     return `${wins}-${losses}`;
// }

export default MatchGroupCard;
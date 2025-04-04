import React, { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Chip,
  Paper,
} from '@mui/material';
import { getTeams } from '../services/teamService';
import { getCategoryChipStyles } from '../utils/categoryUtils';

const Teams = () => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const categories = [
    'Eccellenza F',
    'Eccellenza M',
    'Amatoriale F',
    'Amatoriale M',
    'Over 35 F',
    'Over 40 F',
    'Over 43 M',
    'Over 50 M',
    'Under 21 F',
    'Under 21 M',
    'Serie A Femminile',
    'Serie B Femminile',
    'Serie A Maschile',
    'Serie B Maschile',
  ];

  useEffect(() => {
    const loadTeams = async () => {
      setLoading(true);
      setError('');

      try {
        // Utilizziamo l'API reale invece dei dati di esempio
        const fetchedTeams = await getTeams();
        setTeams(fetchedTeams);
      } catch (err) {
        console.error('Error loading teams:', err);
        setError(err.message || 'Errore durante il caricamento delle squadre');
      } finally {
        setLoading(false);
      }
    };

    loadTeams();
  }, []);

  // Filtra le squadre in base alla categoria selezionata
  const filteredTeams = categoryFilter
    ? teams.filter(team => team.category === categoryFilter)
    : teams;

  return (
    <Container maxWidth="lg">
      <Box py={3}>
        <Typography variant="h4" gutterBottom>
          Squadre
        </Typography>

        <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
          <FormControl fullWidth>
            <InputLabel>Filtra per categoria</InputLabel>
            <Select
              value={categoryFilter}
              label="Filtra per categoria"
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <MenuItem value="">
                <em>Tutte le categorie</em>
              </MenuItem>
              {categories.map((category) => (
                <MenuItem key={category} value={category}>
                  {category}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Paper>

        {loading ? (
          <Box display="flex" justifyContent="center" p={5}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        ) : filteredTeams.length === 0 ? (
          <Paper elevation={1} sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              Nessuna squadra trovata
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Prova a modificare i filtri di ricerca
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {filteredTeams.map((team) => (
              <Grid item xs={12} sm={6} md={4} key={team._id}>
                <Card variant="outlined" sx={{ height: '100%', minWidth: 368,  display: 'flex', flexDirection: 'column', mb: 0 }}>
                  <CardContent sx={{ flexGrow: 1, pb: 1 }}> {/* Ridotto padding bottom */}
                    <Chip 
                      label={team.category} 
                      size="small" 
                      color="primary" 
                      variant="outlined"
                      sx={{
                        ...getCategoryChipStyles(team.category),
                        mb: 1.5, // Margine sotto la chip
                      }} 
                    />
                    <Typography variant="subtitle1">{team.name}</Typography>
                  </CardContent>
                  <CardActions sx={{ pt: 0, pb: 1, px: 2 }}> {/* Aggiunto padding orizzontale e verticale */}
                    <Button 
                      size="small" 
                      component={RouterLink} 
                      to={`/teams/${team._id}`}
                      sx={{ mt: 0 }} // Margine sopra il button
                    >
                      Dettagli
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Container>
  );
};

export default Teams;
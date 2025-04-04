import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Paper,
  Typography,
  Box,
  Divider,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Chip,
  Button
} from '@mui/material';
import { Groups as TeamIcon } from '@mui/icons-material';
import { getCategoryChipStyles } from '../../utils/categoryUtils';

const TeamsSection = ({ loading, error, subscribedTeams }) => {
  return (
    <Paper elevation={2}>
      <Box p={2} display="flex" alignItems="center">
        <TeamIcon color="primary" sx={{ mr: 1 }} />
        <Typography variant="h6">Le Tue Squadre</Typography>
      </Box>
      <Divider />
      <Box p={2}>
        {loading ? (
          <Box display="flex" justifyContent="center" p={2}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : subscribedTeams.length === 0 ? (
          <Typography align="center" color="text.secondary" p={2}>
            Non hai sottoscritto alcuna squadra
          </Typography>
        ) : (
          subscribedTeams.map((team) => (
            <Card key={team._id} variant="outlined" sx={{ mb: 0, mt: 0, minWidth: 310 }}>
              <CardContent>
                <Chip 
                  label={team.category} 
                  size="small" 
                  color="primary" 
                  variant="outlined"
                  sx={{
                    ...getCategoryChipStyles(team.category),
                    mb: 0.5, // Margine sotto la chip
                  }} 
                />
                <Typography variant="subtitle1">{team.name}</Typography>
              </CardContent>
            </Card>
          ))
        )}
        <Button 
          variant="outlined" 
          fullWidth 
          component={RouterLink} 
          to="/subscriptions"
          sx={{ mt: 1 }}
        >
          Gestisci sottoscrizioni
        </Button>
      </Box>
    </Paper>
  );
};

export default TeamsSection;
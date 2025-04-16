import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Paper,
  Typography,
  Box,
  Button
} from '@mui/material';

const SignupPrompt = () => {
  return (
    <Paper elevation={2} sx={{ p: 3, mt: 2 }}>
      <Typography variant="h6" gutterBottom align="center">
        Registrati per ricevere notifiche sulle partite
      </Typography>
      <Typography variant="body1" paragraph align="center">
        Vuoi ricevere aggiornamenti in tempo reale sulle partite delle tue squadre preferite?
      </Typography>
      <Box display="flex" justifyContent="center" mt={2}>
        <Button
          variant="contained"
          component={RouterLink}
          to="/register"
          sx={{ mr: 2 }}
        >
          Registrati
        </Button>
        <Button
          variant="outlined"
          component={RouterLink}
          to="/login"
        >
          Accedi
        </Button>
      </Box>
    </Paper>
  );
};

export default SignupPrompt;

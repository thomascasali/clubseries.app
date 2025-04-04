import React, { useState, useContext } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Box,
  Avatar,
  Typography,
  TextField,
  Button,
  Grid,
  Link,
  Paper,
  CircularProgress,
  Alert,
  FormControlLabel,
  Checkbox,
  FormHelperText
} from '@mui/material';
import { PersonAddOutlined } from '@mui/icons-material';
import { AuthContext } from '../../context/AuthContext';

const Register = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [privacyError, setPrivacyError] = useState('');
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const validateForm = () => {
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phoneNumber || !formData.password) {
      setError('Per favore compila tutti i campi obbligatori');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Le password non coincidono');
      return false;
    }

    if (formData.password.length < 6) {
      setError('La password deve essere di almeno 6 caratteri');
      return false;
    }

    // Validazione email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Inserisci un indirizzo email valido');
      return false;
    }

    // Validazione numero di telefono (semplice)
    const phoneRegex = /^\+?[0-9\s()-]{8,}$/;
    if (!phoneRegex.test(formData.phoneNumber)) {
      setError('Inserisci un numero di telefono valido');
      return false;
    }

    // Validazione privacy policy
    if (!privacyAccepted) {
      setPrivacyError('Devi accettare la privacy policy per continuare');
      return false;
    } else {
      setPrivacyError('');
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setPrivacyError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email.toLowerCase(),
        phoneNumber: formData.phoneNumber,
        password: formData.password,
      });
      navigate('/');
    } catch (error) {
      setError(error.message || 'Errore durante la registrazione. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="sm" sx={{ px: { xs: 2, sm: 3 } }}>
        <Paper
          elevation={3}
          sx={{
            marginTop: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: { xs: 2, sm: 3 },
            marginBottom: 4,
            borderRadius: 2,
            width: '100%' // Assicura che il Paper stesso occupi tutta la larghezza
          }}
        >
        <Avatar sx={{ m: 1, bgcolor: 'secondary.main', width: 56, height: 56 }}>
          <PersonAddOutlined fontSize="large" />
        </Avatar>
        <Typography component="h1" variant="h5" sx={{ mb: 2 }}>
          Registrati
        </Typography>
        {error && (
          <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
            {error}
          </Alert>
        )}
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ width: '100%', maxWidth: '100%' }}>
          <Grid container spacing={2} sx={{ width: '100%', m: 0 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                autoComplete="given-name"
                name="firstName"
                required
                fullWidth
                id="firstName"
                label="Nome"
                autoFocus
                value={formData.firstName}
                onChange={handleChange}
                sx={{ mb: { xs: 0 } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                id="lastName"
                label="Cognome"
                name="lastName"
                autoComplete="family-name"
                value={formData.lastName}
                onChange={handleChange}
                sx={{ mb: { xs: 0 } }}
              />
            </Grid>
            <Grid item xs={12} sx={{ px: 0 }}>
              <TextField
                required
                fullWidth
                id="email"
                label="Email"
                name="email"
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                sx={{ width: '100%' }}
              />
            </Grid>
            <Grid item xs={12} sx={{ px: 0 }}>
              <TextField
                required
                fullWidth
                id="phoneNumber"
                label="Numero di telefono (per WhatsApp)"
                name="phoneNumber"
                autoComplete="tel"
                value={formData.phoneNumber}
                onChange={handleChange}
                helperText="Il numero deve essere abilitato per WhatsApp"
                sx={{ width: '100%' }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                name="password"
                label="Password"
                type="password"
                id="password"
                autoComplete="new-password"
                value={formData.password}
                onChange={handleChange}
                sx={{ mb: { xs: 0 } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                name="confirmPassword"
                label="Conferma Password"
                type="password"
                id="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                sx={{ mb: { xs: 0 } }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox 
                    value="privacy" 
                    color="primary" 
                    checked={privacyAccepted}
                    onChange={(e) => setPrivacyAccepted(e.target.checked)}
                  />
                }
                label={
                  <Typography variant="body2">
                    Accetto la <Link component={RouterLink} to="/privacy-policy">Privacy Policy</Link> e acconsento al trattamento dei miei dati per ricevere notifiche WhatsApp e newsletter AIBVC
                  </Typography>
                }
              />
              {privacyError && (
                <FormHelperText error>{privacyError}</FormHelperText>
              )}
            </Grid>
          </Grid>
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2, py: 1.5, fontSize: '1rem' }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'REGISTRATI'}
          </Button>
          <Grid container justifyContent="center">
            <Grid item>
              <Link component={RouterLink} to="/login" variant="body2">
                Hai già un account? Accedi
              </Link>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Container>
  );
};

export default Register;
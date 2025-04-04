import React from 'react';
import { Container, Typography, Box, Paper, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: { xs: 2, sm: 4 }, my: 4, borderRadius: 2 }}>
        <Box sx={{ mb: 4 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(-1)}
            sx={{ mb: 2 }}
          >
            Torna indietro
          </Button>

          <Typography variant="h4" component="h1" gutterBottom>
            Privacy Policy
          </Typography>
          
          <Typography variant="subtitle1" color="text.secondary" paragraph>
            Ultimo aggiornamento: {new Date().toLocaleDateString('it-IT')}
          </Typography>

          <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 4 }}>
            Informativa sul trattamento dei dati personali
          </Typography>

          <Typography paragraph>
            La presente informativa descrive come AIBVC (Associazione Italiana Beach Volley Club) raccoglie e utilizza i dati personali forniti dagli utenti attraverso la piattaforma ClubSeries.app.
          </Typography>

          <Typography variant="h6" component="h3" gutterBottom sx={{ mt: 3 }}>
            1. Titolare del trattamento
          </Typography>
          <Typography paragraph>
            Il titolare del trattamento dei dati è AIBVC - Associazione Italiana Beach Volley Club, con sede in [inserire indirizzo], email: [inserire email].
          </Typography>

          <Typography variant="h6" component="h3" gutterBottom sx={{ mt: 3 }}>
            2. Dati raccolti
          </Typography>
          <Typography paragraph>
            Raccogliamo i seguenti dati personali:
          </Typography>
          <Typography component="ul" sx={{ pl: 2 }}>
            <li>Nome e cognome</li>
            <li>Indirizzo email</li>
            <li>Numero di telefono (per invio notifiche WhatsApp)</li>
            <li>Dati relativi alle preferenze per le squadre di beach volley</li>
          </Typography>

          <Typography variant="h6" component="h3" gutterBottom sx={{ mt: 3 }}>
            3. Finalità del trattamento
          </Typography>
          <Typography paragraph>
            I dati personali sono raccolti per le seguenti finalità:
          </Typography>
          <Typography component="ul" sx={{ pl: 2 }}>
            <li>Creazione e gestione dell'account utente</li>
            <li>Invio di notifiche relative alle partite delle squadre selezionate</li>
            <li>Invio di notifiche tramite WhatsApp riguardanti aggiornamenti sulle partite, risultati e modifiche della programmazione</li>
            <li>Invio della newsletter AIBVC con aggiornamenti sulle competizioni e informazioni sul beach volley</li>
          </Typography>

          <Typography variant="h6" component="h3" gutterBottom sx={{ mt: 3 }}>
            4. Base giuridica del trattamento
          </Typography>
          <Typography paragraph>
            La base giuridica del trattamento dei dati è il consenso espresso dell'utente al momento della registrazione. L'utente può revocare il consenso in qualsiasi momento.
          </Typography>

          <Typography variant="h6" component="h3" gutterBottom sx={{ mt: 3 }}>
            5. Conservazione dei dati
          </Typography>
          <Typography paragraph>
            I dati personali saranno conservati per il tempo necessario al raggiungimento delle finalità per cui sono stati raccolti e comunque non oltre 24 mesi dall'ultimo accesso dell'utente alla piattaforma.
          </Typography>

          <Typography variant="h6" component="h3" gutterBottom sx={{ mt: 3 }}>
            6. Condivisione dei dati
          </Typography>
          <Typography paragraph>
            I dati personali potranno essere condivisi con:
          </Typography>
          <Typography component="ul" sx={{ pl: 2 }}>
            <li>Fornitori di servizi di messaggistica (WhatsApp) per l'invio di notifiche</li>
            <li>Fornitori di servizi tecnici che assistono nella gestione della piattaforma</li>
          </Typography>
          <Typography paragraph>
            Non vendiamo né affittiamo i tuoi dati personali a terzi per finalità di marketing.
          </Typography>

          <Typography variant="h6" component="h3" gutterBottom sx={{ mt: 3 }}>
            7. Diritti dell'utente
          </Typography>
          <Typography paragraph>
            Gli utenti hanno il diritto di:
          </Typography>
          <Typography component="ul" sx={{ pl: 2 }}>
            <li>Accedere ai propri dati personali</li>
            <li>Richiedere la rettifica dei dati inesatti</li>
            <li>Richiedere la cancellazione dei dati</li>
            <li>Limitare il trattamento dei dati</li>
            <li>Opporsi al trattamento dei dati</li>
            <li>Richiedere la portabilità dei dati</li>
            <li>Revocare il consenso al trattamento dei dati</li>
          </Typography>
          <Typography paragraph>
            Per esercitare questi diritti, contattare AIBVC all'indirizzo email: [inserire email].
          </Typography>

          <Typography variant="h6" component="h3" gutterBottom sx={{ mt: 3 }}>
            8. Sicurezza dei dati
          </Typography>
          <Typography paragraph>
            Adottiamo misure di sicurezza tecniche e organizzative per proteggere i dati personali da accessi non autorizzati, perdite o alterazioni.
          </Typography>

          <Typography variant="h6" component="h3" gutterBottom sx={{ mt: 3 }}>
            9. Modifiche alla privacy policy
          </Typography>
          <Typography paragraph>
            AIBVC si riserva il diritto di modificare questa privacy policy in qualsiasi momento. Le modifiche saranno pubblicate su questa pagina e, se significative, comunicate via email.
          </Typography>

          <Typography variant="h6" component="h3" gutterBottom sx={{ mt: 3 }}>
            10. Contatti
          </Typography>
          <Typography paragraph>
            Per qualsiasi domanda riguardante questa privacy policy o il trattamento dei dati personali, contattare AIBVC all'indirizzo email: [inserire email].
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default PrivacyPolicy;

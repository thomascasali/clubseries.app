import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/common/PrivateRoute';
import { requestNotificationPermission, setOnMessageHandler } from './services/firebaseService';

// Layouts
import MainLayout from './components/layout/MainLayout';

// Pages
import Dashboard from './pages/Dashboard';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Matches from './pages/Matches';
import MatchDetails from './pages/match/MatchDetails';
import Teams from './pages/Teams';
import Subscriptions from './pages/Subscriptions';
import Notifications from './pages/notifications/Notifications';
import PrivacyPolicy from './pages/PrivacyPolicy';
import NotificationsDebug from './pages/NotificationsDebug';

// Placeholder pages for routes that will be implemented later
const Profile = () => <div>Profile Page</div>;

// Tema
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
});

function App() {
  useEffect(() => {
    // Configurazione delle notifiche FCM
    const setupNotifications = async () => {
      try {
        // Richiedi permesso solo se l'utente è autenticato
        if (localStorage.getItem('token')) {
          await requestNotificationPermission();
          
          // Configura handler per notifiche in foreground
          setOnMessageHandler((payload) => {
            console.log('Notifica ricevuta:', payload);
            const { notification } = payload;
            
            toast.info(notification.body, {
              position: "bottom-right",
              autoClose: 5000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
              onClick: () => {
                // Naviga alla pagina appropriata in base al tipo di notifica
                const data = payload.data;
                if (data && data.matchId) {
                  window.location.href = `/matches/${data.matchId}`;
                } else if (data && data.type === 'match_scheduled') {
                  window.location.href = '/matches';
                } else {
                  window.location.href = '/notifications';
                }
              }
            });
          });
        }
      } catch (error) {
        console.error('Errore nella configurazione delle notifiche:', error);
      }
    };
    
    setupNotifications();
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <ToastContainer position="bottom-right" autoClose={5000} />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="debug/notifications" element={<PrivateRoute><NotificationsDebug /></PrivateRoute>
  } 
/>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="matches" element={<Matches />} />
              <Route path="teams" element={<Teams />} />
              <Route path="matches/:id" element={<MatchDetails />} />

              {/* Rotte protette (solo per utenti autenticati) */}
              <Route 
                path="profile" 
                element={
                  <PrivateRoute>
                    <Profile />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="subscriptions" 
                element={
                  <PrivateRoute>
                    <Subscriptions />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="notifications" 
                element={
                  <PrivateRoute>
                    <Notifications />
                  </PrivateRoute>
                } 
              />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
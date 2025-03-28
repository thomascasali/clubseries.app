import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/common/PrivateRoute';

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
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <ToastContainer position="bottom-right" autoClose={5000} />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            <Route path="/" element={<MainLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="matches" element={<Matches />} />
              <Route path="teams" element={<Teams />} />
              <Route path="matches" element={<Matches />} />
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

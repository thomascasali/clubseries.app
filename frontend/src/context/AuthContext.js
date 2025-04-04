import React, { createContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { loginUser, registerUser, getCurrentUser } from '../services/authService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Verifica se c'è un token nel localStorage
    const token = localStorage.getItem('token');
    if (token) {
      try {
        // Decodifica il token per verificare se è scaduto
        const decoded = jwtDecode(token);
        const currentTime = Date.now() / 1000;
        
        if (decoded.exp < currentTime) {
          // Token scaduto
          localStorage.removeItem('token');
          setCurrentUser(null);
          setIsLoading(false);
          return;
        }
        
        // Carica i dati dell'utente corrente
        loadUser();
      } catch (error) {
        console.error('Error decoding token:', error);
        localStorage.removeItem('token');
        setCurrentUser(null);
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  const loadUser = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const userData = await getCurrentUser();
      setCurrentUser(userData);
    } catch (error) {
      console.error('Error loading user:', error);
      setError(error.message || 'Error loading user data');
      localStorage.removeItem('token');
      setCurrentUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email, password) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await loginUser(email, password);
      localStorage.setItem('token', data.token);
      setCurrentUser(data);
      return data;
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message || 'Login failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await registerUser(userData);
      localStorage.setItem('token', data.token);
      setCurrentUser(data);
      return data;
    } catch (error) {
      console.error('Registration error:', error);
      setError(error.message || 'Registration failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isLoading,
        error,
        login,
        register,
        logout,
        loadUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

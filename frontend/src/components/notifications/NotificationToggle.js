import React, { useState, useEffect } from 'react';
import { requestNotificationPermission, unregisterToken } from '../../services/firebaseService';

const NotificationToggle = ({ style }) => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Controlla se le notifiche sono già attive
    const checkNotificationStatus = () => {
      // Verifica se il browser supporta le notifiche
      if (!('Notification' in window)) {
        console.log('Questo browser non supporta le notifiche desktop');
        return;
      }
      
      setIsSubscribed(Notification.permission === 'granted');
    };
    
    checkNotificationStatus();
  }, []);

  const handleToggleNotifications = async () => {
    setLoading(true);
    
    try {
      if (isSubscribed) {
        // Disattiva le notifiche
        await unregisterToken();
        setIsSubscribed(false);
      } else {
        // Attiva le notifiche
        const token = await requestNotificationPermission();
        setIsSubscribed(!!token);
      }
    } catch (error) {
      console.error('Errore nella gestione delle notifiche:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handleToggleNotifications}
      disabled={loading}
      className={`px-4 py-2 rounded-md transition-colors ${
        isSubscribed 
          ? 'bg-green-600 hover:bg-green-700 text-white' 
          : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
      }`}
      style={style}
    >
      {loading ? 'Caricamento...' : (isSubscribed ? '🔔 Notifiche attive' : '🔕 Attiva notifiche')}
    </button>
  );
};

export default NotificationToggle;

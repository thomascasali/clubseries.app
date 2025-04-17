import React, { useState, useEffect } from 'react';
import { requestNotificationPermission, unregisterToken, isNotificationsSupported, isSafariBrowser } from '../../services/firebaseService';

const NotificationToggle = ({ style }) => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    // Controlla se le notifiche sono già attive e supportate
    const checkNotificationStatus = async () => {
      // Verifica se il browser supporta le notifiche
      const supported = await isNotificationsSupported();
      setIsSupported(supported);
      
      if (!supported) {
        console.log('Questo browser non supporta le notifiche push di Firebase');
        return;
      }
      
      setIsSubscribed(Notification.permission === 'granted');
    };
    
    checkNotificationStatus();
  }, []);

  const handleToggleNotifications = async () => {
    if (!isSupported) {
      // Se non supportato, mostra un messaggio
      alert('Il tuo browser non supporta le notifiche push di Firebase. Per ricevere notifiche, utilizza Chrome, Firefox o Edge.');
      return;
    }
    
    setLoading(true);
    
    try {
      if (isSubscribed) {
        // Disattiva le notifiche
        const success = await unregisterToken();
        if (success) {
          setIsSubscribed(false);
        }
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

  // Rileva Safari
  const isSafari = isSafariBrowser();

  return (
    <div>
      <button 
        onClick={handleToggleNotifications}
        disabled={loading || !isSupported}
        className={`px-4 py-2 rounded-md transition-colors ${
          !isSupported 
            ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
            : isSubscribed 
              ? 'bg-green-600 hover:bg-green-700 text-white' 
              : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
        }`}
        style={style}
      >
        {loading ? 'Caricamento...' : 
          !isSupported ? '🔕 Notifiche non supportate' : 
          (isSubscribed ? '🔔 Notifiche attive' : '🔕 Attiva notifiche')}
      </button>
      
      {isSafari && !isSupported && (
        <div className="mt-2 text-sm text-orange-500">
          Safari non supporta completamente le notifiche push. Per ricevere notifiche, utilizza Chrome, Firefox o Edge.
        </div>
      )}
    </div>
  );
};

export default NotificationToggle;
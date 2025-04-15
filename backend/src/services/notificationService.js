const Notification = require('../models/Notification');
const logger = require('../config/logger');
const fcmService = require('./fcmService');

/**
 * Processa le notifiche in sospeso e le invia
 */
exports.processNotifications = async () => {
  try {
    // Trova tutte le notifiche in sospeso
    const pendingNotifications = await Notification.find({ status: 'pending' })
      .populate('user', 'firstName lastName phoneNumber fcmTokens')
      .populate('team', 'name category')
      .populate({
        path: 'match',
        populate: [
          { path: 'teamA', select: 'name' },
          { path: 'teamB', select: 'name' }
        ]
      });
    
      if (pendingNotifications.length > 0) {
        logger.info(`Elaborazione di ${pendingNotifications.length} notifiche in sospeso`);
        
        // Log dettagliato dei tipi di notifiche
        const notificationTypes = {};
        pendingNotifications.forEach(notification => {
          const type = notification.type || 'unknown';
          notificationTypes[type] = (notificationTypes[type] || 0) + 1;
        });
        logger.info(`Tipi di notifiche: ${JSON.stringify(notificationTypes)}`);
      } else {
        return; // Nessuna notifica da processare, usciamo silenziosamente
      }
    
    let successCount = 0;
    let failedCount = 0;
    

    for (const notification of pendingNotifications) {
      try {
        // Preparazione notifica FCM
        const notificationTitle = getNotificationTitle(notification.type, notification.message);
        const messageLines = notification.message.split('\n');
        const notificationBody = messageLines[0] + (messageLines.length > 1 ? '...' : '');
        
        // Verifica se l'utente ha token FCM registrati
        if (notification.user && notification.user.fcmTokens && notification.user.fcmTokens.length > 0) {
          // Invia notifica FCM
          const fcmNotification = {
            title: notificationTitle,
            body: notificationBody
          };
          
          const data = {
            type: notification.type,
            teamId: notification.team ? notification.team._id.toString() : '',
            matchId: notification.match ? notification.match._id.toString() : '',
            fullMessage: notification.message
          };
          
          await fcmService.sendToDevices(
            notification.user.fcmTokens, 
            fcmNotification, 
            data,
            notification.user._id.toString()
          );
          logger.info(`FCM notification sent to user ${notification.user._id}`);
          
          notification.status = 'sent';
          notification.sentAt = new Date();
          await notification.save();
          successCount++;
        } else {
          // L'utente non ha token FCM
          notification.status = 'sent';
          notification.sentAt = new Date();
          notification.errorDetails = 'No FCM tokens available';
          await notification.save();
          successCount++;
        }
      } catch (error) {
        notification.status = 'failed';
        notification.errorDetails = error.message;
        await notification.save();
        failedCount++;
        
        const errorInfo = {
          file: 'notificationService.js',
          function: 'processNotifications',
          notificationId: notification._id.toString()
        };
        logger.error(`Error processing notification: ${error.message}`, errorInfo);
      }
    }
    
    if (successCount > 0 || failedCount > 0) {
      logger.info(`Notification processing completed: ${successCount} sent, ${failedCount} failed`);
    }
  } catch (error) {
    const errorInfo = {
      file: 'notificationService.js',
      function: 'processNotifications',
      error: error.message
    };
    logger.error(`Error in processNotifications: ${error.message}`, errorInfo);
  }
};

/**
 * Ottiene un titolo appropriato per il tipo di notifica
 * @param {string} type - Tipo di notifica
 * @param {string} message - Messaggio della notifica (può contenere indizi sul tipo di modifica)
 * @returns {string} - Titolo della notifica
 */
function getNotificationTitle(type, message = '') {
  // Controlla messaggi specifici per determinare il giusto titolo
  if (message) {
    if (message.startsWith('🕒 Cambio orario partita')) {
      return '🕒 Cambio orario';
    }
    if (message.startsWith('🏟️ Cambio campo partita')) {
      return '🏟️ Cambio campo';
    }
    if (message.startsWith('📅 Cambio data partita')) {
      return '📅 Cambio data';
    }
    if (message.startsWith('📊 Risultato aggiornato')) {
      return '📊 Risultato aggiornato';
    }
    if (message.startsWith('🏆 GOLDEN SET')) {
      return '🏆 Golden Set';
    }
  }

  // Titoli basati sul tipo di notifica
  switch (type) {
    case 'match_scheduled':
      return '🏐 Nuova Partita';
    case 'match_updated':
      return '🔄 Aggiornamento Partita';
    case 'result_updated':
      return '📊 Risultato Aggiornato';
    case 'result_entered':
      return '⚠️ Conferma Risultato';
    case 'result_confirmed':
      return '✅ Risultato Confermato';
    case 'result_rejected':
      return '❌ Risultato Rifiutato';
    default:
      return '📢 Club Series Finals';
  }
}

/**
 * Crea una notifica per gli utenti iscritti a una squadra
 * @param {string} teamId - ID della squadra
 * @param {string} type - Tipo di notifica
 * @param {string} message - Messaggio della notifica
 * @param {string} matchId - ID della partita (opzionale)
 */
exports.createTeamNotification = async (teamId, type, message, matchId = null) => {
  try {
    const User = require('../models/User');
    
    // Trova tutti gli utenti iscritti alla squadra
    const users = await User.find({ 
      subscribedTeams: teamId,
      isActive: true 
    });
    
    if (users.length === 0) {
      logger.info(`No subscribed users found for team ${teamId}`);
      return;
    }
    
    logger.info(`Creating notifications for ${users.length} users subscribed to team ${teamId}`);
    
    // Crea una notifica per ogni utente
    const notifications = users.map(user => ({
      user: user._id,
      team: teamId,
      match: matchId,
      type,
      message,
      status: 'pending'
    }));
    
    await Notification.insertMany(notifications);
    
    // Processa immediatamente le notifiche
    this.processNotifications();
    
    // Invia anche al topic della squadra
    try {
      const notificationTitle = getNotificationTitle(type, message);
      const messageLines = message.split('\n');
      const notificationBody = messageLines[0] + (messageLines.length > 1 ? '...' : '');
      
      const fcmNotification = {
        title: notificationTitle,
        body: notificationBody
      };
      
      const data = {
        type,
        teamId: teamId.toString(),
        matchId: matchId ? matchId.toString() : '',
        fullMessage: message
      };
      
      // await fcmService.sendToTopic(`team_${teamId}`, fcmNotification, data);  //commentato per evitare doppie notifiche
      logger.info(`FCM notification sent to topic team_${teamId}`);
    } catch (topicError) {
      logger.error(`Error sending FCM notification to topic: ${topicError.message}`);
    }
    
    logger.info(`Created ${notifications.length} notifications for team ${teamId}`);
  } catch (error) {
    logger.error(`Error creating team notifications: ${error.message}`);
  }
};

/**
 * Elimina tutte le notifiche di un utente specifico
 * @param {string} userId - ID dell'utente
 * @returns {Promise<Object>} - Risultato dell'operazione
 */
exports.deleteAllUserNotifications = async (userId) => {
  try {
    if (!userId) {
      throw new Error('ID utente richiesto');
    }
    
    // Eseguiamo l'eliminazione delle notifiche
    const result = await Notification.deleteMany({ user: userId });
    
    logger.info(`Eliminate ${result.deletedCount} notifiche per l'utente ${userId}`);
    
    return {
      success: true,
      deletedCount: result.deletedCount,
      message: `Eliminate ${result.deletedCount} notifiche`
    };
  } catch (error) {
    logger.error(`Errore nell'eliminazione delle notifiche dell'utente: ${error.message}`);
    throw error;
  }
};
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
      })
      // Aggiungiamo un ordinamento per inviare le notifiche più vecchie prima
      .sort({ createdAt: 1 })
      // Limitiamo il numero di notifiche processate per batch per evitare sovraccarichi
      .limit(50);
    
    if (pendingNotifications.length === 0) {
      return; // Nessuna notifica da processare, usciamo silenziosamente
    }
    
    logger.info(`Elaborazione di ${pendingNotifications.length} notifiche in sospeso`);
    
    // Log dettagliato dei tipi di notifiche
    const notificationTypes = {};
    pendingNotifications.forEach(notification => {
      const type = notification.type || 'unknown';
      notificationTypes[type] = (notificationTypes[type] || 0) + 1;
    });
    logger.info(`Tipi di notifiche: ${JSON.stringify(notificationTypes)}`);
    
    // Raggruppiamo le notifiche per utente per evitare sovraccarichi
    // ed inviare una sola notifica se ce ne sono diverse dello stesso tipo
    const userNotifications = {};
    
    for (const notification of pendingNotifications) {
      if (!notification.user || !notification.user._id) continue;
      
      const userId = notification.user._id.toString();
      
      if (!userNotifications[userId]) {
        userNotifications[userId] = {
          user: notification.user,
          notifications: []
        };
      }
      
      userNotifications[userId].notifications.push(notification);
    }
    
    let successCount = 0;
    let failedCount = 0;
    
    // Ora processiamo un utente alla volta con un piccolo ritardo tra gli utenti
    // per evitare limiti di rate Firebase
    for (const userId in userNotifications) {
      const userData = userNotifications[userId];
      
      try {
        // Verifica se l'utente ha token FCM registrati
        if (!userData.user.fcmTokens || userData.user.fcmTokens.length === 0) {
          // Segna tutte le notifiche come inviate (anche se non abbiamo token)
          for (const notification of userData.notifications) {
            notification.status = 'sent';
            notification.sentAt = new Date();
            notification.errorDetails = 'No FCM tokens available';
            await notification.save();
            successCount++;
          }
          continue;
        }
        
        // Estraiamo tutte le notifiche dell'utente
        const notifications = userData.notifications;
        
        // Se c'è una sola notifica, la trattiamo normalmente
        if (notifications.length === 1) {
          const notification = notifications[0];
          await processSingleNotification(notification, userData.user);
          successCount++;
        } 
        // Se ci sono più notifiche dello stesso tipo, le raggruppiamo
        else {
          // Raggruppa per tipo
          const notificationsByType = {};
          
          for (const notification of notifications) {
            const type = notification.type;
            if (!notificationsByType[type]) {
              notificationsByType[type] = [];
            }
            notificationsByType[type].push(notification);
          }
          
          // Processa ogni gruppo di notifiche
          for (const type in notificationsByType) {
            const typeNotifications = notificationsByType[type];
            
            if (typeNotifications.length === 1) {
              // Se c'è solo una notifica di questo tipo, trattala normalmente
              await processSingleNotification(typeNotifications[0], userData.user);
              successCount++;
            } else {
              // Altrimenti, crea una notifica riepilogativa
              await processBatchNotifications(typeNotifications, userData.user);
              successCount += typeNotifications.length;
            }
          }
        }
        
        // Aggiungiamo un breve ritardo tra gli utenti (100ms)
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        // Se c'è un errore, segnamo tutte le notifiche dell'utente come fallite
        for (const notification of userData.notifications) {
          notification.status = 'failed';
          notification.errorDetails = error.message;
          await notification.save();
          failedCount++;
        }
        
        logger.error(`Error processing notifications for user ${userId}: ${error.message}`);
      }
    }
    
    // Se ci sono ancora notifiche in sospeso, pianifichiamo un altro batch
    const remainingCount = await Notification.countDocuments({ status: 'pending' });
    if (remainingCount > 0) {
      logger.info(`Rimangono ${remainingCount} notifiche in sospeso, pianificazione di un altro batch`);
      // Pianifica un'altra esecuzione tra 5 secondi
      setTimeout(() => this.processNotifications(), 5000);
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
 * Processa una singola notifica
 * @param {Object} notification - Oggetto notifica
 * @param {Object} user - Oggetto utente
 */
async function processSingleNotification(notification, user) {
  // Preparazione notifica FCM
  const notificationTitle = getNotificationTitle(notification.type, notification.message);
  const messageLines = notification.message.split('\n');
  const notificationBody = messageLines[0] + (messageLines.length > 1 ? '...' : '');
  
  // Invia notifica FCM
  const fcmNotification = {
    title: notificationTitle,
    body: notificationBody
  };
  
  const data = {
    notificationId: notification._id.toString(),
    type: notification.type,
    teamId: notification.team ? notification.team._id.toString() : '',
    matchId: notification.match ? notification.match._id.toString() : '',
    fullMessage: notification.message,
    timestamp: Date.now().toString() // Aggiungiamo timestamp per evitare duplicati
  };
  
  await fcmService.sendToDevices(
    user.fcmTokens, 
    fcmNotification, 
    data,
    user._id.toString()
  );
  
  logger.info(`FCM notification sent to user ${user._id}`);
  
  notification.status = 'sent';
  notification.sentAt = new Date();
  await notification.save();
}

/**
 * Processa un gruppo di notifiche dello stesso tipo
 * @param {Array} notifications - Notifiche da processare
 * @param {Object} user - Oggetto utente
 */
async function processBatchNotifications(notifications, user) {
  if (!notifications || notifications.length === 0) return;
  
  const type = notifications[0].type;
  let title = '';
  let body = '';
  
  // Crea un titolo e corpo appropriati in base al tipo
  switch (type) {
    case 'match_scheduled':
      title = '🏐 Nuove Partite';
      body = `Hai ${notifications.length} nuove partite programmate`;
      break;
    case 'match_updated':
      title = '🔄 Aggiornamenti Partite';
      body = `Ci sono aggiornamenti per ${notifications.length} partite`;
      break;
    case 'result_updated':
      title = '📊 Risultati Aggiornati';
      body = `Sono stati aggiornati ${notifications.length} risultati`;
      break;
    case 'result_entered':
      title = '⚠️ Conferma Risultati';
      body = `Ci sono ${notifications.length} risultati da confermare`;
      break;
    case 'result_confirmed':
      title = '✅ Risultati Confermati';
      body = `${notifications.length} risultati sono stati confermati`;
      break;
    default:
      title = `📢 Club Series (${notifications.length})`;
      body = `Hai ${notifications.length} nuove notifiche`;
  }
  
  // Prepara i dati per FCM
  const fcmNotification = {
    title,
    body
  };
  
  const data = {
    type: 'batch',
    notificationType: type,
    count: notifications.length.toString(),
    notificationIds: notifications.map(n => n._id.toString()).join(','),
    timestamp: Date.now().toString()
  };
  
  // Invia notifica FCM
  await fcmService.sendToDevices(
    user.fcmTokens, 
    fcmNotification, 
    data,
    user._id.toString()
  );
  
  logger.info(`Batch FCM notification (${notifications.length} items) sent to user ${user._id}`);
  
  // Aggiorna tutte le notifiche
  for (const notification of notifications) {
    notification.status = 'sent';
    notification.sentAt = new Date();
    await notification.save();
  }
}

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
    setTimeout(() => this.processNotifications(), 1000);
    
    // Invia anche al topic della squadra - COMMENTO COMPLETO per evitare notifiche doppie
    /*
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
      
      // await fcmService.sendToTopic(`team_${teamId}`, fcmNotification, data);
      logger.info(`FCM notification sent to topic team_${teamId}`);
    } catch (topicError) {
      logger.error(`Error sending FCM notification to topic: ${topicError.message}`);
    }
    */
    
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
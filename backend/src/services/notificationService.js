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
    
    logger.info(`Processing ${pendingNotifications.length} pending notifications`);
    
    for (const notification of pendingNotifications) {
      try {
        // Preparazione messaggio personalizzato
        let message = notification.message;
        
        // Se la notifica è relativa a una partita e ha dettagli sul team code
        if (notification.match && (notification.match.teamACode || notification.match.teamBCode)) {
          // Aggiungi informazioni sul Team A/B/G se presenti
          const teamALabel = notification.match.teamACode ? ` (Team ${notification.match.teamACode})` : '';
          const teamBLabel = notification.match.teamBCode ? ` (Team ${notification.match.teamBCode})` : '';
          
          // Aggiungi etichetta Golden Set se presente
          const goldenLabel = notification.match.isGoldenSet ? ' [GOLDEN SET]' : '';
          
          // Sostituisci nome squadre con nome + team code
          if (notification.match.teamA && notification.match.teamB && 
              notification.match.teamA.name && notification.match.teamB.name) {
            message = message.replace(
              `${notification.match.teamA.name} vs ${notification.match.teamB.name}`,
              `${notification.match.teamA.name}${teamALabel} vs ${notification.match.teamB.name}${teamBLabel}${goldenLabel}`
            );
          }
        }
        
        // Verifica se l'utente ha token FCM registrati
        if (notification.user && notification.user.fcmTokens && notification.user.fcmTokens.length > 0) {
          // Prepara notifica FCM
          const notificationTitle = getNotificationTitle(notification.type);
          
          // Dividi il messaggio in linee
          const messageLines = message.split('\n');
          
          // Prendi la prima linea come corpo principale
          const notificationBody = messageLines[0] + (messageLines.length > 1 ? '...' : '');
          
          const fcmNotification = {
            title: notificationTitle,
            body: notificationBody
          };
          
          // Prepara dati aggiuntivi
          const data = {
            type: notification.type,
            teamId: notification.team ? notification.team._id.toString() : '',
            teamName: notification.team ? notification.team.name : '',
            matchId: notification.match ? notification.match._id.toString() : '',
            notificationId: notification._id.toString(),
            fullMessage: message,
            createdAt: notification.createdAt.toISOString()
          };
          
          try {
            // Invia a tutti i token dell'utente
            const result = await fcmService.sendToDevices(
              notification.user.fcmTokens,
              fcmNotification,
              data
            );
            
            notification.status = 'sent';
            notification.sentAt = new Date();
            await notification.save();
            
            logger.info(`FCM notification sent to user ${notification.user._id} (${notification.user.fcmTokens.length} tokens)`);
          } catch (fcmError) {
            notification.status = 'failed';
            notification.errorDetails = `FCM error: ${fcmError.message}`;
            await notification.save();
            
            logger.error(`FCM error for notification ${notification._id}: ${fcmError.message}`);
          }
        } else {
          // L'utente non ha token FCM, segniamo la notifica come sent comunque
          // La vedrà quando accede all'app
          notification.status = 'sent';
          notification.sentAt = new Date();
          notification.errorDetails = 'No FCM tokens available';
          await notification.save();
          
          logger.info(`User ${notification.user._id} has no FCM tokens, notification marked as sent anyway`);
        }
      } catch (error) {
        notification.status = 'failed';
        notification.errorDetails = error.message;
        await notification.save();
        
        logger.error(`Error processing notification ${notification._id}: ${error.message}`);
      }
    }
    
    logger.info('Notification processing completed');
  } catch (error) {
    logger.error(`Error in processNotifications: ${error.message}`);
  }
};

/**
 * Ottiene un titolo appropriato per il tipo di notifica
 * @param {string} type - Tipo di notifica
 * @returns {string} - Titolo della notifica
 */
function getNotificationTitle(type) {
  switch (type) {
    case 'match_scheduled':
      return '🏐 Nuova Partita';
    case 'match_updated':
      return '🔄 Aggiornamento Partita';
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
      const notificationTitle = getNotificationTitle(type);
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
      
      await fcmService.sendToTopic(`team_${teamId}`, fcmNotification, data);
      logger.info(`FCM notification sent to topic team_${teamId}`);
    } catch (topicError) {
      logger.error(`Error sending FCM notification to topic: ${topicError.message}`);
    }
    
    logger.info(`Created ${notifications.length} notifications for team ${teamId}`);
  } catch (error) {
    logger.error(`Error creating team notifications: ${error.message}`);
  }
};
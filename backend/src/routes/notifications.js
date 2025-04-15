const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications
} = require('../controllers/notificationController'); // Assicurati che questo path sia corretto
const { protect } = require('../middleware/auth'); // Assicurati che questo path sia corretto

// GET Routes
router.get('/', protect, getNotifications);

// PUT Routes - **ORDINE CORRETTO**
router.put('/read-all', protect, markAllAsRead); // Specifica prima
router.put('/:id', protect, markAsRead);        // Generica dopo

// DELETE Routes - **ORDINE CORRETTO** (anche se meno critico qui, è buona norma)
router.delete('/delete-all', protect, deleteAllNotifications); // Specifica prima
router.delete('/:id', protect, deleteNotification);          // Generica dopo

module.exports = router;
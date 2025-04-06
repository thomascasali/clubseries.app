require('dotenv').config();
const mongoose = require('mongoose');
const Notification = require('./src/models/Notification');
const SheetTracking = require('./src/models/SheetTracking');
const connectDB = require('./src/config/database');

async function resetNotificationsAndTracking() {
  try {
    console.log('Connecting to database...');
    await connectDB();
    
    console.log('Deleting all notifications...');
    const notificationsResult = await Notification.deleteMany({});
    console.log(`Deleted ${notificationsResult.deletedCount} notifications`);
    
    console.log('Resetting sheet tracking data...');
    const trackingResult = await SheetTracking.deleteMany({});
    console.log(`Reset ${trackingResult.deletedCount} tracking records`);
    
    console.log('Done!');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  }
}

resetNotificationsAndTracking();

const Notification = require('../models/Notification');

const sendNotification = async (userId, title, message, type = 'info') => {
  try {
    await Notification.create({
      user: userId,
      title,
      message,
      type
    });
    // In a real system, you would also trigger Email/SMS here
    console.log(`Notification sent to ${userId}: ${title}`);
  } catch (err) {
    console.error('Notification Error:', err);
  }
};

module.exports = sendNotification;

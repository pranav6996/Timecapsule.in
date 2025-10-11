import nodemailer from "nodemailer";
import pool from "../db.js";

// Email transporter configuration
const transporter = nodemailer.createTransporter({
  service: 'gmail', // or your preferred email service
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export const sendUnlockNotification = async (userId, capsuleId) => {
  try {
    // Get user email and capsule details
    const userResult = await pool.query("SELECT email, name FROM users WHERE id = $1", [userId]);
    const capsuleResult = await pool.query(
      "SELECT title, message FROM time_capsules WHERE id = $1", 
      [capsuleId]
    );

    if (userResult.rows.length === 0 || capsuleResult.rows.length === 0) {
      throw new Error("User or capsule not found");
    }

    const user = userResult.rows[0];
    const capsule = capsuleResult.rows[0];

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "🎉 Your Time Capsule is Ready to Unlock!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Hello ${user.name}!</h2>
          <p>Your time capsule "<strong>${capsule.title}</strong>" is ready to be unlocked!</p>
          <p>It's time to relive that special memory from the past.</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-style: italic;">"${capsule.message.substring(0, 100)}${capsule.message.length > 100 ? '...' : ''}"</p>
          </div>
          <p>Visit TimeCapsule.AI to unlock your memory and relive the moment!</p>
          <p style="color: #666; font-size: 14px;">- The TimeCapsule.AI Team</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    
    // Create notification record
    await pool.query(
      `INSERT INTO notifications (user_id, capsule_id, type, message) 
       VALUES ($1, $2, $3, $4)`,
      [userId, capsuleId, 'unlocked', `Your time capsule "${capsule.title}" is ready to unlock!`]
    );

    console.log(`Unlock notification sent to user ${userId} for capsule ${capsuleId}`);
  } catch (error) {
    console.error('Error sending unlock notification:', error);
  }
};

export const sendReminderNotification = async (userId, capsuleId) => {
  try {
    const userResult = await pool.query("SELECT email, name FROM users WHERE id = $1", [userId]);
    const capsuleResult = await pool.query(
      "SELECT title, unlock_date FROM time_capsules WHERE id = $1", 
      [capsuleId]
    );

    if (userResult.rows.length === 0 || capsuleResult.rows.length === 0) {
      return;
    }

    const user = userResult.rows[0];
    const capsule = capsuleResult.rows[0];
    const unlockDate = new Date(capsule.unlock_date);
    const daysUntilUnlock = Math.ceil((unlockDate - new Date()) / (1000 * 60 * 60 * 24));

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: `⏰ Time Capsule Reminder: ${capsule.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Hello ${user.name}!</h2>
          <p>Just a friendly reminder that your time capsule "<strong>${capsule.title}</strong>" will unlock in ${daysUntilUnlock} day${daysUntilUnlock !== 1 ? 's' : ''}!</p>
          <p>Get ready to relive that special memory soon.</p>
          <p style="color: #666; font-size: 14px;">- The TimeCapsule.AI Team</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    
    await pool.query(
      `INSERT INTO notifications (user_id, capsule_id, type, message) 
       VALUES ($1, $2, $3, $4)`,
      [userId, capsuleId, 'unlock_reminder', `Your time capsule "${capsule.title}" unlocks in ${daysUntilUnlock} day${daysUntilUnlock !== 1 ? 's' : ''}!`]
    );

  } catch (error) {
    console.error('Error sending reminder notification:', error);
  }
};

export const getNotifications = async (userId, limit = 20) => {
  try {
    const result = await pool.query(
      `SELECT n.*, tc.title as capsule_title
       FROM notifications n
       LEFT JOIN time_capsules tc ON n.capsule_id = tc.id
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
};

export const markNotificationAsRead = async (notificationId, userId) => {
  try {
    await pool.query(
      "UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2",
      [notificationId, userId]
    );
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};


import cron from "node-cron";
import pool from "../db.js";
import { sendUnlockNotification, sendReminderNotification } from "./notificationService.js";

// Check for capsules that should be unlocked
const checkUnlockDates = async () => {
  try {
    console.log("Checking for capsules to unlock...");
    
    // Find capsules that should be unlocked
    const result = await pool.query(
      `SELECT id, user_id, title, unlock_date 
       FROM time_capsules 
       WHERE is_unlocked = false AND unlock_date <= NOW()`
    );

    for (const capsule of result.rows) {
      // Mark capsule as unlocked
      await pool.query(
        "UPDATE time_capsules SET is_unlocked = true WHERE id = $1",
        [capsule.id]
      );

      // Send unlock notification
      await sendUnlockNotification(capsule.user_id, capsule.id);
      
      console.log(`Unlocked capsule: ${capsule.title} (ID: ${capsule.id})`);
    }

    if (result.rows.length > 0) {
      console.log(`Unlocked ${result.rows.length} capsule(s)`);
    }

  } catch (error) {
    console.error("Error checking unlock dates:", error);
  }
};

// Check for capsules that need reminder notifications
const checkReminderDates = async () => {
  try {
    console.log("Checking for reminder notifications...");
    
    // Find capsules unlocking in 1 day, 3 days, and 1 week
    const reminderIntervals = [1, 3, 7]; // days
    
    for (const days of reminderIntervals) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);
      futureDate.setHours(23, 59, 59, 999); // End of day
      
      const startOfDay = new Date(futureDate);
      startOfDay.setHours(0, 0, 0, 0); // Start of day

      const result = await pool.query(
        `SELECT id, user_id, title, unlock_date 
         FROM time_capsules 
         WHERE is_unlocked = false 
         AND unlock_date >= $1 
         AND unlock_date <= $2`,
        [startOfDay, futureDate]
      );

      for (const capsule of result.rows) {
        // Check if we already sent a reminder for this capsule
        const existingReminder = await pool.query(
          `SELECT id FROM notifications 
           WHERE user_id = $1 AND capsule_id = $2 AND type = 'unlock_reminder'`,
          [capsule.user_id, capsule.id]
        );

        if (existingReminder.rows.length === 0) {
          await sendReminderNotification(capsule.user_id, capsule.id);
          console.log(`Sent reminder for capsule: ${capsule.title} (unlocks in ${days} day${days !== 1 ? 's' : ''})`);
        }
      }
    }

  } catch (error) {
    console.error("Error checking reminder dates:", error);
  }
};

// Start cron jobs
export const startCronJobs = () => {
  // Check for unlock dates every hour
  cron.schedule('0 * * * *', checkUnlockDates);
  
  // Check for reminders every 6 hours
  cron.schedule('0 */6 * * *', checkReminderDates);
  
  console.log("Cron jobs started:");
  console.log("- Unlock check: Every hour");
  console.log("- Reminder check: Every 6 hours");
};

// Manual unlock check (for testing)
export const manualUnlockCheck = checkUnlockDates;


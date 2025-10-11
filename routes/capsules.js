import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import { uploadMultiple } from "../middleware/upload.js";
import { detectEmotion, suggestTemplate } from "../services/emotionAI.js";
import pool from "../db.js";

const router = express.Router();

// Create a new time capsule
router.post("/", authenticateToken, uploadMultiple, async (req, res) => {
  try {
    const { title, message, person_tag, unlock_date } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!title || !message || !unlock_date) {
      return res.status(400).json({ 
        message: "Title, message, and unlock date are required" 
      });
    }

    // Validate unlock date is in the future
    const unlockDate = new Date(unlock_date);
    if (unlockDate <= new Date()) {
      return res.status(400).json({ 
        message: "Unlock date must be in the future" 
      });
    }

    // Detect emotions from the message
    const emotions = await detectEmotion(message);
    
    // Start database transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert time capsule
      const capsuleResult = await client.query(
        `INSERT INTO time_capsules (user_id, title, message, emotion_tags, person_tag, unlock_date) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [userId, title, message, emotions, person_tag, unlockDate]
      );
      
      const capsuleId = capsuleResult.rows[0].id;

      // Handle file uploads
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          const fileType = file.mimetype.startsWith('image/') ? 'image' :
                          file.mimetype.startsWith('audio/') ? 'audio' :
                          file.mimetype.startsWith('video/') ? 'video' : 'other';
          
          await client.query(
            `INSERT INTO capsule_media (capsule_id, file_path, file_type, file_name, file_size) 
             VALUES ($1, $2, $3, $4, $5)`,
            [capsuleId, file.path, fileType, file.originalname, file.size]
          );
        }
      }

      // Get AI-suggested template
      const templateSuggestion = await suggestTemplate(emotions, message);
      
      // Assign template to capsule
      await client.query(
        `INSERT INTO capsule_templates (capsule_id, template_id) VALUES ($1, $2)`,
        [capsuleId, templateSuggestion.templateId]
      );

      await client.query('COMMIT');

      res.status(201).json({
        message: "Time capsule created successfully",
        capsuleId,
        emotions,
        template: templateSuggestion.templateData
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error creating time capsule:', error);
    res.status(500).json({ error: "Failed to create time capsule" });
  }
});

// Get all time capsules for a user
router.get("/", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query; // 'all', 'locked', 'unlocked'

    let query = `
      SELECT tc.*, et.template_data, et.emotion_name,
             array_agg(
               json_build_object(
                 'id', cm.id,
                 'file_path', cm.file_path,
                 'file_type', cm.file_type,
                 'file_name', cm.file_name
               )
             ) as media
      FROM time_capsules tc
      LEFT JOIN capsule_templates ct ON tc.id = ct.capsule_id
      LEFT JOIN emotion_templates et ON ct.template_id = et.id
      LEFT JOIN capsule_media cm ON tc.id = cm.capsule_id
      WHERE tc.user_id = $1
    `;

    const params = [userId];

    if (status === 'locked') {
      query += ' AND tc.is_unlocked = false';
    } else if (status === 'unlocked') {
      query += ' AND tc.is_unlocked = true';
    }

    query += `
      GROUP BY tc.id, et.template_data, et.emotion_name
      ORDER BY tc.created_at DESC
    `;

    const result = await pool.query(query, params);
    res.json(result.rows);

  } catch (error) {
    console.error('Error fetching time capsules:', error);
    res.status(500).json({ error: "Failed to fetch time capsules" });
  }
});

// Get a specific time capsule
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT tc.*, et.template_data, et.emotion_name,
              array_agg(
                json_build_object(
                  'id', cm.id,
                  'file_path', cm.file_path,
                  'file_type', cm.file_type,
                  'file_name', cm.file_name
                )
              ) as media
       FROM time_capsules tc
       LEFT JOIN capsule_templates ct ON tc.id = ct.capsule_id
       LEFT JOIN emotion_templates et ON ct.template_id = et.id
       LEFT JOIN capsule_media cm ON tc.id = cm.capsule_id
       WHERE tc.id = $1 AND tc.user_id = $2
       GROUP BY tc.id, et.template_data, et.emotion_name`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Time capsule not found" });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Error fetching time capsule:', error);
    res.status(500).json({ error: "Failed to fetch time capsule" });
  }
});

// Update a time capsule (only if not unlocked)
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { title, message, person_tag, unlock_date } = req.body;

    // Check if capsule exists and belongs to user
    const existingCapsule = await pool.query(
      "SELECT * FROM time_capsules WHERE id = $1 AND user_id = $2",
      [id, userId]
    );

    if (existingCapsule.rows.length === 0) {
      return res.status(404).json({ message: "Time capsule not found" });
    }

    if (existingCapsule.rows[0].is_unlocked) {
      return res.status(400).json({ message: "Cannot update unlocked time capsule" });
    }

    // Update capsule
    const result = await pool.query(
      `UPDATE time_capsules 
       SET title = $1, message = $2, person_tag = $3, unlock_date = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND user_id = $6
       RETURNING *`,
      [title, message, person_tag, unlock_date, id, userId]
    );

    res.json({ message: "Time capsule updated successfully", capsule: result.rows[0] });

  } catch (error) {
    console.error('Error updating time capsule:', error);
    res.status(500).json({ error: "Failed to update time capsule" });
  }
});

// Delete a time capsule
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      "DELETE FROM time_capsules WHERE id = $1 AND user_id = $2 RETURNING *",
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Time capsule not found" });
    }

    res.json({ message: "Time capsule deleted successfully" });

  } catch (error) {
    console.error('Error deleting time capsule:', error);
    res.status(500).json({ error: "Failed to delete time capsule" });
  }
});

export default router;


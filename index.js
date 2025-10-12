import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pool from "./db.js";
import multer from 'multer';
import path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('.'));
app.use('/uploads', express.static('uploads'));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

const PORT = process.env.PORT || 5080;
const JWT_SECRET = process.env.JWT_SECRET || 'your-default-secret-key-change-it';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.sendStatus(401);
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

app.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existingUser = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (existingUser.rows.length > 0) return res.status(400).json({ error: "User with this email already exists." });
    
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    await pool.query("INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3)", [name, email, passwordHash]);
    res.status(201).json({ message: "User created successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error during signup." });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const userResult = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (userResult.rows.length === 0) return res.status(400).json({ error: "Invalid credentials." });
    
    const user = userResult.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials." });
    
    const token = jwt.sign({ id: user.id, name: user.name }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error during login." });
  }
});

app.post("/capsule", authenticateToken, upload.fields([{ name: 'photos', maxCount: 1 }, { name: 'videos', maxCount: 1 }]), async (req, res) => {
  try {
    const { text, template, unlock_date, capsule_name } = req.body;
    const userId = req.user.id;
    const photoPath = req.files.photos ? req.files.photos[0].path : null;
    const videoPath = req.files.videos ? req.files.videos[0].path : null;
    
    await pool.query(
      "INSERT INTO capsules (user_id, text, template, unlock_date, created_at, capsule_name, photo_path, video_path) VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7)",
      [userId, text, template, unlock_date, capsule_name, photoPath, videoPath]
    );
    res.json({ message: "Capsule created successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error occurred." });
  }
});

app.get("/capsules", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const allCapsules = await pool.query("SELECT * FROM capsules WHERE user_id = $1 ORDER BY created_at DESC", [userId]);
    res.json(allCapsules.rows);
  } catch (err) {
    console.error("ERROR fetching capsules:", err);
    res.status(500).json({ error: "Server error occurred." });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

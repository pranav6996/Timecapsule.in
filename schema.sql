-- TimeCapsule.AI Database Schema

-- Users table (already exists, but adding additional fields)
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Time capsules table
CREATE TABLE IF NOT EXISTS time_capsules (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    emotion_tags TEXT[], -- Array of emotion tags
    person_tag VARCHAR(255), -- Main person related to the memory
    unlock_date TIMESTAMP NOT NULL,
    is_unlocked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Media attachments table
CREATE TABLE IF NOT EXISTS capsule_media (
    id SERIAL PRIMARY KEY,
    capsule_id INTEGER REFERENCES time_capsules(id) ON DELETE CASCADE,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(50) NOT NULL, -- 'image', 'audio', 'video'
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Emotion templates table
CREATE TABLE IF NOT EXISTS emotion_templates (
    id SERIAL PRIMARY KEY,
    emotion_name VARCHAR(100) NOT NULL UNIQUE,
    template_data JSONB NOT NULL, -- Contains colors, fonts, icons, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Capsule template assignments
CREATE TABLE IF NOT EXISTS capsule_templates (
    id SERIAL PRIMARY KEY,
    capsule_id INTEGER REFERENCES time_capsules(id) ON DELETE CASCADE,
    template_id INTEGER REFERENCES emotion_templates(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    capsule_id INTEGER REFERENCES time_capsules(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'unlock_reminder', 'unlocked'
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_time_capsules_user_id ON time_capsules(user_id);
CREATE INDEX IF NOT EXISTS idx_time_capsules_unlock_date ON time_capsules(unlock_date);
CREATE INDEX IF NOT EXISTS idx_time_capsules_is_unlocked ON time_capsules(is_unlocked);
CREATE INDEX IF NOT EXISTS idx_capsule_media_capsule_id ON capsule_media(capsule_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- Insert default emotion templates
INSERT INTO emotion_templates (emotion_name, template_data) VALUES
('joy', '{"primary_color": "#FFD700", "secondary_color": "#FFA500", "background": "linear-gradient(135deg, #FFD700, #FFA500)", "font_family": "Comic Sans MS", "icon": "😊", "mood": "bright"}'),
('sadness', '{"primary_color": "#4169E1", "secondary_color": "#191970", "background": "linear-gradient(135deg, #4169E1, #191970)", "font_family": "Georgia", "icon": "😢", "mood": "melancholic"}'),
('love', '{"primary_color": "#FF69B4", "secondary_color": "#DC143C", "background": "linear-gradient(135deg, #FF69B4, #DC143C)", "font_family": "Brush Script MT", "icon": "❤️", "mood": "warm"}'),
('nostalgia', '{"primary_color": "#DDA0DD", "secondary_color": "#9370DB", "background": "linear-gradient(135deg, #DDA0DD, #9370DB)", "font_family": "Times New Roman", "icon": "📸", "mood": "vintage"}'),
('pride', '{"primary_color": "#32CD32", "secondary_color": "#228B22", "background": "linear-gradient(135deg, #32CD32, #228B22)", "font_family": "Arial Black", "icon": "🏆", "mood": "triumphant"}'),
('regret', '{"primary_color": "#696969", "secondary_color": "#2F4F4F", "background": "linear-gradient(135deg, #696969, #2F4F4F)", "font_family": "Courier New", "icon": "😔", "mood": "contemplative"}'),
('excitement', '{"primary_color": "#FF4500", "secondary_color": "#FF6347", "background": "linear-gradient(135deg, #FF4500, #FF6347)", "font_family": "Impact", "icon": "🎉", "mood": "energetic"}'),
('peace', '{"primary_color": "#87CEEB", "secondary_color": "#4682B4", "background": "linear-gradient(135deg, #87CEEB, #4682B4)", "font_family": "Calibri", "icon": "☮️", "mood": "serene"}')
ON CONFLICT (emotion_name) DO NOTHING;


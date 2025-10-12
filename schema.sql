-- Drop tables in reverse order of dependency to avoid errors
DROP TABLE IF EXISTS capsules;
DROP TABLE IF EXISTS users;

-- Create the 'users' table for authentication
-- This table stores login credentials and user information.
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL
);

-- Create the 'capsules' table for time capsule data
-- It is linked to the 'users' table via the 'user_id' foreign key.
CREATE TABLE capsules (
    id SERIAL PRIMARY KEY,
    -- If a user is deleted, all their capsules will be deleted too.
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    capsule_name VARCHAR(255),
    text TEXT,
    template VARCHAR(255),
    unlock_date DATE,
    photo_path VARCHAR(255),
    video_path VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Confirmation message
\echo 'Schema created successfully: "users" and "capsules" tables are ready.'
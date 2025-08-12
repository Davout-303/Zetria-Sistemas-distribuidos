CREATE DATABASE IF NOT EXISTS zetria CHARACTER
SET
    utf8mb4 COLLATE utf8mb4_unicode_ci;

USE zetria;

CREATE TABLE
    IF NOT EXISTS usuarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(80) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE
    IF NOT EXISTS notas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES usuarios (id) ON DELETE CASCADE
    );

CREATE TABLE
    IF NOT EXISTS tags (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL
    );

CREATE TABLE
    IF NOT EXISTS nota_tags (
        nota_id INT NOT NULL,
        tag_id INT NOT NULL,
        PRIMARY KEY (nota_id, tag_id),
        FOREIGN KEY (nota_id) REFERENCES notas (id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE
    );

CREATE TABLE
    IF NOT EXISTS links_notas (
        source_nota_id INT NOT NULL,
        target_nota_id INT NOT NULL,
        PRIMARY KEY (source_nota_id, target_nota_id),
        FOREIGN KEY (source_nota_id) REFERENCES notas (id) ON DELETE CASCADE,
        FOREIGN KEY (target_nota_id) REFERENCES notas (id) ON DELETE CASCADE
    );

CREATE TABLE
    IF NOT EXISTS flashcards (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nota_id INT NOT NULL,
        front_content TEXT NOT NULL,
        back_content TEXT NOT NULL,
        audio_path VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        review_at TIMESTAMP NULL,
        FOREIGN KEY (nota_id) REFERENCES notas (id) ON DELETE CASCADE
    );

CREATE TABLE
    IF NOT EXISTS tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NULL,
        due_date DATETIME NULL,
        recurring BOOLEAN DEFAULT FALSE,
        recurrence_rule VARCHAR(100) NULL,
        completed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES usuarios (id) ON DELETE CASCADE
    );
    
SELECT host, user, authentication_string FROM mysql.user WHERE user = 'root';
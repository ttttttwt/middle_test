-- Schema
CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  subject VARCHAR(200) NOT NULL,
  title VARCHAR(300) NOT NULL,
  content VARCHAR(1000) NOT NULL
);

-- Sample data
INSERT INTO posts (subject, title, content) VALUES 
('Fitness', 'How to get fit', 'Eat healthy and exercise'),
('Technology', 'Learning to Code', 'Start with the basics and practice daily'),
('Travel', 'Visit Vietnam', 'Amazing culture and delicious food');



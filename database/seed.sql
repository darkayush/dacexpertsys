-- =========================
-- USERS
-- =========================

-- Students (10)
INSERT INTO users (name, email, role, program, enrollment_no, year, hostel, room)
VALUES
('Rahul Sharma','rahul1@test.com','student','btech','230500',2,'BSH','101'),
('Aman Verma','aman@test.com','student','btech','230501',3,'BSH','102'),
('Priya Singh','priya@test.com','student','bba','230502',1,'GH','201'),
('Neha Gupta','neha@test.com','student','bcom','230503',2,'GH','202'),
('Arjun Mehta','arjun@test.com','student','mba','230504',1,'BSH','103'),
('Karan Patel','karan@test.com','student','btech','230505',4,'BSH','104'),
('Simran Kaur','simran@test.com','student','ballb','230506',3,'GH','203'),
('Rohit Yadav','rohit@test.com','student','btech','230507',2,'BSH','105'),
('Sneha Jain','sneha@test.com','student','bba','230508',1,'GH','204'),
('Vikas Roy','vikas@test.com','student','bcom','230509',2,'BSH','106');

-- Wardens (2)
INSERT INTO users (name, email, password, role)
VALUES
('Warden A','warden1@test.com',NULL,'warden'),
('Warden B','warden2@test.com',NULL,'warden');

-- Chief Warden
INSERT INTO users (name, email, password, role)
VALUES ('Chief Warden','chief@test.com',NULL,'chief_warden');

-- DSW
INSERT INTO users (name, email, password, role)
VALUES ('DSW Officer','dsw@test.com',NULL,'dsw');

-- Admin
INSERT INTO users (name, email, password, role)
VALUES ('Admin User','admin@test.com',NULL,'admin');

-- Test user
INSERT INTO users (name, email, password, role)
VALUES ('TEST USER','test',NULL,'dsw');


-- =========================
-- CASES (5)
-- =========================

INSERT INTO cases (
	student_id,
	created_by,
	assigned_to_role,
	reported_by,
	resolved_by,
	offense_type,
	severity,
	status,
	description,
	location,
	incident_date,
	penalty_points,
	severity_score,
	evidence_url
)
VALUES
(1, 11, 'chief_warden', 11, NULL, 'smoking', 'low', 'pending_chief', 'Smoking in hostel', 'BSH', NULL, 10, NULL, NULL),
(2, 11, 'dsw', 11, NULL, 'alcohol', 'medium', 'pending_dsw', 'Alcohol possession', 'BSH', NULL, 20, NULL, NULL),
(3, 12, NULL, 12, NULL, 'late entry', 'low', 'resolved', 'Late hostel entry', 'GH', NULL, 5, NULL, NULL),
(4, 12, 'chief_warden', 12, NULL, 'noise', 'low', 'pending_chief', 'Disturbing others', 'GH', NULL, 5, NULL, NULL),
(5, 11, 'admin', 11, NULL, 'ragging', 'high', 'pending_admin', 'Ragging junior', 'BSH', NULL, 50, NULL, NULL),
(1, NULL, 'chief_warden', NULL, NULL, 'smoking', 'low', 'pending_chief', NULL, NULL, NULL, NULL, NULL, NULL),
(6, 11, 'chief_warden', 11, NULL, 'Harassment', 'low', 'pending_chief', NULL, 'BSH Room 104', NULL, 0, NULL, NULL);


-- =========================
-- CASE TIMELINE
-- =========================

INSERT INTO case_timeline (case_id, event, performed_by)
VALUES
(1, 'Case Created', 11),
(2, 'Case Created', 11),
(2, 'Investigation Started', 11),
(3, 'Case Created', 12),
(3, 'Resolved', 14);


-- =========================
-- RULES
-- =========================

INSERT INTO rules (question, weight, category)
VALUES
('Was the student intoxicated?', 1.0, 'severity'),
('Was this a repeated offense?', 1.0, 'history'),
('Did it involve others?', 0.5, 'impact'),
('Was property damaged?', 1.0, 'damage'),
('Was it in hostel premises?', 0.5, 'location');


-- =========================
-- EVIDENCE
-- =========================

INSERT INTO evidence (case_id, file_url, file_type, uploaded_by)
VALUES
(1, 'http://example.com/img1.jpg', 'image', 11),
(2, 'http://example.com/img2.jpg', 'image', 11),
(3, 'http://example.com/doc1.pdf', 'pdf', 12),
(4, 'http://example.com/img3.jpg', 'image', 12),
(5, 'http://example.com/img4.jpg', 'image', 11);


-- =========================
-- NOTIFICATIONS
-- =========================

INSERT INTO notifications (user_id, message, case_id, is_read)
VALUES
(1, 'You have a new case', NULL, FALSE),
(2, 'Your case is under investigation', NULL, FALSE),
(3, 'Case resolved', NULL, FALSE),
(4, 'Attend DAC meeting', NULL, FALSE),
(5, 'Penalty assigned', NULL, FALSE),
(13, 'New case created by Warden. Click to review.', 7, FALSE);
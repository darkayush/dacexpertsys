import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './config/db.js';
import { ensureWorkflowSchema } from './config/bootstrap.js';
import usersRoutes from './routes/users.routes.js';
import casesRoutes from './routes/cases.routes.js';
import authRoutes from './routes/auth.routes.js';
import notificationsRoutes from './routes/notifications.routes.js';
import evidenceRoutes from './routes/evidence.routes.js';
import rulesRoutes from './routes/rules.routes.js';
import { verifyToken } from './middleware/auth.middleware.js';

const app = express();
const PORT = process.env.PORT || 5000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, 'uploads');
const evidenceDir = path.join(uploadsDir, 'evidence');

if (!fs.existsSync(evidenceDir)) {
  fs.mkdirSync(evidenceDir, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.status(200).json({ now: result.rows[0].now });
  } catch (error) {
    console.error('Test route DB error:', error);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

app.use('/api', authRoutes);

app.use('/users', verifyToken, usersRoutes);
app.use('/cases', verifyToken, casesRoutes);
app.use('/api/users', verifyToken, usersRoutes);
app.use('/api/cases', verifyToken, casesRoutes);
app.use('/api/notifications', verifyToken, notificationsRoutes);
app.use('/api/evidence', verifyToken, evidenceRoutes);
app.use('/api/rules', verifyToken, rulesRoutes);

async function startServer() {
  try {
    await ensureWorkflowSchema();
    app.listen(PORT, () => {
      console.log(`Backend server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Server startup failed:', error);
    process.exit(1);
  }
}

startServer();

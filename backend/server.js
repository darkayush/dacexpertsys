import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './config/db.js';
import { ensureWorkflowSchema } from './config/bootstrap.js';
import usersRoutes from './routes/users.routes.js';
import casesRoutes from './routes/cases.routes.js';
import policiesRoutes from './routes/policies.routes.js';
import authRoutes from './routes/auth.routes.js';
import notificationsRoutes from './routes/notifications.routes.js';
import evidenceRoutes from './routes/evidence.routes.js';
import rulesRoutes from './routes/rules.routes.js';
import chatbotRoutes from './routes/chatbot.routes.js';
import emailRoutes from './routes/email.routes.js';
import translateRoutes from './routes/translate.routes.js';
import paymentsRoutes from './routes/payments.routes.js';
import searchRoutes from './routes/search.routes.js';
import { verifyToken } from './middleware/auth.middleware.js';

const app = express();
const PORT = process.env.PORT || 5000;
// Vite serves this project at localhost:5173 by default. Additional exact
// origins (for staging/production) must be listed in CORS_ORIGINS.
const allowedOrigins = new Set(
  (process.env.CORS_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
);
const corsOptions = {
  origin(origin, callback) {
    // Non-browser clients may omit Origin; browsers must match the allowlist.
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
};
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, 'uploads');
const evidenceDir = path.join(uploadsDir, 'evidence');

if (!fs.existsSync(evidenceDir)) {
  fs.mkdirSync(evidenceDir, { recursive: true });
}

// CORS must run before parsing, authentication, and all API routes so browser
// preflight requests are answered without requiring a JWT.
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

// Serve the built Vite frontend (npm run build -> dist/) from this same
// service in production. Browser navigations (GET + Accept: text/html) get
// index.html so client-side routes like /cases/:id survive a page refresh
// instead of hitting the API routes that share those prefixes.
const distDir = path.join(__dirname, '..', 'dist');
const indexHtml = path.join(distDir, 'index.html');
if (fs.existsSync(indexHtml)) {
  app.use(express.static(distDir, { index: false }));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    if (!req.accepts('html') || req.headers.accept?.startsWith('application/json')) {
      return next();
    }
    return res.sendFile(indexHtml);
  });
}

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
app.use('/api/chat', verifyToken, chatbotRoutes);
app.use('/api/policies', verifyToken, policiesRoutes);
app.use('/api/email', verifyToken, emailRoutes);
app.use('/api/translate', verifyToken, translateRoutes);
app.use('/api/payments', verifyToken, paymentsRoutes);
app.use('/api/search', verifyToken, searchRoutes);

async function startServer() {
  try {
    await ensureWorkflowSchema();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Backend server listening on 0.0.0.0:${PORT}`);
    });
  } catch (error) {
    console.error('Server startup failed:', error);
    process.exit(1);
  }
}

startServer();

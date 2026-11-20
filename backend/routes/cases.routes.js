import { Router } from 'express';
import crypto from 'crypto';
import multer from 'multer';
import path from 'path';
import { MAX_EVIDENCE_BYTES } from '../services/storage.service.js';
import {
  createCaseController,
  createGroupCasesController,
  getGroupCasesController,
  getAllCasesController,
  getCasesSummaryController,
  getCaseByIdController,
  updateCaseController,
  deleteCaseController,
  approveCaseController,
  warnCaseController,
  getCaseHistoryController,
  getStudentProfileController,
} from '../controllers/cases.controller.js';
import { studentHistoryController } from '../controllers/chatbot.controller.js';
import { generateCaseRecommendationService, isRecommendationConfigured } from '../services/recommendation.service.js';
import { getCaseMeetingsService, getStudentMeetingsService, scheduleCaseMeetingService } from '../services/meetings.service.js';
import pool from '../config/db.js';
import { uploadEvidenceController, getCaseEvidenceController } from '../controllers/evidence.controller.js';
import {
  getCaseTimelineController,
  createCaseTimelineController,
  updateCaseTimelineController,
  deleteCaseTimelineController,
} from '../controllers/timeline.controller.js';
import { requireRoles } from '../middleware/auth.middleware.js';

const router = Router();

// Evidence is kept in memory only long enough to upload it to Supabase Storage.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_EVIDENCE_BYTES, files: 1 },
  fileFilter: (req, file, cb) => {
    const isPdf = file.mimetype === 'application/pdf';
    const isImage = file.mimetype.startsWith('image/');
    const isVideo = file.mimetype.startsWith('video/');
    if (isPdf || isImage || isVideo) {
      cb(null, true);
      return;
    }
    cb(new Error('UNSUPPORTED_FILE_TYPE'));
  },
});

// Runs multer and turns its errors into JSON 400 responses (instead of Express's HTML 500).
function uploadSingleEvidence(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (!err) {
      // Name the stored object with a random id and the original extension.
      if (req.file) {
        req.file.extension = path.extname(req.file.originalname || '').toLowerCase().slice(0, 10);
        req.file.randomId = crypto.randomBytes(8).toString('hex');
      }
      return next();
    }
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Evidence file exceeds the 2 MB limit.' });
    }
    if (err.message === 'UNSUPPORTED_FILE_TYPE') {
      return res.status(400).json({ error: 'Unsupported file type. Use a PDF, image, or video.' });
    }
    return res.status(400).json({ error: err.message || 'Invalid upload' });
  });
}

router.get('/', getAllCasesController);
router.get('/history', getCaseHistoryController);
router.get('/summary', getCasesSummaryController);
router.get('/student/:enrollmentNo', requireRoles('warden', 'chief_warden', 'dsw', 'admin'), studentHistoryController);
router.get('/student/:enrollmentNo/profile', requireRoles('warden', 'chief_warden', 'dsw', 'admin'), getStudentProfileController);
// Student dashboard: the student's own DAC meetings.
router.get('/meetings/mine', requireRoles('student'), async (req, res) => {
  try {
    return res.status(200).json(await getStudentMeetingsService(Number(req.user?.sub)));
  } catch (error) {
    console.error('Error fetching student meetings:', error);
    return res.status(500).json({ error: 'Failed to fetch meetings' });
  }
});

router.get('/:id/timeline', getCaseTimelineController);
router.post('/:id/timeline', requireRoles('admin'), createCaseTimelineController);
router.put('/:id/timeline/:timelineId', requireRoles('admin'), updateCaseTimelineController);
router.delete('/:id/timeline/:timelineId', requireRoles('admin'), deleteCaseTimelineController);
router.post('/upload-evidence', requireRoles('warden', 'chief_warden'), uploadSingleEvidence, uploadEvidenceController);
router.get('/:id/evidence', getCaseEvidenceController);
// Only wardens and chief wardens register cases.
router.post('/', requireRoles('warden', 'chief_warden'), createCaseController);
router.post('/group', requireRoles('warden', 'chief_warden'), createGroupCasesController);
router.get('/:id/group', requireRoles('warden', 'chief_warden', 'dsw', 'admin'), getGroupCasesController);
router.get('/:id', getCaseByIdController);
router.put('/:id', requireRoles('warden', 'chief_warden', 'dsw', 'admin'), updateCaseController);
router.delete('/:id', requireRoles('admin'), deleteCaseController);
router.put('/:id/approve', requireRoles('chief_warden', 'dsw', 'admin'), approveCaseController);
router.put('/:id/warn', requireRoles('chief_warden', 'dsw', 'admin'), warnCaseController);

// In-person DAC meeting with the student, scheduled by the Admin at the final stage.
router.post('/:id/meetings', requireRoles('admin'), async (req, res) => {
  const caseId = Number(req.params.id);
  if (!Number.isInteger(caseId) || caseId <= 0) {
    return res.status(400).json({ error: 'A valid case id is required' });
  }
  try {
    const meeting = await scheduleCaseMeetingService(
      caseId,
      { scheduledAt: req.body?.scheduled_at, location: req.body?.location, notes: req.body?.notes },
      { id: Number(req.user?.sub), role: String(req.user?.role || '').toLowerCase() },
    );
    return res.status(201).json(meeting);
  } catch (error) {
    if (error?.status) return res.status(error.status).json({ error: error.message });
    console.error('Error scheduling meeting:', error);
    return res.status(500).json({ error: 'Failed to schedule the meeting' });
  }
});

router.get('/:id/meetings', requireRoles('chief_warden', 'dsw', 'admin', 'student'), async (req, res) => {
  const caseId = Number(req.params.id);
  if (!Number.isInteger(caseId) || caseId <= 0) {
    return res.status(400).json({ error: 'A valid case id is required' });
  }
  try {
    if (String(req.user?.role).toLowerCase() === 'student') {
      const owner = await pool.query('SELECT student_id FROM cases WHERE id = $1', [caseId]);
      if (Number(owner.rows[0]?.student_id) !== Number(req.user?.sub)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }
    return res.status(200).json(await getCaseMeetingsService(caseId));
  } catch (error) {
    console.error('Error fetching meetings:', error);
    return res.status(500).json({ error: 'Failed to fetch meetings' });
  }
});

// AI penalty recommendation (Groq), generated on demand from the case page. Advisory; nothing is saved.
router.post('/:id/recommendation', requireRoles('chief_warden', 'dsw', 'admin'), async (req, res) => {
  const caseId = Number(req.params.id);
  if (!Number.isInteger(caseId) || caseId <= 0) {
    return res.status(400).json({ error: 'A valid case id is required' });
  }
  if (!isRecommendationConfigured()) {
    return res.status(503).json({ error: 'AI recommendations are not configured. Set GROQ_API_KEY in .env.' });
  }
  try {
    // ?refresh=1 (Regenerate) asks for a new recommendation instead of a recent one.
    const refresh = ['1', 'true'].includes(String(req.query?.refresh || req.body?.refresh || '').toLowerCase());
    const recommendation = await generateCaseRecommendationService(caseId, { refresh });
    if (!recommendation) return res.status(404).json({ error: 'Case not found' });
    return res.status(200).json(recommendation);
  } catch (error) {
    if (error?.status === 409) return res.status(409).json({ error: error.message });
    if (error?.status === 429) {
      return res.status(503).json({ error: 'The AI service is busy right now (rate limit). Please try again in a minute.' });
    }
    console.error('Recommendation error:', error?.message || error);
    return res.status(502).json({ error: 'Could not generate the AI recommendation. Please try again.' });
  }
});

export default router;

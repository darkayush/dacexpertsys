import { Router } from 'express';
import crypto from 'crypto';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  createCaseController,
  getAllCasesController,
  getCaseByIdController,
  updateCaseController,
  deleteCaseController,
  approveCaseController,
  getCaseHistoryController,
} from '../controllers/cases.controller.js';
import { uploadEvidenceController } from '../controllers/evidence.controller.js';
import {
  getCaseTimelineController,
  createCaseTimelineController,
  updateCaseTimelineController,
  deleteCaseTimelineController,
} from '../controllers/timeline.controller.js';
import { requireRoles } from '../middleware/auth.middleware.js';

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const evidenceDir = path.join(__dirname, '..', 'uploads', 'evidence');

const storage = multer.diskStorage({
  destination: evidenceDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const id = crypto.randomBytes(8).toString('hex');
    cb(null, `${Date.now()}-${id}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const isPdf = file.mimetype === 'application/pdf';
    const isImage = file.mimetype.startsWith('image/');
    const isVideo = file.mimetype.startsWith('video/');
    if (isPdf || isImage || isVideo) {
      cb(null, true);
      return;
    }
    cb(new Error('Unsupported file type'));
  },
});

router.get('/', getAllCasesController);
router.get('/history', getCaseHistoryController);
router.get('/:id/timeline', getCaseTimelineController);
router.post('/:id/timeline', requireRoles('admin'), createCaseTimelineController);
router.put('/:id/timeline/:timelineId', requireRoles('admin'), updateCaseTimelineController);
router.delete('/:id/timeline/:timelineId', requireRoles('admin'), deleteCaseTimelineController);
router.post('/upload-evidence', upload.single('file'), uploadEvidenceController);
router.post('/', createCaseController);
router.get('/:id', getCaseByIdController);
router.put('/:id', updateCaseController);
router.delete('/:id', requireRoles('admin'), deleteCaseController);
router.put('/:id/approve', approveCaseController);

export default router;

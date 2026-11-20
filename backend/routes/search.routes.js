import { Router } from 'express';
import { globalSearchController } from '../controllers/search.controller.js';

// Global header search. Mounted at /api/search behind verifyToken; results are scoped
// to the requester's role in the controller and services.
const router = Router();

router.get('/', globalSearchController);

export default router;

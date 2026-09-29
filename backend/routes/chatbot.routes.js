import { Router } from 'express';
import { chatController } from '../controllers/chatbot.controller.js';
const router = Router();
router.post('/', chatController);
export default router;

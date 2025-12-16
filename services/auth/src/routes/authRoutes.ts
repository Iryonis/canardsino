import { Router } from 'express';
import { register, login, refresh, getProfile, registerValidation, loginValidation } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/refresh', refresh);

// Protected routes
router.get('/profile', authenticate, getProfile);

export default router;

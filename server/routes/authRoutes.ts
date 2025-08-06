import express from 'express';
import { 
  startVerification, 
  completeVerification, 
  getUserProfile, 
  updateUserProfile,
  initiateSecondaryVerification,
  initiateEmailVerification,
  initiatePhoneVerification,
  completeEmailVerification,
  completePhoneVerification,
  logout
} from '../controllers/authController';
import { authenticate } from '../middlewares/authMiddleware';

const router = express.Router();

// Public auth routes
router.post('/start-verification', startVerification);
router.post('/complete-verification', completeVerification);
router.post('/logout', logout);

// Protected routes (require authentication)
router.get('/profile', authenticate, getUserProfile);
router.patch('/profile', authenticate, updateUserProfile);
router.post('/verify-secondary', authenticate, initiateSecondaryVerification);
router.post('/initiate-email-verification', authenticate, initiateEmailVerification);
router.post('/initiate-phone-verification', authenticate, initiatePhoneVerification);
router.post('/complete-email-verification', authenticate, completeEmailVerification);
router.post('/complete-phone-verification', authenticate, completePhoneVerification);

export default router;
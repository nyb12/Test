import express from 'express';
import { 
  createUser, 
  getUsers, 
  getUserById, 
  verifyEmail, 
  verifyPhone 
} from '../controllers/userController';

const router = express.Router();

// User CRUD routes
router.post('/', createUser);
router.get('/', getUsers);
router.get('/:id', getUserById);

// Verification routes
router.post('/:id/verify-email', verifyEmail);
router.post('/:id/verify-phone', verifyPhone);

export default router;
import { Request, Response } from 'express';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

// Validation schemas
const createUserSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  signUpMethod: z.enum(['EMAIL', 'PHONE'])
}).refine(data => data.email || data.phone, {
  message: "Either email or phone must be provided"
});

export const createUser = async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validatedData = createUserSchema.parse(req.body);
    
    // Create user in the database
    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        phone: validatedData.phone,
        signUpMethod: validatedData.signUpMethod as SignUpMethod,
        isEmailVerified: false,
        isPhoneVerified: false
      }
    });
    
    res.status(201).json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

export const getUsers = async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { id }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const user = await prisma.user.update({
      where: { id },
      data: { isEmailVerified: true }
    });
    
    res.json(user);
  } catch (error) {
    console.error('Error verifying email:', error);
    res.status(500).json({ error: 'Failed to verify email' });
  }
};

export const verifyPhone = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const user = await prisma.user.update({
      where: { id },
      data: { isPhoneVerified: true }
    });
    
    res.json(user);
  } catch (error) {
    console.error('Error verifying phone:', error);
    res.status(500).json({ error: 'Failed to verify phone' });
  }
};
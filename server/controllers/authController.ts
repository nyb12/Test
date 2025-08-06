import { Request, Response } from 'express';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq, or } from 'drizzle-orm';
import crypto from 'crypto';
import { twilioService } from '../services/twilioService';
import { externalApiService } from '../services/externalApiService';
import 'express-session';

// Augment express-session to include user property
declare module 'express-session' {
  interface SessionData {
    user?: any;
    emailVerificationToken?: string;
    emailForVerification?: string;
  }
}

/**
 * Start the verification process for a user
 * Sends verification code via SMS or email based on sign up method
 */
export const startVerification = async (req: Request, res: Response) => {
  try {
    const { contactInfo, signUpMethod } = req.body;
    
    if (!contactInfo) {
      return res.status(400).json({ message: 'Contact information is required' });
    }

    if (!['EMAIL', 'PHONE'].includes(signUpMethod)) {
      return res.status(400).json({ message: 'Invalid sign up method' });
    }

    // Check if user already exists with this contact info
    const existingUsers = signUpMethod === 'EMAIL' 
      ? await db.select().from(users).where(eq(users.email, contactInfo)).limit(1)
      : await db.select().from(users).where(eq(users.phone, contactInfo)).limit(1);
    const existingUser = existingUsers[0];

    // Format phone number consistently if this is a phone verification
    let formattedContactInfo = contactInfo;
    if (signUpMethod === 'PHONE') {
      formattedContactInfo = formattedContactInfo.trim();
      if (!formattedContactInfo.startsWith('+')) {
        if (formattedContactInfo.startsWith('1')) {
          formattedContactInfo = '+' + formattedContactInfo;
        } else {
          formattedContactInfo = '+1' + formattedContactInfo;
        }
      }
      console.log(`Using formatted phone for initial verification: ${formattedContactInfo}`);
    }
    
    // Send verification code based on sign up method
    let verificationResult;
    if (signUpMethod === 'EMAIL') {
      console.log('Sending email verification for:', contactInfo);
      verificationResult = await externalApiService.sendEmailOtp(contactInfo);
      console.log('Email verification result:', verificationResult);
      
      if (verificationResult.success && verificationResult.data) {
        // Store session token in session for email verification
        (req.session as any).emailVerificationToken = verificationResult.data.sessionToken;
        (req.session as any).emailForVerification = contactInfo;
        console.log('Session token stored:', verificationResult.data.sessionToken);
      }
    } else {
      verificationResult = await twilioService.sendSmsVerification(formattedContactInfo);
    }

    if (!verificationResult.success) {
      return res.status(500).json({ 
        message: 'Failed to send verification code', 
        error: verificationResult.error || verificationResult.message 
      });
    }

    return res.status(200).json({ 
      message: 'Verification code sent',
      isNewUser: !existingUser,
      contactInfo,
      signUpMethod
    });
  } catch (error: any) {
    console.error('Error starting verification:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

/**
 * Complete verification process
 * Checks the verification code and creates/logs in the user if approved
 */
export const completeVerification = async (req: Request, res: Response) => {
  try {
    const { contactInfo, signUpMethod, code, roleId, inputPreference } = req.body;
    
    if (!contactInfo || !code || !signUpMethod) {
      return res.status(400).json({ message: 'Contact information, verification code, and sign up method are required' });
    }

    // Format phone number consistently if this is a phone verification
    let formattedContactInfo = contactInfo;
    if (signUpMethod === 'PHONE') {
      formattedContactInfo = formattedContactInfo.trim();
      if (!formattedContactInfo.startsWith('+')) {
        if (formattedContactInfo.startsWith('1')) {
          formattedContactInfo = '+' + formattedContactInfo;
        } else {
          formattedContactInfo = '+1' + formattedContactInfo;
        }
      }
      console.log(`Using formatted phone for verification check: ${formattedContactInfo}`);
    }
    
    // Check verification code based on sign up method
    let verificationCheck;
    if (signUpMethod === 'EMAIL') {
      // Get session token from session
      const sessionToken = (req.session as any).emailVerificationToken;
      const sessionEmail = (req.session as any).emailForVerification;
      
      console.log('Verification check - Session token:', sessionToken ? 'present' : 'missing');
      console.log('Verification check - Session email:', sessionEmail);
      console.log('Verification check - Contact info:', contactInfo);
      
      if (!sessionToken || sessionEmail !== contactInfo) {
        console.log('Session validation failed');
        return res.status(400).json({ message: 'Invalid session or email mismatch' });
      }
      
      verificationCheck = await externalApiService.verifyEmailOtp(contactInfo, code, sessionToken);
      
      if (!verificationCheck.success || !verificationCheck.data?.isVerified) {
        return res.status(400).json({ 
          message: 'Invalid verification code', 
          error: verificationCheck.error || verificationCheck.message 
        });
      }
      
      // Clear session data after successful verification
      delete (req.session as any).emailVerificationToken;
      delete (req.session as any).emailForVerification;
    } else {
      verificationCheck = await twilioService.checkVerification(formattedContactInfo, code);
      
      if (!verificationCheck.success || !verificationCheck.valid) {
        return res.status(400).json({ message: 'Invalid verification code', error: verificationCheck.error });
      }
    }

    // Either find existing user or create a new one
    const existingUserQuery = signUpMethod === 'EMAIL'
      ? await db.select().from(users).where(eq(users.email, contactInfo)).limit(1)
      : await db.select().from(users).where(eq(users.phone, contactInfo)).limit(1);
    let user = existingUserQuery[0];

    if (!user) {
      // Create new user with crypto.randomUUID()
      const userId = crypto.randomUUID();
      const now = new Date();
      const [newUser] = await db.insert(users).values({
        id: userId,
        accountId: "979492c8-eb25-4c52-973f-6ae037aed999",
        email: signUpMethod === 'EMAIL' ? contactInfo : null,
        phone: signUpMethod === 'PHONE' ? contactInfo : null,
        isEmailVerified: signUpMethod === 'EMAIL',
        isPhoneVerified: signUpMethod === 'PHONE',
        signUpMethod,
        roleId: roleId ? parseInt(roleId.toString()) : 1, // Default to Maintenance Tech role
        inputPreference: inputPreference || 'KEYBOARD',
        createdAt: now,
        updatedAt: now
      }).returning();
      user = newUser;
    } else {
      // Update existing user's verification status
      const [updatedUser] = await db.update(users)
        .set({
          isEmailVerified: signUpMethod === 'EMAIL' ? true : user.isEmailVerified,
          isPhoneVerified: signUpMethod === 'PHONE' ? true : user.isPhoneVerified,
          updatedAt: new Date()
        })
        .where(eq(users.id, user.id))
        .returning();
      user = updatedUser;
    }

    // Store user in session
    req.session.user = {
      id: user.id,
      email: user.email,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      roleId: user.roleId,
      signUpMethod: user.signUpMethod,
      inputPreference: user.inputPreference
    };

    return res.status(200).json({
      message: 'Verification successful',
      user
    });
  } catch (error: any) {
    console.error('Error completing verification:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

/**
 * Logout user by destroying session
 */
export const logout = async (req: Request, res: Response) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session:', err);
        return res.status(500).json({ message: 'Failed to logout' });
      }
      res.clearCookie('connect.sid'); // Clear the session cookie
      return res.status(200).json({ message: 'Logged out successfully' });
    });
  } catch (error: any) {
    console.error('Error during logout:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

/**
 * Get the currently authenticated user profile
 */
export const getUserProfile = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const [user] = await db.select().from(users).where(eq(users.id, req.user.id)).limit(1);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json(user);
  } catch (error: any) {
    console.error('Error getting user profile:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

/**
 * Update user profile information
 */
export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { roleId, profilePhoto, inputPreference, firstName, lastName, email, phone } = req.body;

    if (roleId !== undefined && roleId !== null) {
      // Validate that the role exists
      const { roles } = await import("@shared/schema");
      const [roleExists] = await db.select().from(roles).where(eq(roles.id, parseInt(roleId.toString()))).limit(1);
      
      if (!roleExists) {
        return res.status(400).json({ message: 'Invalid role selected' });
      }
    }

    if (inputPreference !== undefined && !['VOICE', 'KEYBOARD'].includes(inputPreference)) {
      return res.status(400).json({ message: 'Invalid input preference. Must be VOICE or KEYBOARD' });
    }

    const updateData: any = {
      updatedAt: new Date()
    };

    if (roleId !== undefined) {
      updateData.roleId = roleId ? parseInt(roleId.toString()) : null;
    }

    if (profilePhoto !== undefined) {
      updateData.profilePhoto = profilePhoto;
    }

    if (inputPreference !== undefined) {
      updateData.inputPreference = inputPreference;
    }

    if (firstName !== undefined) {
      updateData.firstName = firstName;
    }

    if (lastName !== undefined) {
      updateData.lastName = lastName;
    }

    if (email !== undefined) {
      updateData.email = email;
      updateData.isEmailVerified = false; // Reset verification when email changes
    }

    if (phone !== undefined) {
      updateData.phone = phone;
      updateData.isPhoneVerified = false; // Reset verification when phone changes
    }

    const [updatedUser] = await db.update(users)
      .set(updateData)
      .where(eq(users.id, req.user.id))
      .returning();

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update session data
    req.session.user = {
      ...req.session.user,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      roleId: updatedUser.roleId,
      inputPreference: updatedUser.inputPreference
    };

    res.json(updatedUser);
  } catch (error: any) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

/**
 * Initiate email verification for current user
 */
export const initiateEmailVerification = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Get the user
    const [user] = await db.select().from(users).where(eq(users.id, req.user.id)).limit(1);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.email) {
      return res.status(400).json({ message: 'No email address on file' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ message: 'Email is already verified' });
    }

    // Send verification code via email
    const verificationResult = await externalApiService.sendEmailOtp(user.email);
    
    if (verificationResult.success && verificationResult.data) {
      // Store session token in session for email verification
      (req.session as any).emailVerificationToken = verificationResult.data.sessionToken;
      (req.session as any).emailForVerification = user.email;
    }

    if (!verificationResult.success) {
      return res.status(500).json({ message: 'Failed to send verification email', error: verificationResult.error });
    }

    return res.status(200).json({
      message: 'Verification email sent',
      email: user.email
    });
  } catch (error: any) {
    console.error('Error initiating email verification:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

/**
 * Initiate phone verification for current user
 */
export const initiatePhoneVerification = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Get the user
    const [user] = await db.select().from(users).where(eq(users.id, req.user.id)).limit(1);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.phone) {
      return res.status(400).json({ message: 'No phone number on file' });
    }

    if (user.isPhoneVerified) {
      return res.status(400).json({ message: 'Phone is already verified' });
    }

    // Format phone number consistently
    let formattedPhone = user.phone.trim();
    if (!formattedPhone.startsWith('+')) {
      if (formattedPhone.startsWith('1')) {
        formattedPhone = '+' + formattedPhone;
      } else {
        formattedPhone = '+1' + formattedPhone;
      }
    }

    // Send verification code via SMS
    const verificationResult = await twilioService.sendSmsVerification(formattedPhone);

    if (!verificationResult.success) {
      return res.status(500).json({ message: 'Failed to send verification SMS', error: verificationResult.error });
    }

    return res.status(200).json({
      message: 'Verification SMS sent',
      phone: user.phone
    });
  } catch (error: any) {
    console.error('Error initiating phone verification:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

/**
 * Complete email verification for existing user
 */
export const completeEmailVerification = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { verificationCode } = req.body;

    if (!verificationCode || verificationCode.length !== 6) {
      return res.status(400).json({ message: 'Valid 6-digit verification code is required' });
    }

    // Get the user
    const [user] = await db.select().from(users).where(eq(users.id, req.user.id)).limit(1);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.email) {
      return res.status(400).json({ message: 'No email address on file' });
    }

    // Get session token from session
    const sessionToken = (req.session as any).emailVerificationToken;
    const sessionEmail = (req.session as any).emailForVerification;
    
    if (!sessionToken || sessionEmail !== user.email) {
      return res.status(400).json({ message: 'No active verification session. Please request a new verification code.' });
    }
    
    // Verify the code with external API
    const verificationCheck = await externalApiService.verifyEmailOtp(user.email, verificationCode, sessionToken);
    
    if (!verificationCheck.success || !verificationCheck.data?.isVerified) {
      return res.status(400).json({ 
        message: 'Invalid verification code', 
        error: verificationCheck.error || verificationCheck.message 
      });
    }
    
    // Clear session data after successful verification
    delete (req.session as any).emailVerificationToken;
    delete (req.session as any).emailForVerification;

    // Update user's email verification status
    const [updatedUser] = await db.update(users)
      .set({
        isEmailVerified: true,
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id))
      .returning();

    return res.status(200).json({
      message: 'Email verified successfully',
      user: updatedUser
    });
  } catch (error: any) {
    console.error('Error completing email verification:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

/**
 * Complete phone verification for existing user
 */
export const completePhoneVerification = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { verificationCode } = req.body;

    if (!verificationCode || verificationCode.length !== 6) {
      return res.status(400).json({ message: 'Valid 6-digit verification code is required' });
    }

    // Get the user
    const [user] = await db.select().from(users).where(eq(users.id, req.user.id)).limit(1);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.phone) {
      return res.status(400).json({ message: 'No phone number on file' });
    }

    // Format phone number consistently
    let formattedPhone = user.phone.trim();
    if (!formattedPhone.startsWith('+')) {
      if (formattedPhone.startsWith('1')) {
        formattedPhone = '+' + formattedPhone;
      } else {
        formattedPhone = '+1' + formattedPhone;
      }
    }

    // Verify the code with Twilio
    const verificationCheck = await twilioService.checkVerification(formattedPhone, verificationCode);
    
    if (!verificationCheck.success || !verificationCheck.valid) {
      return res.status(400).json({ message: 'Invalid verification code', error: verificationCheck.error });
    }

    // Update user's phone verification status
    const [updatedUser] = await db.update(users)
      .set({
        isPhoneVerified: true,
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id))
      .returning();

    return res.status(200).json({
      message: 'Phone verified successfully',
      user: updatedUser
    });
  } catch (error: any) {
    console.error('Error completing phone verification:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

/**
 * Initiate secondary contact method verification
 */
export const initiateSecondaryVerification = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { contactType, contactInfo } = req.body;

    if (!contactType || !contactInfo) {
      return res.status(400).json({ message: 'Contact type and information are required' });
    }

    if (!['EMAIL', 'PHONE'].includes(contactType)) {
      return res.status(400).json({ message: 'Invalid contact type' });
    }

    // Get the user
    const [user] = await db.select().from(users).where(eq(users.id, req.user.id)).limit(1);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user with the new contact info
    await db.update(users)
      .set({
        email: contactType === 'EMAIL' ? contactInfo : user.email,
        phone: contactType === 'PHONE' ? contactInfo : user.phone,
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id));

    // Format phone number consistently if this is a phone verification
    let formattedContactInfo = contactInfo;
    if (contactType === 'PHONE') {
      formattedContactInfo = formattedContactInfo.trim();
      if (!formattedContactInfo.startsWith('+')) {
        if (formattedContactInfo.startsWith('1')) {
          formattedContactInfo = '+' + formattedContactInfo;
        } else {
          formattedContactInfo = '+1' + formattedContactInfo;
        }
      }
      console.log(`Using formatted phone for secondary verification: ${formattedContactInfo}`);
    }
    
    // Send verification code
    let verificationResult;
    if (contactType === 'EMAIL') {
      verificationResult = await externalApiService.sendEmailOtp(contactInfo);
      
      if (verificationResult.success && verificationResult.data) {
        // Store session token in session for email verification
        (req.session as any).emailVerificationToken = verificationResult.data.sessionToken;
        (req.session as any).emailForVerification = contactInfo;
      }
    } else {
      verificationResult = await twilioService.sendSmsVerification(formattedContactInfo);
    }

    if (!verificationResult.success) {
      return res.status(500).json({ message: 'Failed to send verification code', error: verificationResult.error });
    }

    return res.status(200).json({
      message: 'Verification code sent',
      contactType,
      contactInfo
    });
  } catch (error: any) {
    console.error('Error initiating secondary verification:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};
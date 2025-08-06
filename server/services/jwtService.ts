import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'development-jwt-secret';

export const jwtService = {
  /**
   * Generate JWT token
   * @param payload - The data to include in the token
   * @returns JWT token string
   */
  generateToken(payload: any): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
  },

  /**
   * Verify and decode JWT token
   * @param token - JWT token to verify
   * @returns Decoded token payload or null if invalid
   */
  verifyToken(token: string): any {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      console.error('Error verifying token:', error);
      return null;
    }
  }
};
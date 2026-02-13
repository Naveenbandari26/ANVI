import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/ApiError';
import { getJWTSecret } from '../config/jwt';

export interface AuthRequest extends Request {
  userId?: string;
}

export const authenticate = (
  req: AuthRequest,
  // @ts-ignore
  res: Response,
  next: NextFunction
): void => {
  const jwtSecret = getJWTSecret();
  
  try {
    const authHeader = req.headers.authorization;

    // Only log authentication attempts for debugging (reduce noise)
    // console.log('🔐 Authentication middleware called');
    // console.log('   URL:', req.method, req.path);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ No valid authorization header found for:', req.method, req.path);
      throw new ApiError('Authorization token required', 401);
    }

    const token = authHeader.substring(7);

    if (!jwtSecret || jwtSecret === 'your-secret-key') {
      console.warn('⚠️ JWT_SECRET is not set or using default value - this is insecure!');
    }

    const decoded = jwt.verify(token, jwtSecret) as { userId: string };
    req.userId = decoded.userId;

    // Only log successful auth for debugging
    // console.log('✅ Token verified successfully, userId:', req.userId);
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      console.error('❌ Token expired for:', req.method, req.path);
      console.error('   Expired at:', new Date((error as any).expiredAt * 1000).toISOString());
      console.error('   Current time:', new Date().toISOString());
      next(new ApiError('Token expired. Please log in again.', 401));
      return;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      // Only log detailed errors for the first few occurrences to reduce noise
      const errorKey = `jwt_error_${error.message}`;
      const errorCount = (global as any)[errorKey] || 0;
      
      if (errorCount < 3) {
        console.error('❌ JWT verification failed for:', req.method, req.path);
        console.error('   Error:', error.message);
        
        // Try to decode without verification to see if token structure is valid
        try {
          const authHeader = req.headers.authorization;
          const token = authHeader?.substring(7);
          if (token) {
            const decoded = jwt.decode(token) as any;
            if (decoded) {
              console.error('   Token structure is valid, but signature verification failed');
              console.error('   Token issued at:', new Date(decoded.iat * 1000).toISOString());
              console.error('   Token expires at:', new Date(decoded.exp * 1000).toISOString());
              console.error('   💡 This usually means:');
              console.error('      1. Token was signed with a different JWT_SECRET');
              console.error('      2. Server was restarted with a new JWT_SECRET');
              console.error('      3. Solution: User needs to log out and log back in');
            }
          }
        } catch (decodeError) {
          // Ignore decode errors
        }
        
        (global as any)[errorKey] = errorCount + 1;
      }
      
      next(new ApiError('Invalid token. Please log in again.', 401));
      return;
    }
    console.error('❌ Authentication error:', error);
    next(error);
  }
};


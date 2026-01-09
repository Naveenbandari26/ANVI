import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { ApiResponse } from '../types/api.types';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userData = req.body;
      const result = await this.authService.register(userData);
      
      const response: ApiResponse = {
        success: true,
        message: 'User registered successfully',
        data: result,
      };
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = req.body;
      const result = await this.authService.login(email, password);
      
      if (!result) {
        res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'Login successful',
        data: result,
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // In a real implementation, you might want to blacklist the token
      const response: ApiResponse = {
        success: true,
        message: 'Logout successful',
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = req.body;
      const result = await this.authService.refreshToken(refreshToken);
      
      if (!result) {
        res.status(401).json({
          success: false,
          message: 'Invalid refresh token',
        });
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'Token refreshed successfully',
        data: result,
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };
}


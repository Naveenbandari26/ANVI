import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';
import { ApiResponse } from '../types/api.types';

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  getAllUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const users = await this.userService.getAllUsers();
      const response: ApiResponse = {
        success: true,
        message: 'Users retrieved successfully',
        data: users,
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getUserById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const user = await this.userService.getUserById(id);
      
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'User retrieved successfully',
        data: user,
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  createUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userData = req.body;
      const user = await this.userService.createUser(userData);
      
      const response: ApiResponse = {
        success: true,
        message: 'User created successfully',
        data: user,
      };
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  updateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const userData = req.body;
      const user = await this.userService.updateUser(id, userData);
      
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'User updated successfully',
        data: user,
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  deleteUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const deleted = await this.userService.deleteUser(id);
      
      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'User deleted successfully',
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };
}


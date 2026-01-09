import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserService } from './user.service';
import { RegisterDto, LoginDto, AuthResponse } from '../types/auth.types';

export class AuthService {
  private userService: UserService;
  private jwtSecret: string;
  private jwtExpiresIn: string;

  constructor() {
    this.userService = new UserService();
    this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
  }

  async register(userData: RegisterDto): Promise<AuthResponse> {
    // Check if user already exists
    const existingUser = await this.userService.getUserByEmail(userData.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    // Create user
    const user = await this.userService.createUser({
      ...userData,
      password: hashedPassword,
    });

    // Generate tokens
    const tokens = this.generateTokens(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      ...tokens,
    };
  }

  async login(email: string, password: string): Promise<AuthResponse | null> {
    // Find user by email with password
    const user = await this.userService.getUserByEmailWithPassword(email);
    if (!user) {
      return null;
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    // Generate tokens
    const tokens = this.generateTokens(user._id.toString());

    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
      },
      ...tokens,
    };
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string } | null> {
    try {
      const decoded = jwt.verify(refreshToken, this.jwtSecret) as { userId: string };
      const newAccessToken = this.generateAccessToken(decoded.userId);
      return { accessToken: newAccessToken };
    } catch (error) {
      return null;
    }
  }

  private generateTokens(userId: string): { accessToken: string; refreshToken: string } {
    const accessToken = this.generateAccessToken(userId);
    const refreshToken = jwt.sign({ userId }, this.jwtSecret, { expiresIn: '30d' });
    
    return {
      accessToken,
      refreshToken,
    };
  }

  private generateAccessToken(userId: string): string {
    return jwt.sign({ userId }, this.jwtSecret, { expiresIn: this.jwtExpiresIn });
  }
}


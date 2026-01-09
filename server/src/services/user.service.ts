import { UserModel, IUser } from '../models/user.schema';
import { CreateUserDto, UpdateUserDto } from '../types/user.types';
import { User } from '../models/user.model';

export class UserService {
  async getAllUsers(): Promise<User[]> {
    const users = await UserModel.find().select('-password').lean();
    return users.map(this.mapToUser);
  }

  async getUserById(id: string): Promise<User | null> {
    const user = await UserModel.findById(id).select('-password').lean();
    if (!user) {
      return null;
    }
    return this.mapToUser(user);
  }

  async createUser(userData: CreateUserDto): Promise<User> {
    const newUser = new UserModel(userData);
    const savedUser = await newUser.save();
    const userObj = savedUser.toObject();
    delete userObj.password;
    return this.mapToUser(userObj);
  }

  async updateUser(id: string, userData: UpdateUserDto): Promise<User | null> {
    const updatedUser = await UserModel.findByIdAndUpdate(
      id,
      { ...userData, updatedAt: new Date() },
      { new: true, runValidators: true }
    )
      .select('-password')
      .lean();

    if (!updatedUser) {
      return null;
    }
    return this.mapToUser(updatedUser);
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await UserModel.findByIdAndDelete(id);
    return result !== null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const user = await UserModel.findOne({ email: email.toLowerCase() }).select('-password').lean();
    if (!user) {
      return null;
    }
    return this.mapToUser(user);
  }

  // Helper method to get user with password (for authentication)
  async getUserByEmailWithPassword(email: string): Promise<IUser | null> {
    const user = await UserModel.findOne({ email: email.toLowerCase() }).select('+password');
    return user;
  }

  // Map MongoDB document to User interface
  private mapToUser(doc: any): User {
    return {
      id: doc._id.toString(),
      email: doc.email,
      name: doc.name,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}


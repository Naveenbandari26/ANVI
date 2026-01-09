// User interface for application use (without password in responses)
export interface User {
  id: string;
  email: string;
  password?: string; // Optional since we don't always include it
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

// Export IUser from schema for type consistency
export { IUser } from './user.schema';


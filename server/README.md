# ANVI Server

Backend API server for the ANVI application built with Node.js, Express, and TypeScript.

## Project Structure

```
server/
├── src/
│   ├── config/          # Configuration files
│   │   └── database.ts
│   ├── controllers/     # Request handlers
│   │   ├── auth.controller.ts
│   │   └── user.controller.ts
│   ├── middleware/      # Custom middleware
│   │   ├── authenticate.ts
│   │   ├── errorHandler.ts
│   │   ├── notFoundHandler.ts
│   │   └── validateRequest.ts
│   ├── models/          # Data models
│   │   ├── user.model.ts
│   │   └── user.schema.ts
│   ├── routes/          # Route definitions
│   │   ├── index.ts
│   │   ├── auth.routes.ts
│   │   └── user.routes.ts
│   ├── services/        # Business logic
│   │   ├── auth.service.ts
│   │   └── user.service.ts
│   ├── types/           # TypeScript type definitions
│   │   ├── api.types.ts
│   │   ├── auth.types.ts
│   │   └── user.types.ts
│   ├── utils/           # Utility functions
│   │   └── ApiError.ts
│   ├── validators/      # Request validation schemas
│   │   ├── auth.validator.ts
│   │   └── user.validator.ts
│   └── server.ts        # Application entry point
├── .env.example         # Environment variables template
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## Features

- ✅ Express.js with TypeScript
- ✅ RESTful API structure
- ✅ Controllers, Routes, and Services separation
- ✅ MongoDB integration with Mongoose
- ✅ Request validation with express-validator
- ✅ Error handling middleware
- ✅ JWT authentication
- ✅ Password hashing with bcrypt
- ✅ CORS and security headers (Helmet)
- ✅ Request logging (Morgan)
- ✅ Environment configuration
- ✅ TypeScript support

## Installation

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

3. Update `.env` with your configuration values.

## Running the Server

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

## API Endpoints

### Health Check
- `GET /health` - Server health status

### Authentication
- `POST /api/v1/auth/register` - Register a new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/logout` - Logout user
- `POST /api/v1/auth/refresh` - Refresh access token

### Users
- `GET /api/v1/users` - Get all users
- `GET /api/v1/users/:id` - Get user by ID
- `POST /api/v1/users` - Create user (protected)
- `PUT /api/v1/users/:id` - Update user (protected)
- `DELETE /api/v1/users/:id` - Delete user (protected)

## Environment Variables

- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 3000)
- `MONGODB_URI` - MongoDB connection string (required)
- `JWT_SECRET` - Secret key for JWT tokens
- `JWT_EXPIRES_IN` - JWT expiration time
- `CORS_ORIGIN` - Allowed CORS origin
- `API_VERSION` - API version prefix

## Database

The server uses MongoDB with Mongoose ODM. Make sure to:

1. Set `MONGODB_URI` in your `.env` file
2. The server will automatically connect to MongoDB on startup
3. User data is stored in MongoDB with proper schema validation

## Next Steps

1. **Add More Features**: Extend with additional controllers, routes, and services as needed
2. **Testing**: Add unit and integration tests
3. **Documentation**: Consider adding Swagger/OpenAPI documentation
4. **Indexing**: Add database indexes for better query performance

## License

ISC


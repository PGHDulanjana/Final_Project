# XpertKarate Backend API

A comprehensive tournament management system backend for Karate tournaments built with Node.js, Express, and MongoDB.

## Features

- **User Management**: Admin, Player, Judge, Coach, and Organizer roles
- **Tournament Management**: Create and manage tournaments with categories
- **Live Scoring System**: Real-time score updates using WebSocket
- **Payment Integration**: PayHere payment gateway integration
- **Notification System**: Real-time notifications and email alerts
- **Chat System**: User-to-user messaging
- **JWT Authentication**: Secure token-based authentication
- **File Upload**: Profile picture upload support

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **Real-time**: Socket.IO
- **File Upload**: Multer
- **Email**: Nodemailer
- **Validation**: Express-validator

## Project Structure

```
backend/
├── src/
│   ├── config/          # Database configuration
│   ├── controllers/     # Route controllers
│   ├── models/          # MongoDB models
│   ├── routes/          # API routes
│   ├── middlewares/     # Custom middlewares
│   ├── services/        # Business logic services
│   ├── utils/           # Utility functions
│   ├── validations/     # Request validation
│   ├── app.js           # Express app setup
│   └── server.js        # Server entry point
├── .env                 # Environment variables
├── package.json
└── README.md
```

## Installation

1. Clone the repository
```bash
git clone <repository-url>
cd backend
```

2. Install dependencies
```bash
npm install
```

3. Create `.env` file (copy from `.env.example`)
```bash
cp .env.example .env
```

4. Configure environment variables in `.env`
   - MongoDB connection string
   - JWT secret
   - Email configuration
   - PayHere credentials

5. Start the server
```bash
# Development
npm run dev

# Production
npm start
```

## Environment Variables

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/xpertkarate
JWT_SECRET=your_secret_key
JWT_EXPIRE=7d
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_password
PAYHERE_MERCHANT_ID=your_merchant_id
PAYHERE_SECRET=your_payhere_secret
FRONTEND_URL=http://localhost:3000
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user

### Users
- `GET /api/users` - Get all users (Admin only)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (Admin only)

### Tournaments
- `GET /api/tournaments` - Get all tournaments
- `GET /api/tournaments/:id` - Get tournament by ID
- `POST /api/tournaments` - Create tournament (Organizer)
- `PUT /api/tournaments/:id` - Update tournament
- `DELETE /api/tournaments/:id` - Delete tournament

### Matches
- `GET /api/matches` - Get all matches
- `GET /api/matches/:id` - Get match by ID
- `POST /api/matches` - Create match
- `PUT /api/matches/:id` - Update match
- `DELETE /api/matches/:id` - Delete match

### Scores
- `GET /api/scores` - Get all scores
- `POST /api/scores` - Submit score (Judge)
- `PUT /api/scores/:id` - Update score

### Payments
- `GET /api/payments` - Get all payments
- `POST /api/payments` - Create payment
- `POST /api/payments/payhere-callback` - PayHere callback

### Notifications
- `GET /api/notifications` - Get user notifications
- `POST /api/notifications` - Create notification
- `PUT /api/notifications/:id/read` - Mark as read

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <token>
```

## WebSocket Events

### Client Events
- `join-tournament` - Join tournament room
- `join-match` - Join match room for live scoring
- `score-update` - Submit score update
- `chat-message` - Send chat message

### Server Events
- `score-updated` - Real-time score update
- `match-status-changed` - Match status update
- `new-notification` - New notification received
- `new-message` - New chat message received

## Payment Integration (PayHere)

The system integrates with PayHere payment gateway. Configure your merchant credentials in `.env` file.

## Database Models

- User
- Coach
- Player
- Judge
- Dojo
- Team
- TeamMember
- Organizer
- Tournament
- TournamentCategory
- Match
- MatchJudge
- Score
- Registration
- MatchParticipant
- TournamentResult
- Payment
- Notification
- ChatMessage

## Development

```bash
# Run in development mode with nodemon
npm run dev

# Run in production mode
npm start
```

## License

ISC

## Author

XpertKarate Development Team


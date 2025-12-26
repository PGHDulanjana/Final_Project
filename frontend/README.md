# XpertKarate Frontend

React-based frontend for the XpertKarate Tournament Management System.

## Features

- **Role-Based Access Control**: Separate dashboards for Admin, Player, Judge, Coach, and Organizer
- **Authentication**: Login and Registration with JWT
- **Real-time Updates**: Socket.IO integration for live score updates
- **Tournament Management**: View and register for tournaments
- **Live Scoring**: Judges can enter scores in real-time
- **Team Management**: Coaches can manage teams
- **Tournament Creation**: Organizers can create and manage tournaments
- **Admin Panel**: Full system control for administrators

## Tech Stack

- React 18
- React Router v6
- Axios for API calls
- Socket.IO Client for real-time updates
- Tailwind CSS for styling
- React Toastify for notifications
- Vite as build tool

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

3. Start development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

## Project Structure

```
frontend/
├── src/
│   ├── components/      # Reusable components
│   ├── context/        # React Context (Auth)
│   ├── pages/          # Page components
│   ├── services/       # API service functions
│   ├── utils/          # Utility functions (Socket.IO)
│   ├── config/         # Configuration files
│   ├── App.jsx          # Main app component
│   └── main.jsx         # Entry point
├── package.json
└── vite.config.js
```

## Role-Based Features

### Player
- View registered tournaments
- View matches and scores
- Register for tournaments

### Judge
- View active matches
- Enter scores for matches
- Real-time score submission

### Coach
- Manage teams
- Create teams
- View team members

### Organizer
- Create tournaments
- Manage tournament categories
- View tournament registrations

### Admin
- User management
- System overview
- Full access to all features

## API Integration

All API calls are handled through service files in `src/services/`:
- `authService.js` - Authentication
- `tournamentService.js` - Tournaments
- `matchService.js` - Matches
- `scoreService.js` - Scores
- `teamService.js` - Teams
- `registrationService.js` - Registrations
- `userService.js` - Users

## Authentication

The app uses JWT tokens stored in localStorage. The token is automatically included in API requests via axios interceptors.

## Real-time Features

Socket.IO is used for:
- Live score updates
- Match status changes
- Notifications

## Development

The app runs on `http://localhost:3000` by default. Make sure the backend is running on `http://localhost:5000`.


# Football Tournament Backend API

A complete backend solution for the Football Tournament Management App with real-time synchronization between devices.

## 🚀 Features

- **User Authentication**: JWT-based auth with role management
- **Team Management**: Create, update, and manage teams
- **Player Management**: Add/edit players with role-based permissions
- **Match Scheduling**: Schedule and manage tournament matches
- **Real-time Updates**: Live match statistics and events
- **Role-based Access**: Management, Captain, and Spectator roles
- **Data Synchronization**: Real-time sync between multiple devices

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

## 🛠️ Installation

1. **Navigate to backend folder:**
\`\`\`bash
cd backend
\`\`\`

2. **Install dependencies:**
\`\`\`bash
npm install
\`\`\`

3. **Environment Setup:**
\`\`\`bash
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
\`\`\`

4. **Start MongoDB:**
\`\`\`bash
# Local MongoDB
mongod

# Or use MongoDB Atlas (cloud)
\`\`\`

5. **Run the server:**
\`\`\`bash
# Development
npm run dev

# Production
npm start
\`\`\`

## 🔗 API Endpoints

### Authentication
- `POST /api/auth/login` - User login

### Tournament
- `GET /api/tournament` - Get complete tournament data

### Teams
- `GET /api/teams` - Get all teams
- `POST /api/teams` - Create team (Management only)
- `PUT /api/teams/:id` - Update team (Management only)

### Players
- `GET /api/players` - Get players
- `POST /api/players` - Add player (Management + Captains)
- `PUT /api/players/:id` - Update player (Management only)
- `DELETE /api/players/:id` - Delete player (Management only)

### Matches
- `GET /api/matches` - Get all matches
- `POST /api/matches` - Schedule match (Management only)
- `PUT /api/matches/:id` - Update match (Management only)
- `PUT /api/matches/:id/stats` - Update match stats (Management only)

## 🔐 Default Users

The system creates these default users:

\`\`\`javascript
// Management
Email: manager@football.com
Password: password

// Captain
Email: captain@team1.com
Password: password

// Spectator
Email: fan@football.com
Password: password
\`\`\`

## 📱 Device Synchronization

The backend ensures real-time synchronization:

1. **Device 1 (Manager)**: Creates team → Saves to MongoDB
2. **Device 2 (Captain)**: Fetches latest data → Sees new team
3. **All Changes**: Automatically synced across all connected devices

## 🔧 Role Permissions

### Management
- ✅ Create/edit teams
- ✅ Add/edit/delete players
- ✅ Schedule matches
- ✅ Manage live matches

### Captain
- ✅ Add players to own team
- ❌ Edit existing players
- ❌ Manage other teams

### Spectator
- ✅ View all data
- ❌ No modification rights

## 🧪 Testing

\`\`\`bash
# Run API tests
npm test

# Test specific endpoint
curl http://localhost:3000/api/health
\`\`\`

## 🚀 Deployment

### Local Development
\`\`\`bash
npm run dev
\`\`\`

### Production (Heroku)
\`\`\`bash
# Add MongoDB Atlas URI to Heroku config
heroku config:set MONGODB_URI=your-atlas-uri
heroku config:set JWT_SECRET=your-secret-key
git push heroku main
\`\`\`

### Production (Railway/Render)
1. Connect GitHub repository
2. Set environment variables
3. Deploy automatically

## 📊 Database Schema

### Users
- name, email, password, role, teamId

### Teams
- name, logo, captainId, stats (wins, losses, points, etc.)

### Players
- name, position, jerseyNumber, teamId, isSubstitute, photo

### Matches
- homeTeamId, awayTeamId, date, time, venue, status, scores, events

## 🔄 Real-time Features

- **Live Match Updates**: Real-time score and event updates
- **Team Synchronization**: Instant team creation/updates
- **Player Management**: Real-time player additions
- **Cross-device Sync**: Changes reflect immediately on all devices

## 🛡️ Security

- JWT token authentication
- Role-based access control
- Password hashing with bcrypt
- Input validation and sanitization
- CORS protection

## 📞 Support

For issues or questions:
1. Check the logs: `npm run dev`
2. Verify MongoDB connection
3. Ensure environment variables are set
4. Test API endpoints with Postman/curl

## 📁 Project Structure

\`\`\`
backend/
├── server.js          # Main server file
├── package.json       # Dependencies and scripts
├── .env              # Environment variables
├── .env.example      # Environment template
├── test-api.js       # API testing script
├── README.md         # This file
├── models/           # Database models (future)
├── routes/           # API routes (future)
├── middleware/       # Custom middleware (future)
├── controllers/      # Route controllers (future)
├── utils/            # Utility functions (future)
└── scripts/          # Database scripts (future)
\`\`\`
# football-app-backend

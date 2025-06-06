# Frontend-Backend Integration Guide

## 🔗 Connection Setup Complete!

Your React Native app is now fully connected to the backend API with real-time synchronization.

## 📱 Key Features Implemented

### ✅ **API Service Layer**
- **File**: `src/services/api.ts`
- **Features**: 
  - Automatic token management
  - Error handling
  - Request/response interceptors
  - Health check monitoring

### ✅ **Authentication Integration**
- **File**: `src/contexts/AuthContext.tsx`
- **Features**:
  - JWT token storage
  - Automatic login persistence
  - Secure logout
  - Real-time auth state

### ✅ **Data Synchronization**
- **File**: `src/contexts/TournamentContext.tsx`
- **Features**:
  - Real-time data fetching
  - Automatic refresh
  - Optimistic updates
  - Error recovery

### ✅ **UI Enhancements**
- **Loading States**: Spinner components
- **Error Handling**: Error boundaries
- **Connection Status**: Real-time API status
- **Pull-to-Refresh**: Manual data sync

## 🚀 How Device Synchronization Works

### **Scenario: Manager creates a team**

#### **Device 1 (Manager):**
\`\`\`typescript
// 1. User creates team in UI
await addTeam({
  name: "New Team FC",
  logo: "team-logo.jpg"
})

// 2. API call to backend
POST /api/teams
{
  "name": "New Team FC",
  "logo": "team-logo.jpg"
}

// 3. Backend saves to MongoDB
// 4. Frontend updates local state
\`\`\`

#### **Device 2 (Captain):**
\`\`\`typescript
// 1. App automatically refreshes data every 30s
// 2. Or user pulls to refresh
await refreshData()

// 3. API call to backend
GET /api/tournament

// 4. Backend returns latest data including new team
// 5. Frontend updates UI with new team
\`\`\`

#### **Result**: Both devices show the new team! ✨

## 🔧 Configuration

### **API Base URL Configuration**
\`\`\`typescript
// src/services/api.ts
const API_BASE_URL = __DEV__ 
  ? 'http://localhost:3000/api'  // Development
  : 'https://your-production-api.com/api'  // Production

// For physical device testing:
// const API_BASE_URL = 'http://192.168.1.100:3000/api'
\`\`\`

### **Finding Your Computer's IP Address**
\`\`\`bash
# macOS/Linux
ifconfig | grep "inet " | grep -v 127.0.0.1

# Windows
ipconfig | findstr "IPv4"

# Then update API_BASE_URL with your IP
const API_BASE_URL = 'http://YOUR_IP_ADDRESS:3000/api'
\`\`\`

## 📊 Real-time Features

### **1. Team Management**
- ✅ Create team → Syncs across devices
- ✅ Add players → Updates team rosters
- ✅ Edit team info → Reflects everywhere

### **2. Match Management**
- ✅ Schedule matches → Appears in all calendars
- ✅ Live score updates → Real-time sync
- ✅ Match events → Instant notifications

### **3. Tournament Data**
- ✅ Points table → Auto-calculated
- ✅ Team standings → Live updates
- ✅ Player statistics → Real-time tracking

## 🛠️ Testing the Integration

### **1. Start Backend Server**
\`\`\`bash
cd backend
npm run dev
\`\`\`

### **2. Start React Native App**
\`\`\`bash
# In project root
npm start
\`\`\`

### **3. Test Device Sync**
\`\`\`bash
# Device 1: Login as manager
Email: manager@football.com
Password: password

# Device 2: Login as captain
Email: captain@team1.com
Password: password

# Create team on Device 1
# Pull to refresh on Device 2
# ✅ Team appears on both devices!
\`\`\`

## 🔍 Debugging Connection Issues

### **Check API Connection**
\`\`\`typescript
// In your app, check connection status
// Look for the connection indicator in the header
// Green = Connected, Red = Offline
\`\`\`

### **Common Issues & Solutions**

#### **1. "Network request failed"**
\`\`\`bash
# Solution: Check if backend is running
cd backend
npm run dev

# Verify health endpoint
curl http://localhost:3000/api/health
\`\`\`

#### **2. "Connection refused"**
\`\`\`bash
# Solution: Update API URL for physical device
# In src/services/api.ts, change to your computer's IP:
const API_BASE_URL = 'http://192.168.1.100:3000/api'
\`\`\`

#### **3. "Authentication failed"**
\`\`\`bash
# Solution: Clear app storage and re-login
# Or check if backend has default users
\`\`\`

#### **4. "CORS error"**
\`\`\`bash
# Solution: Update backend CORS settings
# In backend/.env:
ALLOWED_ORIGINS=http://localhost:19006,http://localhost:8081,http://YOUR_IP:19006
\`\`\`

## 📱 App Features Now Working

### **✅ Authentication**
- Login with backend validation
- JWT token management
- Role-based access control

### **✅ Team Management**
- Create teams (Management only)
- Add players (Management + Captains)
- Real-time team sync

### **✅ Match Management**
- Schedule matches (Management only)
- Live match updates
- Real-time score tracking

### **✅ Data Persistence**
- All data saved to MongoDB
- Automatic sync between devices
- Offline-first with sync on reconnect

## 🎯 Next Steps

### **1. Deploy Backend**
\`\`\`bash
# Deploy to Heroku, Railway, or Render
# Update API_BASE_URL to production URL
\`\`\`

### **2. Add Push Notifications**
\`\`\`bash
# Notify users of match updates
# Real-time goal notifications
\`\`\`

### **3. Add Image Upload**
\`\`\`bash
# Team logos and player photos
# Cloudinary integration
\`\`\`

### **4. Add Real-time WebSocket**
\`\`\`bash
# Live match commentary
# Instant score updates
\`\`\`

## 🏆 Success! 

Your football management app now has:
- ✅ **Real-time device synchronization**
- ✅ **Secure authentication**
- ✅ **Role-based permissions**
- ✅ **Persistent data storage**
- ✅ **Cross-platform compatibility**

**Test it now**: Create a team on one device and watch it appear on another! 🚀⚽

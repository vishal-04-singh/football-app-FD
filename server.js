const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
require("dotenv").config()

const app = express()

// Middleware
app.use(cors())
app.use(express.json({ limit: "50mb" })) // Increase limit for base64 images
app.use(express.urlencoded({ limit: "50mb", extended: true }))

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`)
  if (req.body && Object.keys(req.body).length > 0) {
    const logBody = { ...req.body }
    if (logBody.password) logBody.password = "********"
    console.log("Request body:", logBody)
  }
  next()
})
// MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("✅ Connected to MongoDB")
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err)
  })


// User Schema
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["management", "captain", "spectator"], required: true },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", default: null },
  },
  { timestamps: true },
)

// Team Schema
const teamSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    logo: { type: String, default: "" },
    captainId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    matchesPlayed: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    draws: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    goalsFor: { type: Number, default: 0 },
    goalsAgainst: { type: Number, default: 0 },
    points: { type: Number, default: 0 },
  },
  { timestamps: true },
)

// Player Schema
const playerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    position: { type: String, required: true },
    jerseyNumber: { type: Number, required: true },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },
    isSubstitute: { type: Boolean, default: false },
    photo: { type: String, default: "" }, // Store base64 image data
  },
  { timestamps: true },
)

// FIXED: Match Schema with proper events structure
const matchSchema = new mongoose.Schema(
  {
    homeTeamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },
    awayTeamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    venue: { type: String, required: true },
    status: { type: String, enum: ["upcoming", "live", "completed"], default: "upcoming" },
    homeScore: { type: Number, default: 0 },
    awayScore: { type: Number, default: 0 },
    week: { type: Number, required: true },
    events: [
      {
        id: String,
        type: { type: String, enum: ["goal", "yellow_card", "red_card", "substitution"] },
        playerId: String,
        playerName: String,
        minute: Number,
        description: String,
        // ADDED: Team identification fields
        team: { type: String }, // Store team ID as string
        teamId: { type: String }, // Alternative field name for compatibility
        teamName: { type: String }, // Store team name for display
      },
    ],
    minute: { type: Number, default: 0 },
    possession: {
      home: { type: Number, default: 50 },
      away: { type: Number, default: 50 },
    },
    shots: {
      home: { type: Number, default: 0 },
      away: { type: Number, default: 0 },
    },
    corners: {
      home: { type: Number, default: 0 },
      away: { type: Number, default: 0 },
    },
    fouls: {
      home: { type: Number, default: 0 },
      away: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
)

// Tournament Schema
const tournamentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    currentWeek: { type: Number, default: 1 },
    status: { type: String, enum: ["upcoming", "ongoing", "completed"], default: "ongoing" },
  },
  { timestamps: true },
)

// Models
const User = mongoose.model("User", userSchema)
const Team = mongoose.model("Team", teamSchema)
const Player = mongoose.model("Player", playerSchema)
const Match = mongoose.model("Match", matchSchema)
const Tournament = mongoose.model("Tournament", tournamentSchema)

// Auth Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"]
  const token = authHeader && authHeader.split(" ")[1]

  if (!token) {
    return res.status(401).json({ error: "Access token required" })
  }

  jwt.verify(token, process.env.JWT_SECRET || "your-secret-key", (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid token" })
    }
    req.user = user
    next()
  })
}

// Validation helper functions
const validateObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id)
}

const validateBase64Image = (imageData) => {
  if (!imageData) return true // Empty is valid

  try {
    // Check if it's a valid base64 data URL
    const base64Regex = /^data:image\/(jpeg|jpg|png|gif|webp);base64,/
    return base64Regex.test(imageData)
  } catch (error) {
    return false
  }
}

// Initialize default data
const initializeData = async () => {
  try {
    // Create default tournament if none exists
    const tournamentCount = await Tournament.countDocuments()
    if (tournamentCount === 0) {
      await Tournament.create({
        name: "Football League Championship",
        startDate: "2024-01-06",
        endDate: "2024-01-28",
        currentWeek: 1,
        status: "ongoing",
      })
      console.log("✅ Default tournament created")
    }

    // Create default users if none exist
    const userCount = await User.countDocuments()
    if (userCount === 0) {
      const hashedPassword = await bcrypt.hash("password", 10)

      // Create users first
      const users = await User.insertMany([
        {
          name: "Tournament Manager",
          email: "manager@football.com",
          password: hashedPassword,
          role: "management",
        },
        {
          name: "Team Captain Alpha",
          email: "captain@team1.com",
          password: hashedPassword,
          role: "captain",
        },
        {
          name: "Football Fan",
          email: "fan@football.com",
          password: hashedPassword,
          role: "spectator",
        },
      ])

      console.log("✅ Default users created")

      // Create Alpha FC team and assign the captain
      const alphaTeam = await Team.create({
        name: "Alpha FC",
        logo: "",
        captainId: users[1]._id, // Captain user
        matchesPlayed: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0,
      })

      // Update the captain user with the team ID
      await User.findByIdAndUpdate(users[1]._id, { teamId: alphaTeam._id })

      console.log("✅ Alpha FC team created and captain assigned")

      // Create some sample players for Alpha FC (7 playing + 3 substitutes)
      await Player.insertMany([
        // Playing squad (7 players)
        {
          name: "John Doe",
          position: "Goalkeeper",
          jerseyNumber: 1,
          teamId: alphaTeam._id,
          isSubstitute: false,
        },
        {
          name: "Mike Smith",
          position: "Defender",
          jerseyNumber: 2,
          teamId: alphaTeam._id,
          isSubstitute: false,
        },
        {
          name: "David Johnson",
          position: "Midfielder",
          jerseyNumber: 10,
          teamId: alphaTeam._id,
          isSubstitute: false,
        },
        {
          name: "Alex Brown",
          position: "Forward",
          jerseyNumber: 9,
          teamId: alphaTeam._id,
          isSubstitute: false,
        },
        {
          name: "Chris Wilson",
          position: "Defender",
          jerseyNumber: 3,
          teamId: alphaTeam._id,
          isSubstitute: false,
        },
        {
          name: "Tom Davis",
          position: "Midfielder",
          jerseyNumber: 8,
          teamId: alphaTeam._id,
          isSubstitute: false,
        },
        {
          name: "Sam Miller",
          position: "Forward",
          jerseyNumber: 11,
          teamId: alphaTeam._id,
          isSubstitute: false,
        },
        // Substitutes (3 players)
        {
          name: "Jake Taylor",
          position: "Midfielder",
          jerseyNumber: 12,
          teamId: alphaTeam._id,
          isSubstitute: true,
        },
        {
          name: "Ryan Clark",
          position: "Defender",
          jerseyNumber: 13,
          teamId: alphaTeam._id,
          isSubstitute: true,
        },
        {
          name: "Luke Anderson",
          position: "Forward",
          jerseyNumber: 14,
          teamId: alphaTeam._id,
          isSubstitute: true,
        },
      ])

      console.log("✅ Sample players created for Alpha FC (7 playing + 3 substitutes)")
    }
  } catch (error) {
    console.error("❌ Error initializing data:", error)
  }
}

// [Keep all the existing routes from register through to team assignment - they're all fine]

// Routes

// Register route
app.post("/api/auth/register", async (req, res) => {
  try {
    console.log("🚀 Registration attempt:", { ...req.body, password: "********" })

    const { name, email, password, role } = req.body

    // Validation
    if (!name || !email || !password) {
      console.log("❌ Missing required fields")
      return res.status(400).json({
        error: "Missing required fields",
        details: {
          name: !name ? "Name is required" : null,
          email: !email ? "Email is required" : null,
          password: !password ? "Password is required" : null,
        },
      })
    }

    if (password.length < 6) {
      console.log("❌ Password too short")
      return res.status(400).json({ error: "Password must be at least 6 characters long" })
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      console.log("❌ Invalid email format")
      return res.status(400).json({ error: "Invalid email format" })
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() })
    if (existingUser) {
      console.log("❌ User already exists:", email)
      return res.status(400).json({ error: "User already exists with this email" })
    }

    // Validate role
    const validRoles = ["management", "captain", "spectator"]
    const userRole = role || "spectator"
    if (!validRoles.includes(userRole)) {
      console.log("❌ Invalid role:", userRole)
      return res.status(400).json({ error: "Invalid role" })
    }

    // Hash password
    console.log("🔐 Hashing password...")
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    // Create new user
    console.log("👤 Creating new user...")
    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: userRole,
    })

    const savedUser = await user.save()
    console.log("✅ User created successfully:", savedUser._id)

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      userId: savedUser._id,
      user: {
        _id: savedUser._id,
        name: savedUser.name,
        email: savedUser.email,
        role: savedUser.role,
      },
    })
  } catch (error) {
    console.error("❌ Registration error:", error)

    // Handle specific MongoDB errors
    if (error.code === 11000) {
      return res.status(400).json({ error: "Email already exists" })
    }

    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map((err) => err.message)
      return res.status(400).json({
        error: "Validation failed",
        details: validationErrors,
      })
    }

    res.status(500).json({
      error: "Server error during registration",
      details: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
})

// Login route
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body

    const user = await User.findOne({ email }).populate("teamId")
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" })
    }

    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid credentials" })
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "24h" },
    )

    // Enhanced user object with better logging
    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      teamId: user.teamId?._id || user.teamId || null,
    }

    // Debug logging for captain
    if (user.role === "captain") {
      console.log("🔍 Captain login debug:")
      console.log("  - User ID:", user._id)
      console.log("  - User teamId:", user.teamId)
      console.log("  - Populated teamId:", user.teamId?._id)
      console.log("  - Response teamId:", userResponse.teamId)

      // Find team where this user is captain
      const teamAsCaptain = await Team.findOne({ captainId: user._id })
      if (teamAsCaptain) {
        console.log("  - Team where user is captain:", teamAsCaptain.name, "(ID:", teamAsCaptain._id, ")")
      } else {
        console.log("  - No team found where user is captain")
      }
    }

    res.json({
      token,
      user: userResponse,
    })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({ error: error.message })
  }
})
// Social authentication route
app.post("/api/auth/social", async (req, res) => {
  try {
    console.log("🔗 Social auth attempt:", req.body.provider)

    const { provider, token } = req.body

    if (!provider || !token) {
      return res.status(400).json({ error: "Provider and token are required" })
    }

    // Generate a fake email based on the provider and token
    const email = `${provider.toLowerCase()}_${token.substring(0, 8)}@social.example.com`
    const name = `${provider.charAt(0).toUpperCase() + provider.slice(1)} User`

    // Check if user exists
    let user = await User.findOne({ email })

    if (!user) {
      console.log("👤 Creating new social user...")
      // Create new user if they don't exist
      const hashedPassword = await bcrypt.hash(Math.random().toString(36), 10)

      user = new User({
        name,
        email,
        password: hashedPassword,
        role: "spectator", // Default role for social logins
      })

      await user.save()
      console.log("✅ Social user created:", user._id)
    } else {
      console.log("✅ Existing social user found:", user._id)
    }

    // Create token
    const jwtToken = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" })

    res.json({
      token: jwtToken,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        teamId: user.teamId,
      },
    })
  } catch (error) {
    console.error("❌ Social auth error:", error)
    res.status(500).json({ error: "Server error during social authentication" })
  }
})

// Get current user
app.get("/api/auth/me", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password").populate("teamId", "name logo")

    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }

    res.json(user)
  } catch (error) {
    console.error("❌ Get user error:", error)
    res.status(500).json({ error: "Server error" })
  }
})



// Add debug endpoint for captain issues
app.get("/api/debug/captain/:email", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "management") {
      return res.status(403).json({ error: "Only management can access debug info" })
    }

    const { email } = req.params
    const user = await User.findOne({ email }).populate("teamId")
    const teamAsCaptain = await Team.findOne({ captainId: user?._id }).populate("captainId")
    const allTeams = await Team.find().populate("captainId")

    res.json({
      user: user
        ? {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            teamId: user.teamId,
          }
        : null,
      teamAsCaptain: teamAsCaptain
        ? {
            id: teamAsCaptain._id,
            name: teamAsCaptain.name,
            captainId: teamAsCaptain.captainId,
          }
        : null,
      allTeams: allTeams.map((team) => ({
        id: team._id,
        name: team.name,
        captainId: team.captainId
          ? {
              id: team.captainId._id,
              name: team.captainId.name,
              email: team.captainId.email,
            }
          : null,
      })),
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Tournament Routes
app.get("/api/tournament", authenticateToken, async (req, res) => {
  try {
    const tournament = await Tournament.findOne()
    const teams = await Team.find().populate("captainId", "name email")

    console.log(`🏆 Tournament data requested by ${req.user.role} (${req.user.email})`)

    // Get players for each team with proper counting
    const teamsWithPlayers = await Promise.all(
      teams.map(async (team) => {
        const players = await Player.find({ teamId: team._id })
        const teamObj = team.toObject()

        console.log(`📊 Team ${team.name}: ${players.length} players found`)

        return {
          ...teamObj,
          id: teamObj._id, // Ensure both _id and id are available
          players: players.map((player) => ({
            ...player.toObject(),
            id: player._id,
          })),
        }
      }),
    )

    const matches = await Match.find().populate("homeTeamId awayTeamId", "name")

    console.log(`📋 Returning ${teamsWithPlayers.length} teams with player data`)

    res.json({
      tournament: tournament || {
        id: "default",
        name: "Football League Championship",
        startDate: "2024-01-06",
        endDate: "2024-01-28",
        currentWeek: 1,
        status: "ongoing",
      },
      teams: teamsWithPlayers,
      matches: matches.map((match) => ({
        ...match.toObject(),
        id: match._id,
      })),
    })
  } catch (error) {
    console.error("❌ Tournament data error:", error)
    res.status(500).json({ error: error.message })
  }
})

// Team Routes
app.post("/api/teams", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "management") {
      return res.status(403).json({ error: "Only management can create teams" })
    }

    console.log("🏆 Creating team with data:", req.body)

    // Check team limit (maximum 8 teams)
    const teamCount = await Team.countDocuments()
    if (teamCount >= 8) {
      return res.status(400).json({ error: "Maximum number of teams (8) has been reached" })
    }

    // Validate team data
    if (!req.body.name || req.body.name.trim().length === 0) {
      return res.status(400).json({ error: "Team name is required" })
    }

    // Validate logo if provided
    if (req.body.logo && !validateBase64Image(req.body.logo)) {
      return res.status(400).json({ error: "Invalid image format" })
    }

    // Clean the request body to handle null captainId
    const teamData = {
      name: req.body.name.trim(),
      logo: req.body.logo || "",
      captainId: req.body.captainId === "temp" || !req.body.captainId ? null : req.body.captainId,
    }

    const team = new Team(teamData)
    await team.save()

    const populatedTeam = await Team.findById(team._id).populate("captainId", "name email")
    const players = await Player.find({ teamId: team._id })

    console.log(`✅ Team created: ${team.name} (${teamCount + 1}/8 teams)`)

    res.status(201).json({
      ...populatedTeam.toObject(),
      id: populatedTeam._id,
      players: players.map((player) => ({
        ...player.toObject(),
        id: player._id,
      })),
    })
  } catch (error) {
    console.error("❌ Team creation error:", error)
    res.status(500).json({ error: error.message })
  }
})

app.get("/api/teams", authenticateToken, async (req, res) => {
  try {
    const teams = await Team.find().populate("captainId", "name email")

    const teamsWithPlayers = await Promise.all(
      teams.map(async (team) => {
        const players = await Player.find({ teamId: team._id })
        return {
          ...team.toObject(),
          id: team._id,
          players: players.map((player) => ({
            ...player.toObject(),
            id: player._id,
          })),
        }
      }),
    )

    console.log(`📋 Teams requested: ${teamsWithPlayers.length} teams found`)

    res.json(teamsWithPlayers)
  } catch (error) {
    console.error("❌ Teams fetch error:", error)
    res.status(500).json({ error: error.message })
  }
})

app.put("/api/teams/:id", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "management") {
      return res.status(403).json({ error: "Only management can update teams" })
    }

    console.log(`🏆 Updating team ${req.params.id} with data:`, req.body)

    const team = await Team.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate(
      "captainId",
      "name email",
    )

    if (!team) {
      return res.status(404).json({ error: "Team not found" })
    }

    const players = await Player.find({ teamId: team._id })

    console.log(`✅ Team updated: ${team.name}`)

    res.json({
      ...team.toObject(),
      id: team._id,
      players: players.map((player) => ({
        ...player.toObject(),
        id: player._id,
      })),
    })
  } catch (error) {
    console.error("❌ Team update error:", error)
    res.status(500).json({ error: error.message })
  }
})

// Add delete team route
app.delete("/api/teams/:id", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "management") {
      return res.status(403).json({ error: "Only management can delete teams" })
    }

    const teamId = req.params.id

    // First delete all players in the team
    const deletedPlayers = await Player.deleteMany({ teamId: teamId })
    console.log(`🗑️ Deleted ${deletedPlayers.deletedCount} players from team`)

    // Then delete the team
    const team = await Team.findByIdAndDelete(teamId)

    if (!team) {
      return res.status(404).json({ error: "Team not found" })
    }

    // Update any users who were assigned to this team
    await User.updateMany({ teamId: teamId }, { teamId: null })

    console.log(`🗑️ Team deleted: ${team.name}`)

    res.json({ message: "Team and all associated players deleted successfully" })
  } catch (error) {
    console.error("❌ Team deletion error:", error)
    res.status(500).json({ error: error.message })
  }
})

// Add route to assign captain to team
app.post("/api/teams/:teamId/assign-captain", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "management") {
      return res.status(403).json({ error: "Only management can assign captains" })
    }

    const { teamId } = req.params
    const { captainEmail } = req.body

    // Find the captain user
    const captain = await User.findOne({ email: captainEmail, role: "captain" })
    if (!captain) {
      return res.status(404).json({ error: "Captain not found" })
    }

    // Update team with captain
    const team = await Team.findByIdAndUpdate(teamId, { captainId: captain._id }, { new: true }).populate(
      "captainId",
      "name email",
    )

    if (!team) {
      return res.status(404).json({ error: "Team not found" })
    }

    // Update captain user with team
    await User.findByIdAndUpdate(captain._id, { teamId: team._id })

    console.log(`✅ Captain ${captain.name} assigned to team ${team.name}`)

    res.json({
      message: "Captain assigned successfully",
      team: team,
      captain: {
        id: captain._id,
        name: captain.name,
        email: captain.email,
      },
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Player Routes
app.post("/api/players", authenticateToken, async (req, res) => {
  try {
    console.log(`🏃‍♂️ Player creation request from ${req.user.role} (${req.user.email})`)
    console.log("📝 Request body:", {
      ...req.body,
      photo: req.body.photo ? "[IMAGE_DATA_PROVIDED]" : "No photo",
    })

    const { teamId, name, position, jerseyNumber, isSubstitute, photo } = req.body

    // Validate required fields
    if (!name || !position || !jerseyNumber || !teamId) {
      console.log("❌ Missing required fields")
      return res.status(400).json({
        error: "Missing required fields",
        details: {
          name: !name ? "Name is required" : "OK",
          position: !position ? "Position is required" : "OK",
          jerseyNumber: !jerseyNumber ? "Jersey number is required" : "OK",
          teamId: !teamId ? "Team ID is required" : "OK",
        },
      })
    }

    // Validate team ID format
    if (!validateObjectId(teamId)) {
      console.log("❌ Invalid team ID format:", teamId)
      return res.status(400).json({ error: "Invalid team ID format" })
    }

    // Validate jersey number
    const jerseyNum = Number(jerseyNumber)
    if (isNaN(jerseyNum) || jerseyNum < 1 || jerseyNum > 99) {
      console.log("❌ Invalid jersey number:", jerseyNumber)
      return res.status(400).json({ error: "Jersey number must be between 1 and 99" })
    }

    // Validate photo if provided
    if (photo && !validateBase64Image(photo)) {
      console.log("❌ Invalid photo format")
      return res.status(400).json({ error: "Invalid photo format. Must be a valid base64 image." })
    }

    // Check if user can add players to this team
    if (req.user.role !== "management") {
      const user = await User.findById(req.user.userId)
      console.log(`🔍 User team check: user.teamId=${user.teamId}, requested.teamId=${teamId}`)

      if (!user.teamId || user.teamId.toString() !== teamId) {
        console.log("❌ Permission denied: User can only add players to their own team")
        return res.status(403).json({ error: "You can only add players to your own team" })
      }
    }

    // Check if team exists
    const team = await Team.findById(teamId)
    if (!team) {
      console.log("❌ Team not found:", teamId)
      return res.status(404).json({ error: "Team not found" })
    }

    console.log(`✅ Team found: ${team.name}`)

    // Check if jersey number is already taken
    const existingPlayer = await Player.findOne({
      teamId: teamId,
      jerseyNumber: jerseyNum,
    })

    if (existingPlayer) {
      console.log(`❌ Jersey number ${jerseyNum} already taken by ${existingPlayer.name}`)
      return res.status(400).json({
        error: `Jersey number ${jerseyNum} is already taken by ${existingPlayer.name}`,
      })
    }

    // Check team player count (maximum 11 players: 7 playing + 3 substitutes)
    const teamPlayerCount = await Player.countDocuments({ teamId: teamId })
    if (teamPlayerCount >= 11) {
      console.log(`❌ Team ${team.name} already has maximum players (${teamPlayerCount}/11)`)
      return res.status(400).json({ error: "Team already has maximum players (11)" })
    }

    // Determine if player should be substitute
    const mainPlayersCount = await Player.countDocuments({
      teamId: teamId,
      isSubstitute: false,
    })

    const substitutesCount = await Player.countDocuments({
      teamId: teamId,
      isSubstitute: true,
    })

    // Determine player type based on current squad composition
    let playerIsSubstitute = false
    if (mainPlayersCount >= 7) {
      // Main squad is full, must be substitute
      if (substitutesCount >= 3) {
        return res.status(400).json({
          error: "Team already has maximum substitutes (3). Cannot add more players.",
        })
      }
      playerIsSubstitute = true
    } else {
      // Can be added to main squad
      playerIsSubstitute = false
    }

    const playerData = {
      name: name.trim(),
      position: position,
      jerseyNumber: jerseyNum,
      teamId: teamId,
      isSubstitute: playerIsSubstitute,
      photo: photo || "",
    }

    console.log(`📝 Creating player:`, {
      ...playerData,
      photo: playerData.photo ? "[IMAGE_DATA]" : "No photo",
      squadType: playerIsSubstitute ? "Substitute" : "Main Squad",
      currentSquad: `${mainPlayersCount}/7 main, ${substitutesCount}/3 subs`,
    })

    const player = new Player(playerData)
    await player.save()

    const populatedPlayer = await Player.findById(player._id).populate("teamId", "name")

    console.log(
      `✅ Player created successfully: ${player.name} (#${player.jerseyNumber}) for ${team.name} as ${playerIsSubstitute ? "Substitute" : "Main Squad"}`,
    )

    res.status(201).json({
      ...populatedPlayer.toObject(),
      id: populatedPlayer._id,
    })
  } catch (error) {
    console.error("❌ Player creation error:", error)

    // Handle specific MongoDB errors
    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map((err) => err.message)
      return res.status(400).json({
        error: "Validation failed",
        details: validationErrors,
      })
    }

    if (error.name === "MongoError" && error.code === 11000) {
      return res.status(400).json({
        error: "Duplicate entry",
        details: "A player with this jersey number already exists in this team",
      })
    }

    res.status(500).json({
      error: "Internal server error",
      message: error.message,
      details: "Please check the server logs for more information",
    })
  }
})

app.get("/api/players", authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.query
    const filter = teamId ? { teamId } : {}

    const players = await Player.find(filter).populate("teamId", "name")

    console.log(`👥 Players requested: ${players.length} players found`)

    res.json(
      players.map((player) => ({
        ...player.toObject(),
        id: player._id,
      })),
    )
  } catch (error) {
    console.error("❌ Players fetch error:", error)
    res.status(500).json({ error: error.message })
  }
})

app.put("/api/players/:id", authenticateToken, async (req, res) => {
  try {
    // ONLY MANAGEMENT can edit players
    if (req.user.role !== "management") {
      return res.status(403).json({ error: "Only management can edit players" })
    }

    console.log(`🏃‍♂️ Updating player ${req.params.id} with data:`, req.body)

    const player = await Player.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate("teamId", "name")

    if (!player) {
      return res.status(404).json({ error: "Player not found" })
    }

    console.log(`✅ Player updated: ${player.name} by management user ${req.user.email}`)

    res.json({
      ...player.toObject(),
      id: player._id,
    })
  } catch (error) {
    console.error("❌ Player update error:", error)
    res.status(500).json({ error: error.message })
  }
})

app.delete("/api/players/:id", authenticateToken, async (req, res) => {
  try {
    // ONLY MANAGEMENT can delete players
    if (req.user.role !== "management") {
      return res.status(403).json({ error: "Only management can delete players" })
    }

    console.log(`🗑️ Deleting player ${req.params.id} by management user ${req.user.email}`)

    const player = await Player.findByIdAndDelete(req.params.id)

    if (!player) {
      return res.status(404).json({ error: "Player not found" })
    }

    console.log(`✅ Player deleted: ${player.name} by management user ${req.user.email}`)

    res.json({ message: "Player deleted successfully" })
  } catch (error) {
    console.error("❌ Player deletion error:", error)
    res.status(500).json({ error: error.message })
  }
})
const determineEventTeam = async (event, match) => {
  // If event already has team ID, return it
  if (event.team || event.teamId) {
    return {
      team: event.team || event.teamId,
      teamId: event.teamId || event.team,
      teamName: event.teamName || "Unknown Team"
    }
  }

  // Try to determine team from player ID
  if (event.playerId) {
    try {
      const player = await Player.findById(event.playerId)
      if (player) {
        const team = await Team.findById(player.teamId)
        if (team) {
          return {
            team: team._id.toString(),
            teamId: team._id.toString(),
            teamName: team.name
          }
        }
      }
    } catch (error) {
      console.warn("Could not determine team from player ID:", error)
    }
  }

  // Fallback to home team (you might want to enhance this logic)
  const homeTeam = await Team.findById(match.homeTeamId)
  return {
    team: match.homeTeamId.toString(),
    teamId: match.homeTeamId.toString(),
    teamName: homeTeam?.name || "Home Team"
  }
}

// Match Routes
app.post("/api/matches", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "management") {
      return res.status(403).json({ error: "Only management can schedule matches" })
    }

    const match = new Match(req.body)
    await match.save()

    const populatedMatch = await Match.findById(match._id).populate("homeTeamId awayTeamId", "name")

    res.status(201).json({
      ...populatedMatch.toObject(),
      id: populatedMatch._id,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get("/api/matches", authenticateToken, async (req, res) => {
  try {
    const matches = await Match.find().populate("homeTeamId awayTeamId", "name")
    res.json(
      matches.map((match) => ({
        ...match.toObject(),
        id: match._id,
      })),
    )
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// FIXED: Update match route with proper event handling
app.put("/api/matches/:id", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "management") {
      return res.status(403).json({ error: "Only management can update matches" })
    }

    console.log(`🏈 Updating match ${req.params.id} with data:`, req.body)

    // Find the match first
    const currentMatch = await Match.findById(req.params.id)
    if (!currentMatch) {
      return res.status(404).json({ error: "Match not found" })
    }

    // If events are being updated, ensure they have proper team IDs
    if (req.body.events && Array.isArray(req.body.events)) {
      console.log("🎯 Processing events with team IDs...")
      
      // Process each event to ensure it has team identification
      req.body.events = await Promise.all(req.body.events.map(async (event, index) => {
        console.log(`Processing event ${index + 1}:`, event)
        
        const teamInfo = await determineEventTeam(event, currentMatch)
        
        return {
          ...event,
          ...teamInfo
        }
      }))
    }

    const match = await Match.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate(
      "homeTeamId awayTeamId",
      "name",
    )

    console.log(`✅ Match updated: ${match.homeTeamId?.name} vs ${match.awayTeamId?.name}`)

    res.json({
      ...match.toObject(),
      id: match._id,
    })
  } catch (error) {
    console.error("❌ Match update error:", error)
    res.status(500).json({ error: error.message })
  }
})

// Real-time match updates
app.put("/api/matches/:id/stats", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "management") {
      return res.status(403).json({ error: "Only management can update match stats" })
    }

    const match = await Match.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true }).populate(
      "homeTeamId awayTeamId",
      "name",
    )

    if (!match) {
      return res.status(404).json({ error: "Match not found" })
    }

    res.json({
      ...match.toObject(),
      id: match._id,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// ADDED: Migration endpoint to fix existing events
app.post("/api/matches/fix-events", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "management") {
      return res.status(403).json({ error: "Only management can run this migration" })
    }

    console.log("🔧 Starting event migration to fix team IDs...")

    const matches = await Match.find()
    let updatedMatches = 0
    let updatedEvents = 0

    for (const match of matches) {
      let hasUpdates = false
      
      if (match.events && match.events.length > 0) {
        console.log(`Processing match: ${match._id} with ${match.events.length} events`)
        
        match.events = match.events.map((event, index) => {
          // If event already has team ID, skip
          if (event.team || event.teamId) {
            return event
          }

          console.log(`🔍 Fixing event ${index + 1} (${event.type}) for player ${event.playerName}`)
          
          // Try to determine team from player ID
          // For now, we'll need to make an educated guess or manual assignment
          // This is a simplified approach - you might need to enhance this based on your data
          
          // Add placeholder team ID - you'll need to customize this logic
          const updatedEvent = {
            ...event.toObject(),
            team: match.homeTeamId.toString(), // Default to home team - customize this logic
            teamId: match.homeTeamId.toString(),
            teamName: "Unknown Team" // You can populate this from team data
          }
          
          hasUpdates = true
          updatedEvents++
          
          return updatedEvent
        })

        if (hasUpdates) {
          await match.save()
          updatedMatches++
          console.log(`✅ Updated match ${match._id}`)
        }
      }
    }

    console.log(`🎉 Migration complete: Updated ${updatedEvents} events across ${updatedMatches} matches`)

    res.json({
      success: true,
      message: `Migration complete: Updated ${updatedEvents} events across ${updatedMatches} matches`,
      updatedMatches,
      updatedEvents
    })
  } catch (error) {
    console.error("❌ Migration error:", error)
    res.status(500).json({ error: error.message })
  }
})

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Football Tournament API is running" })
})

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("🚨 Unhandled error:", error)
  res.status(500).json({
    error: "Internal server error",
    message: error.message,
    stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
  })
})

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" })
})

const PORT = process.env.PORT || 3000

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Football Tournament API running on port ${PORT}`)
  console.log(`📱 Health check: http://localhost:${PORT}/api/health`)

  // Initialize default data
  await initializeData()
})

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully")
  mongoose.connection.close(() => {
    console.log("MongoDB connection closed")
    process.exit(0)
  })
})
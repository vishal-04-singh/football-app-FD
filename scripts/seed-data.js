// Seed script to populate database with sample data
const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")
require("dotenv").config()

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/football-tournament")

// Import models (you'll need to create these as separate files later)
const User = require("../models/User")
const Team = require("../models/Team")
const Player = require("../models/Player")
const Match = require("../models/Match")
const Tournament = require("../models/Tournament")

async function seedDatabase() {
  try {
    console.log("🌱 Seeding database with sample data...")

    // Clear existing data
    await User.deleteMany({})
    await Team.deleteMany({})
    await Player.deleteMany({})
    await Match.deleteMany({})
    await Tournament.deleteMany({})

    // Create tournament
    const tournament = await Tournament.create({
      name: "Football League Championship",
      startDate: "2024-01-06",
      endDate: "2024-01-28",
      currentWeek: 1,
      status: "ongoing",
    })

    // Create users
    const hashedPassword = await bcrypt.hash("password", 10)

    const users = await User.insertMany([
      {
        name: "Tournament Manager",
        email: "manager@football.com",
        password: hashedPassword,
        role: "management",
      },
      {
        name: "Team Captain Alpha",
        email: "captain@alpha.com",
        password: hashedPassword,
        role: "captain",
      },
      {
        name: "Team Captain Beta",
        email: "captain@beta.com",
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

    // Create teams
    const teams = await Team.insertMany([
      {
        name: "Alpha FC",
        captainId: users[1]._id,
        matchesPlayed: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0,
      },
      {
        name: "Beta United",
        captainId: users[2]._id,
        matchesPlayed: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0,
      },
    ])

    // Update users with team IDs
    await User.findByIdAndUpdate(users[1]._id, { teamId: teams[0]._id })
    await User.findByIdAndUpdate(users[2]._id, { teamId: teams[1]._id })

    // Create sample players for Alpha FC
    const alphaPlayers = [
      { name: "John Goalkeeper", position: "goalkeeper", jerseyNumber: 1, teamId: teams[0]._id, isSubstitute: false },
      { name: "Mike Defender", position: "defender", jerseyNumber: 2, teamId: teams[0]._id, isSubstitute: false },
      { name: "Tom Midfielder", position: "midfielder", jerseyNumber: 10, teamId: teams[0]._id, isSubstitute: false },
      { name: "Alex Forward", position: "forward", jerseyNumber: 9, teamId: teams[0]._id, isSubstitute: false },
    ]

    // Create sample players for Beta United
    const betaPlayers = [
      { name: "Sam Goalkeeper", position: "goalkeeper", jerseyNumber: 1, teamId: teams[1]._id, isSubstitute: false },
      { name: "Chris Defender", position: "defender", jerseyNumber: 3, teamId: teams[1]._id, isSubstitute: false },
      { name: "Ryan Midfielder", position: "midfielder", jerseyNumber: 8, teamId: teams[1]._id, isSubstitute: false },
      { name: "Jake Forward", position: "forward", jerseyNumber: 11, teamId: teams[1]._id, isSubstitute: false },
    ]

    await Player.insertMany([...alphaPlayers, ...betaPlayers])

    // Create sample match
    await Match.create({
      homeTeamId: teams[0]._id,
      awayTeamId: teams[1]._id,
      date: "2024-01-15",
      time: "15:00",
      venue: "Football Arena",
      status: "upcoming",
      homeScore: 0,
      awayScore: 0,
      week: 1,
      events: [],
    })

    console.log("✅ Database seeded successfully!")
    console.log(`📊 Created:`)
    console.log(`   - 1 Tournament`)
    console.log(`   - 4 Users`)
    console.log(`   - 2 Teams`)
    console.log(`   - 8 Players`)
    console.log(`   - 1 Match`)

    process.exit(0)
  } catch (error) {
    console.error("❌ Error seeding database:", error)
    process.exit(1)
  }
}

seedDatabase()

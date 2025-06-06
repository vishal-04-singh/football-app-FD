// Script to manually fix captain assignment
const mongoose = require("mongoose")
require("dotenv").config()

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/football-tournament")

// Define schemas (simplified)
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String,
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
})

const teamSchema = new mongoose.Schema({
  name: String,
  logo: String,
  captainId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  matchesPlayed: { type: Number, default: 0 },
  wins: { type: Number, default: 0 },
  draws: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  goalsFor: { type: Number, default: 0 },
  goalsAgainst: { type: Number, default: 0 },
  points: { type: Number, default: 0 },
})

const User = mongoose.model("User", userSchema)
const Team = mongoose.model("Team", teamSchema)

async function fixCaptainAssignment() {
  try {
    console.log("🔧 Fixing captain assignment...")

    // Find the captain user
    const captain = await User.findOne({ email: "captain@team1.com", role: "captain" })
    if (!captain) {
      console.log("❌ Captain not found")
      process.exit(1)
    }

    console.log("✅ Found captain:", captain.name, "(ID:", captain._id, ")")

    // Find or create Alpha FC team
    let team = await Team.findOne({ name: "Alpha FC" })
    if (!team) {
      console.log("🏗️  Creating Alpha FC team...")
      team = await Team.create({
        name: "Alpha FC",
        logo: "",
        captainId: captain._id,
        matchesPlayed: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0,
      })
    } else {
      console.log("✅ Found team:", team.name, "(ID:", team._id, ")")
      // Update team to assign captain
      team.captainId = captain._id
      await team.save()
    }

    // Update captain user with team ID
    captain.teamId = team._id
    await captain.save()

    console.log("🎉 Captain assignment fixed!")
    console.log("   - Captain:", captain.name, "is now assigned to team:", team.name)
    console.log("   - Captain teamId:", captain.teamId)
    console.log("   - Team captainId:", team.captainId)

    // Verify the fix
    const updatedCaptain = await User.findById(captain._id).populate("teamId")
    const updatedTeam = await Team.findById(team._id).populate("captainId")

    console.log("\n🔍 Verification:")
    console.log("   - Captain has teamId:", !!updatedCaptain.teamId)
    console.log("   - Team has captainId:", !!updatedTeam.captainId)
    console.log("   - Team name from captain:", updatedCaptain.teamId?.name)
    console.log("   - Captain name from team:", updatedTeam.captainId?.name)

    process.exit(0)
  } catch (error) {
    console.error("❌ Error fixing captain assignment:", error)
    process.exit(1)
  }
}

fixCaptainAssignment()

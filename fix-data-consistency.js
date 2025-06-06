const mongoose = require("mongoose")
require("dotenv").config()

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/football-tournament", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})

// Import models
const User = mongoose.model("User", require("../server").userSchema)
const Team = mongoose.model("Team", require("../server").teamSchema)
const Player = mongoose.model("Player", require("../server").playerSchema)

async function fixDataConsistency() {
  try {
    console.log("🔧 Starting data consistency fix...")

    // 1. Ensure Alpha FC exists and captain is properly assigned
    let alphaTeam = await Team.findOne({ name: "Alpha FC" })
    const captain = await User.findOne({ email: "captain@team1.com" })

    if (!captain) {
      console.log("❌ Captain user not found!")
      return
    }

    if (!alphaTeam) {
      console.log("📝 Creating Alpha FC team...")
      alphaTeam = await Team.create({
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
      console.log("✅ Alpha FC team created")
    } else {
      // Update existing team
      alphaTeam.captainId = captain._id
      await alphaTeam.save()
      console.log("✅ Alpha FC team updated")
    }

    // 2. Update captain user with team ID
    captain.teamId = alphaTeam._id
    await captain.save()
    console.log("✅ Captain assigned to Alpha FC")

    // 3. Create sample players if none exist for Alpha FC
    const existingPlayers = await Player.find({ teamId: alphaTeam._id })
    if (existingPlayers.length === 0) {
      console.log("📝 Creating sample players for Alpha FC...")

      const samplePlayers = [
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
          name: "Alex Wilson",
          position: "Forward",
          jerseyNumber: 9,
          teamId: alphaTeam._id,
          isSubstitute: false,
        },
        {
          name: "Tom Brown",
          position: "Defender",
          jerseyNumber: 5,
          teamId: alphaTeam._id,
          isSubstitute: false,
        },
      ]

      await Player.insertMany(samplePlayers)
      console.log(`✅ Created ${samplePlayers.length} sample players for Alpha FC`)
    } else {
      console.log(`ℹ️ Alpha FC already has ${existingPlayers.length} players`)
    }

    // 4. Clean up any orphaned data
    const allTeams = await Team.find()
    console.log(`📊 Total teams in database: ${allTeams.length}`)

    for (const team of allTeams) {
      const playerCount = await Player.countDocuments({ teamId: team._id })
      console.log(`  - ${team.name}: ${playerCount} players`)
    }

    // 5. Verify captain assignment
    const updatedCaptain = await User.findById(captain._id).populate("teamId")
    const updatedTeam = await Team.findById(alphaTeam._id).populate("captainId")

    console.log("🔍 Final verification:")
    console.log(`  - Captain ${updatedCaptain.name} teamId: ${updatedCaptain.teamId?._id}`)
    console.log(`  - Team ${updatedTeam.name} captainId: ${updatedTeam.captainId?._id}`)

    if (
      updatedCaptain.teamId?._id?.toString() === updatedTeam._id.toString() &&
      updatedTeam.captainId?._id?.toString() === updatedCaptain._id.toString()
    ) {
      console.log("✅ Captain-Team relationship is properly established!")
    } else {
      console.log("❌ Captain-Team relationship still has issues!")
    }

    console.log("🎉 Data consistency fix completed!")
  } catch (error) {
    console.error("❌ Error fixing data consistency:", error)
  } finally {
    mongoose.connection.close()
  }
}

// Run the fix
fixDataConsistency()

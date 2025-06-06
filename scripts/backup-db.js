// Database backup script
const mongoose = require("mongoose")
const fs = require("fs")
const path = require("path")
require("dotenv").config()

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/football-tournament")

async function backupDatabase() {
  try {
    console.log("💾 Creating database backup...")

    const collections = ["users", "teams", "players", "matches", "tournaments"]
    const backupData = {}
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")

    // Create backups directory if it doesn't exist
    const backupDir = path.join(__dirname, "../backups")
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true })
    }

    // Backup each collection
    for (const collectionName of collections) {
      try {
        const collection = mongoose.connection.db.collection(collectionName)
        const data = await collection.find({}).toArray()
        backupData[collectionName] = data
        console.log(`✅ Backed up ${collectionName}: ${data.length} documents`)
      } catch (error) {
        console.log(`⚠️  Collection ${collectionName} not found, skipping...`)
        backupData[collectionName] = []
      }
    }

    // Save backup to file
    const backupFile = path.join(backupDir, `backup-${timestamp}.json`)
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2))

    console.log(`🎉 Backup completed successfully!`)
    console.log(`📁 Backup saved to: ${backupFile}`)

    process.exit(0)
  } catch (error) {
    console.error("❌ Error creating backup:", error)
    process.exit(1)
  }
}

backupDatabase()

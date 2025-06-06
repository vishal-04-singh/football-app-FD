// Database restore script
const mongoose = require("mongoose")
const fs = require("fs")
const path = require("path")
require("dotenv").config()

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/football-tournament")

async function restoreDatabase(backupFile) {
  try {
    console.log("🔄 Restoring database from backup...")

    if (!backupFile) {
      console.error("❌ Please provide a backup file path")
      console.log("Usage: node restore-db.js <backup-file-path>")
      process.exit(1)
    }

    if (!fs.existsSync(backupFile)) {
      console.error(`❌ Backup file not found: ${backupFile}`)
      process.exit(1)
    }

    // Read backup data
    const backupData = JSON.parse(fs.readFileSync(backupFile, "utf8"))
    console.log(`📖 Reading backup from: ${backupFile}`)

    // Restore each collection
    for (const [collectionName, data] of Object.entries(backupData)) {
      if (data.length > 0) {
        const collection = mongoose.connection.db.collection(collectionName)

        // Clear existing data
        await collection.deleteMany({})

        // Insert backup data
        await collection.insertMany(data)
        console.log(`✅ Restored ${collectionName}: ${data.length} documents`)
      } else {
        console.log(`⚠️  No data to restore for ${collectionName}`)
      }
    }

    console.log("🎉 Database restored successfully!")
    process.exit(0)
  } catch (error) {
    console.error("❌ Error restoring database:", error)
    process.exit(1)
  }
}

// Get backup file from command line arguments
const backupFile = process.argv[2]
restoreDatabase(backupFile)

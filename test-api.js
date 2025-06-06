// Test script to verify API functionality
const axios = require("axios")

const BASE_URL = "http://localhost:3000/api"

async function testAPI() {
  try {
    console.log("🧪 Testing Football Tournament API...\n")

    // Test health check
    console.log("1. Testing health check...")
    const health = await axios.get(`${BASE_URL}/health`)
    console.log("✅ Health check:", health.data)

    // Test login
    console.log("\n2. Testing login...")
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: "manager@football.com",
      password: "password",
    })
    console.log("✅ Login successful:", loginResponse.data.user)

    const token = loginResponse.data.token
    const headers = { Authorization: `Bearer ${token}` }

    // Test tournament data
    console.log("\n3. Testing tournament data...")
    const tournament = await axios.get(`${BASE_URL}/tournament`, { headers })
    console.log("✅ Tournament data:", {
      teams: tournament.data.teams.length,
      matches: tournament.data.matches.length,
    })

    // Test team creation
    console.log("\n4. Testing team creation...")
    const newTeam = await axios.post(
      `${BASE_URL}/teams`,
      {
        name: "Test Team FC",
        logo: "",
        captainId: null,
      },
      { headers },
    )
    console.log("✅ Team created:", newTeam.data.name)

    // Test player addition
    console.log("\n5. Testing player addition...")
    const newPlayer = await axios.post(
      `${BASE_URL}/players`,
      {
        name: "Test Player",
        position: "midfielder",
        jerseyNumber: 10,
        teamId: newTeam.data._id,
        photo: "",
      },
      { headers },
    )
    console.log("✅ Player added:", newPlayer.data.name)

    console.log("\n🎉 All tests passed! API is working correctly.")
  } catch (error) {
    console.error("❌ Test failed:", error.response?.data || error.message)
  }
}

// Run tests
testAPI()

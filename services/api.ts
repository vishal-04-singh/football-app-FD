import AsyncStorage from "@react-native-async-storage/async-storage"

// API Configuration
const API_BASE_URL = "http://172.20.10.2:3000/api"

class ApiService {
  private baseURL: string
  private token: string | null = null

  constructor() {
    this.baseURL = API_BASE_URL
    this.loadToken()
  }

  private async loadToken() {
    try {
      this.token = await AsyncStorage.getItem("auth_token")
    } catch (error) {
      console.error("Error loading token:", error)
    }
  }

  async refreshToken() {
    await this.loadToken()
  }

  private async getHeaders() {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`
    }

    return headers
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    try {
      // Ensure we have the latest token
      await this.refreshToken()

      const url = `${this.baseURL}${endpoint}`
      const headers = await this.getHeaders()

      console.log(`🌐 API Request: ${options.method || "GET"} ${endpoint}`)
      if (options.body && !endpoint.includes("/upload")) {
        console.log("📤 Request body:", options.body)
      }

      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
      })

      console.log(`📡 API Response: ${response.status} ${response.statusText}`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("❌ API Error:", errorData)
        throw new Error(errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log("✅ API Success")
      return data
    } catch (error) {
      console.error(`❌ API Error (${endpoint}):`, error)
      throw error
    }
  }

  // Authentication
  async login(email: string, password: string) {
    const response = await this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    })

    if (response.token) {
      this.token = response.token
      await AsyncStorage.setItem("auth_token", response.token)

      // Make sure we're storing the complete user object
      if (response.user) {
        // Ensure the user object has the correct format
        const user = {
          ...response.user,
          // If teamId comes as an object with _id, extract just the ID string
          teamId: response.user.teamId?._id || response.user.teamId || null,
        }
        await AsyncStorage.setItem("user", JSON.stringify(user))
      }
    }

    return response
  }

  async signup(userData: {
    name: string
    email: string
    password: string
    role: string
  }) {
    console.log("🚀 Registering new user:", { ...userData, password: "********" })

    const response = await this.request("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    })

    console.log("✅ User registered successfully:", { ...response, token: "********" })
    return response
  }

  async socialAuth(provider: string, token: string) {
    console.log(`🔑 Authenticating with ${provider}`)

    const response = await this.request("/auth/social", {
      method: "POST",
      body: JSON.stringify({ provider, token }),
    })

    if (response.token) {
      this.token = response.token
      await AsyncStorage.setItem("auth_token", response.token)

      if (response.user) {
        const user = {
          ...response.user,
          teamId: response.user.teamId?._id || response.user.teamId || null,
        }
        await AsyncStorage.setItem("user", JSON.stringify(user))
      }
    }

    return response
  }

  async logout() {
    this.token = null
    await AsyncStorage.removeItem("auth_token")
    await AsyncStorage.removeItem("user")
  }

  // Tournament
  async getTournamentData() {
  try {
    const response = await this.request("/tournament");
    
    console.log("API: Tournament data response received");
    
    // Process teams to ensure ID consistency
    if (response.teams) {
      response.teams = response.teams.map((team: { _id: any; id: any; players: any }) => ({
        ...team,
        id: team._id || team.id,
        _id: team._id || team.id,
        players: team.players || []
      }));
    }
    
    // Process matches to ensure ID consistency
    if (response.matches) {
      response.matches = response.matches.map((match: { _id: any; id: any; homeTeamId: { _id: any }; awayTeamId: { _id: any } }) => ({
        ...match,
        id: match._id || match.id,
        _id: match._id || match.id,
        homeTeamId: match.homeTeamId?._id || match.homeTeamId,
        awayTeamId: match.awayTeamId?._id || match.awayTeamId
      }));
    }
    
    return response;
  } catch (error) {
    console.error("API Error fetching tournament data:", error);
    throw error;
  }
}

  // Teams
  async getTeams() {
    return await this.request("/teams")
  }

  async createTeam(teamData: any) {
    // Handle image data
    const processedTeamData = {
      ...teamData,
      // Ensure logo is properly formatted
      logo: teamData.logo || "",
    }

    console.log("🏆 Creating team with data:", {
      ...processedTeamData,
      logo: processedTeamData.logo ? "[IMAGE_DATA]" : "No image",
    })

    return await this.request("/teams", {
      method: "POST",
      body: JSON.stringify(processedTeamData),
    })
  }

  async updateTeam(teamId: string, teamData: any) {
    return await this.request(`/teams/${teamId}`, {
      method: "PUT",
      body: JSON.stringify(teamData),
    })
  }

  async deleteTeam(teamId: string) {
    console.log(`🗑️ API: Deleting team with ID: ${teamId}`)
    return await this.request(`/teams/${teamId}`, {
      method: "DELETE",
    })
  }

  // Players
  async getPlayers(teamId?: string) {
    const query = teamId ? `?teamId=${teamId}` : ""
    return await this.request(`/players${query}`)
  }

  async createPlayer(playerData: any) {
    console.log("🚀 Creating player via API:", {
      ...playerData,
      photo: playerData.photo ? "[IMAGE_DATA]" : "No photo",
    })

    // Validate data before sending
    if (!playerData.name || !playerData.position || !playerData.jerseyNumber || !playerData.teamId) {
      throw new Error("Missing required player fields")
    }

    // Ensure jersey number is a number
    const cleanPlayerData = {
      ...playerData,
      name: playerData.name.trim(),
      jerseyNumber: Number(playerData.jerseyNumber),
      isSubstitute: Boolean(playerData.isSubstitute),
      // Keep photo as base64 data URL or empty string
      photo: playerData.photo || "",
    }

    console.log("🧹 Cleaned player data:", {
      ...cleanPlayerData,
      photo: cleanPlayerData.photo ? "[IMAGE_DATA]" : "No photo",
    })

    return await this.request("/players", {
      method: "POST",
      body: JSON.stringify(cleanPlayerData),
    })
  }

  async updatePlayer(playerId: string, playerData: any) {
    return await this.request(`/players/${playerId}`, {
      method: "PUT",
      body: JSON.stringify(playerData),
    })
  }

  async deletePlayer(playerId: string) {
    return await this.request(`/players/${playerId}`, {
      method: "DELETE",
    })
  }

  // Users
  async getUsers() {
    return await this.request("/users")
  }

  async createUser(userData: any) {
    return await this.request("/users", {
      method: "POST",
      body: JSON.stringify(userData),
    })
  }

  async updateUser(userId: string, userData: any) {
    return await this.request(`/users/${userId}`, {
      method: "PUT",
      body: JSON.stringify(userData),
    })
  }

  async deleteUser(userId: string) {
    return await this.request(`/users/${userId}`, {
      method: "DELETE",
    })
  }

  // Matches
  async getMatches() {
    return await this.request("/matches")
  }

async createMatch(matchData: any) {
  try {
    console.log("API: Creating match with data:", {
      ...matchData,
      // Don't log sensitive data if any
    });
    
    const response = await this.request("/matches", {
      method: "POST",
      body: JSON.stringify(matchData),
    });
    
    console.log("API: Match creation response:", response);
    
    // Process the response to ensure consistency
    const processedResponse = {
      ...response,
      id: response._id || response.id,
      _id: response._id || response.id,
      // Make sure team IDs are consistent
      homeTeamId: response.homeTeamId?._id || response.homeTeamId,
      awayTeamId: response.awayTeamId?._id || response.awayTeamId
    };
    
    return processedResponse;
  } catch (error) {
    console.error("API Error creating match:", error);
    throw error;
  }
}

  async updateMatch(matchId: string, matchData: any) {
    return await this.request(`/matches/${matchId}`, {
      method: "PUT",
      body: JSON.stringify(matchData),
    })
  }

  async updateMatchStats(matchId: string, statsData: any) {
    return await this.request(`/matches/${matchId}/stats`, {
      method: "PUT",
      body: JSON.stringify(statsData),
    })
  }

  // Health check
  async healthCheck() {
    return await this.request("/health")
  }
}

export const apiService = new ApiService()
export default apiService

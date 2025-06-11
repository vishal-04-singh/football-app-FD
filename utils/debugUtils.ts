/**
 * Utility functions for debugging
 */

// Declare the __DEV__ variable
const __DEV__ = process.env.NODE_ENV !== "production"

/**
 * Logs user and team information to help debug team assignment issues
 * @param user The current user object
 * @param teams Array of teams from the tournament
 */



export const debugTeamAssignment = (user: any, teams: any[]) => {
  if (__DEV__) {
    console.log("DEBUG: Current user:", user)
    console.log("DEBUG: User teamId:", user?.teamId)
    console.log(
      "DEBUG: Available teams:",
      teams.map((t) => ({ id: t.id, _id: t._id, name: t.name })),
    )

    if (user?.teamId) {
      const foundTeam = teams.find((t) => t.id === user.teamId || t._id === user.teamId)
      console.log("DEBUG: Found team:", foundTeam ? foundTeam.name : "No matching team found")
    }
  }
}

/**
 * Logs API response data to help debug authentication issues
 * @param response The API response object
 */
export const debugAuthResponse = (response: any) => {
  if (__DEV__) {
    console.log("DEBUG: Auth response:", {
      token: response.token ? "Present" : "Missing",
      user: response.user,
      teamId: response.user?.teamId,
    })
  }
}

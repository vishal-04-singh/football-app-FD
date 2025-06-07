"use client"

import type React from "react"
import { useState } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal } from "react-native"
import { useAuth } from "../contexts/AuthContext"
import { useTournament } from "../contexts/TournamentContext"
import { COLORS } from "../constants/colors"
import { Ionicons } from "@expo/vector-icons"
import CustomImagePicker from "../../components/ImagePicker"
import PositionPicker from "../../components/PositionPicker"

const ManagementScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { user, logout } = useAuth()
  const { tournament, addTeam, addPlayer } = useTournament()
  const [showAddTeamModal, setShowAddTeamModal] = useState(false)
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false)
  const [teamName, setTeamName] = useState("")
  const [playerName, setPlayerName] = useState("")
  const [playerPosition, setPlayerPosition] = useState("")
  const [playerNumber, setPlayerNumber] = useState("")
  const [selectedTeamId, setSelectedTeamId] = useState("")
  const [loading, setLoading] = useState(false)

  // Add state for images
  const [teamLogo, setTeamLogo] = useState("")
  const [playerPhoto, setPlayerPhoto] = useState("")

  const handleAddTeam = async () => {
    if (!teamName.trim()) {
      Alert.alert("Error", "Please enter team name")
      return
    }

    // ONLY MANAGEMENT can add teams
    if (user?.role !== "management") {
      Alert.alert("Access Denied", "Only tournament management can add teams")
      return
    }

    // Check team limit
    if (tournament?.teams && tournament.teams.length >= 8) {
      Alert.alert("Team Limit Reached", "Maximum number of teams (8) has been reached")
      return
    }

    setLoading(true)
    try {
      await addTeam({
        name: teamName.trim(),
        logo: teamLogo,
      })

      setTeamName("")
      setTeamLogo("")
      setShowAddTeamModal(false)
      Alert.alert("Success", "Team added successfully!")
    } catch (error: any) {
      console.error("Error adding team:", error)
      if (error.message.includes("Maximum number of teams")) {
        Alert.alert("Team Limit Reached", "Maximum number of teams (8) has been reached")
      } else {
        Alert.alert("Error", error.message || "Failed to add team. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleAddPlayer = async () => {
    // Validate each field individually with specific alerts
    if (!playerName.trim()) {
      Alert.alert("Required Field", "Player name is required")
      return
    }

    if (!playerPosition.trim()) {
      Alert.alert("Required Field", "Player position is required")
      return
    }

    if (!playerNumber.trim()) {
      Alert.alert("Required Field", "Jersey number is required")
      return
    }

    // For management users, check if team is selected
    if (user?.role === "management" && !selectedTeamId) {
      Alert.alert("Required Field", "Please select a team")
      return
    }

    // For captains, use their team ID
    const teamIdToUse = user?.role === "captain" ? userTeam?.id || userTeam?._id : selectedTeamId

    if (!teamIdToUse) {
      Alert.alert("Error", "No team available for player assignment")
      return
    }

    // Validate jersey number
    const jerseyNum = Number.parseInt(playerNumber.trim())
    if (isNaN(jerseyNum) || jerseyNum < 1 || jerseyNum > 99) {
      Alert.alert("Invalid Input", "Jersey number must be between 1 and 99")
      return
    }

    const team = tournament?.teams.find((t) => t.id === teamIdToUse || t._id === teamIdToUse)
    if (!team) {
      Alert.alert("Error", "Selected team not found")
      return
    }

    // Allow both management and captains to add players, but captains only to their own team
    if (user?.role === "captain" && user?.teamId !== teamIdToUse) {
      Alert.alert("Access Denied", "You can only add players to your own team")
      return
    }

    if (user?.role === "spectator") {
      Alert.alert("Access Denied", "Spectators cannot add players")
      return
    }

    // Check if jersey number is already taken
    const existingPlayer = team.players.find((p) => p.jerseyNumber === jerseyNum)
    if (existingPlayer) {
      Alert.alert("Jersey Number Taken", `Jersey number ${jerseyNum} is already taken by ${existingPlayer.name}`)
      return
    }

    // Check team capacity (11 players maximum: 7 playing + 3 substitutes)
    if (team.players.length >= 11) {
      Alert.alert("Team Full", "Team already has maximum players (11)")
      return
    }

    const mainPlayersCount = team.players.filter((p) => !p.isSubstitute).length
    const substitutesCount = team.players.filter((p) => p.isSubstitute).length

    // Check specific squad limits
    if (mainPlayersCount >= 7 && substitutesCount >= 3) {
      Alert.alert("Squad Full", "Team already has 7 playing squad members and 3 substitutes")
      return
    }

    const isSubstitute = mainPlayersCount >= 7

    setLoading(true)
    try {
      console.log("🏃‍♂️ Adding player:", {
        name: playerName.trim(),
        position: playerPosition,
        jerseyNumber: jerseyNum,
        teamId: teamIdToUse,
        isSubstitute,
        photo: playerPhoto ? "[IMAGE_PROVIDED]" : "No photo",
      })

      await addPlayer({
        name: playerName.trim(),
        position: playerPosition,
        jerseyNumber: jerseyNum,
        teamId: teamIdToUse,
        isSubstitute,
        photo: playerPhoto,
      })

      // Reset form
      setPlayerName("")
      setPlayerPosition("")
      setPlayerNumber("")
      setPlayerPhoto("")
      if (user?.role === "management") {
        setSelectedTeamId("")
      }
      setShowAddPlayerModal(false)

      Alert.alert(
        "Success",
        `Player ${playerName.trim()} added successfully!${isSubstitute ? " (Added as substitute)" : " (Added to playing squad)"}`,
      )
    } catch (error: any) {
      console.error("❌ Error adding player:", error)

      // Show more specific error messages
      let errorMessage = "Failed to add player. Please try again."

      if (error.message.includes("Missing required fields")) {
        errorMessage = "Please fill in all required fields."
      } else if (error.message.includes("Jersey number")) {
        errorMessage = error.message
      } else if (error.message.includes("Team not found")) {
        errorMessage = "Selected team not found. Please try again."
      } else if (error.message.includes("maximum players")) {
        errorMessage = "Team already has maximum players (11)"
      } else if (error.message.includes("maximum substitutes")) {
        errorMessage = "Team already has maximum substitutes (3)"
      } else if (error.message.includes("Invalid")) {
        errorMessage = error.message
      } else if (error.message.includes("Internal server error")) {
        errorMessage = "Server error occurred. Please check your connection and try again."
      }

      Alert.alert("Error", errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", onPress: logout, style: "destructive" },
    ])
  }

  const userTeam =
    user?.role === "captain" && user?.teamId
      ? tournament?.teams.find((t) => t.id === user.teamId || t._id === user.teamId)
      : null

  const getScreenTitle = () => {
    switch (user?.role) {
      case "management":
        return "Management"
      case "captain":
        return "Team Management"
      case "spectator":
        return "Profile"
      default:
        return "Profile"
    }
  }

  const getScreenSubtitle = () => {
    switch (user?.role) {
      case "management":
        return "Tournament Management"
      case "captain":
        return "Team Management"
      case "spectator":
        return "Fan Profile & Settings"
      default:
        return "Profile & Settings"
    }
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{getScreenTitle()}</Text>
        <Text style={styles.subtitle}>{getScreenSubtitle()}</Text>
      </View>

      <View style={styles.userInfo}>
        <View style={styles.userCard}>
          <View style={styles.userAvatar}>
            <Text style={styles.userInitials}>
              {user?.name
                ? user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                : "U"}
            </Text>
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{user?.name || "User"}</Text>
            <Text style={styles.userRole}>{user?.role?.toUpperCase() || "SPECTATOR"}</Text>
            {userTeam && <Text style={styles.userTeam}>{userTeam.name}</Text>}
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color={COLORS.red} />
          </TouchableOpacity>
        </View>
      </View>

      {user?.role === "spectator" && (
        <View style={styles.spectatorSection}>
          <Text style={styles.sectionTitle}>Fan Dashboard</Text>

          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>Tournament Overview</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{tournament?.teams.length || 0}/8</Text>
                <Text style={styles.statLabel}>Teams</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {tournament?.matches.filter((m) => m.status === "completed").length || 0}
                </Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {tournament?.matches.filter((m) => m.status === "upcoming").length || 0}
                </Text>
                <Text style={styles.statLabel}>Upcoming</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{tournament?.currentWeek || 0}</Text>
                <Text style={styles.statLabel}>Current Week</Text>
              </View>
            </View>
          </View>

          <View style={styles.fanPreferences}>
            <Text style={styles.preferencesTitle}>🏆 Your Football Experience</Text>
            <View style={styles.preferenceItem}>
              <Ionicons name="notifications-outline" size={24} color={COLORS.primary} />
              <View style={styles.preferenceContent}>
                <Text style={styles.preferenceTitle}>Match Notifications</Text>
                <Text style={styles.preferenceSubtitle}>Get notified about live matches and results</Text>
              </View>
            </View>
            <View style={styles.preferenceItem}>
              <Ionicons name="star-outline" size={24} color={COLORS.primary} />
              <View style={styles.preferenceContent}>
                <Text style={styles.preferenceTitle}>Favorite Teams</Text>
                <Text style={styles.preferenceSubtitle}>Follow your favorite teams closely</Text>
              </View>
            </View>
            <View style={styles.preferenceItem}>
              <Ionicons name="trophy-outline" size={24} color={COLORS.primary} />
              <View style={styles.preferenceContent}>
                <Text style={styles.preferenceTitle}>Tournament Updates</Text>
                <Text style={styles.preferenceSubtitle}>Stay updated with tournament progress</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.logoutCard} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color={COLORS.red} />
            <View style={styles.logoutContent}>
              <Text style={styles.logoutTitle}>Logout</Text>
              <Text style={styles.logoutSubtitle}>Sign out of your account</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
          </TouchableOpacity>
        </View>
      )}

      {/* MANAGEMENT SECTION - Only for management role */}
      {user?.role === "management" && (
        <View style={styles.managementSection}>
          <Text style={styles.sectionTitle}>Tournament Management</Text>

          <TouchableOpacity
            style={[styles.actionCard, styles.primaryActionCard]}
            onPress={() => navigation.navigate("LiveMatch")}
          >
            <Ionicons name="play-circle-outline" size={24} color={COLORS.black} />
            <View style={styles.actionContent}>
              <Text style={[styles.actionTitle, styles.primaryActionTitle]}>Live Match Management</Text>
              <Text style={[styles.actionSubtitle, styles.primaryActionSubtitle]}>
                Manage live matches and real-time updates
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate("ScheduleMatch")}>
            <Ionicons name="calendar-outline" size={24} color={COLORS.primary} />
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Schedule Matches</Text>
              <Text style={styles.actionSubtitle}>Schedule new matches and view upcoming fixtures</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
          </TouchableOpacity>

          {/* ADD TEAM - ONLY FOR MANAGEMENT */}
          <TouchableOpacity
            style={[styles.actionCard, tournament?.teams && tournament.teams.length >= 8 && styles.disabledActionCard]}
            onPress={() => setShowAddTeamModal(true)}
            disabled={tournament?.teams && tournament.teams.length >= 8}
          >
            <Ionicons
              name="add-circle-outline"
              size={24}
              color={tournament?.teams && tournament.teams.length >= 8 ? COLORS.gray : COLORS.primary}
            />
            <View style={styles.actionContent}>
              <Text
                style={[
                  styles.actionTitle,
                  tournament?.teams && tournament.teams.length >= 8 && styles.disabledActionTitle,
                ]}
              >
                Add New Team ({tournament?.teams?.length || 0}/8)
              </Text>
              <Text
                style={[
                  styles.actionSubtitle,
                  tournament?.teams && tournament.teams.length >= 8 && styles.disabledActionSubtitle,
                ]}
              >
                {tournament?.teams && tournament.teams.length >= 8
                  ? "Maximum teams reached"
                  : "Register a new team to the tournament"}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={tournament?.teams && tournament.teams.length >= 8 ? COLORS.gray : COLORS.gray}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => setShowAddPlayerModal(true)}>
            <Ionicons name="person-add-outline" size={24} color={COLORS.primary} />
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Add Player</Text>
              <Text style={styles.actionSubtitle}>Add a player to any team (max 11 per team)</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
          </TouchableOpacity>

          {/* <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate("UserManagement")}>
            <Ionicons name="people-outline" size={24} color={COLORS.blue} />
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>User Management</Text>
              <Text style={styles.actionSubtitle}>Create and manage tournament users (captains, managers)</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
          </TouchableOpacity> */}

          <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate("Main", { screen: "Teams" })}>
            <Ionicons name="create-outline" size={24} color={COLORS.blue} />
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Edit Teams & Players</Text>
              <Text style={styles.actionSubtitle}>Modify existing teams and player information</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
          </TouchableOpacity>

          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>Tournament Statistics</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{tournament?.teams.length || 0}/8</Text>
                <Text style={styles.statLabel}>Teams</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {tournament?.teams.reduce((sum, team) => sum + team.players.length, 0) || 0}
                </Text>
                <Text style={styles.statLabel}>Players</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{tournament?.matches.length || 0}</Text>
                <Text style={styles.statLabel}>Matches</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {tournament?.matches.filter((m) => m.status === "live").length || 0}
                </Text>
                <Text style={styles.statLabel}>Live Now</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* CAPTAIN SECTION - Only for captain role */}
      {user?.role === "captain" && userTeam && (
        <View style={styles.captainSection}>
          <Text style={styles.sectionTitle}>Team Management</Text>

          <View style={styles.teamCard}>
            <Text style={styles.teamCardTitle}>{userTeam.name}</Text>
            <View style={styles.teamStats}>
              <View style={styles.teamStatItem}>
                <Text style={styles.teamStatValue}>{userTeam.players.length}/11</Text>
                <Text style={styles.teamStatLabel}>Players</Text>
              </View>
              <View style={styles.teamStatItem}>
                <Text style={styles.teamStatValue}>{userTeam.players.filter((p) => !p.isSubstitute).length}/7</Text>
                <Text style={styles.teamStatLabel}>Playing</Text>
              </View>
              <View style={styles.teamStatItem}>
                <Text style={styles.teamStatValue}>{userTeam.players.filter((p) => p.isSubstitute).length}/3</Text>
                <Text style={styles.teamStatLabel}>Subs</Text>
              </View>
            </View>
          </View>

          {/* ADD PLAYER - ONLY TO OWN TEAM FOR CAPTAINS */}
          <TouchableOpacity
            style={[
              styles.actionCard,
              styles.captainPrimaryCard,
              userTeam.players.length >= 11 && styles.disabledActionCard,
            ]}
            onPress={() => {
              setSelectedTeamId(userTeam.id || userTeam._id)
              setShowAddPlayerModal(true)
            }}
            disabled={userTeam.players.length >= 11}
          >
            <Ionicons
              name="person-add-outline"
              size={24}
              color={userTeam.players.length >= 11 ? COLORS.gray : COLORS.black}
            />
            <View style={styles.actionContent}>
              <Text
                style={[
                  styles.actionTitle,
                  styles.captainPrimaryTitle,
                  userTeam.players.length >= 11 && styles.disabledActionTitle,
                ]}
              >
                Add Player to Team
              </Text>
              <Text
                style={[
                  styles.actionSubtitle,
                  styles.captainPrimarySubtitle,
                  userTeam.players.length >= 11 && styles.disabledActionSubtitle,
                ]}
              >
                {userTeam.players.length >= 11
                  ? "Team is full (11/11 players)"
                  : `Add a new player (${userTeam.players.length}/11)`}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={userTeam.players.length >= 11 ? COLORS.gray : COLORS.black}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate("Main", { screen: "Teams" })}>
            <Ionicons name="people-outline" size={24} color={COLORS.primary} />
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>View Team Details</Text>
              <Text style={styles.actionSubtitle}>View your team's players and statistics</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
          </TouchableOpacity>

          <View style={styles.captainNote}>
            <Ionicons name="information-circle-outline" size={20} color={COLORS.blue} />
            <Text style={styles.captainNoteText}>
              As team captain, you can add new players to your team (max 11: 7 playing + 3 substitutes). Only tournament
              managers can create new teams and edit existing player information.
            </Text>
          </View>

          <View style={styles.captainLimitations}>
            <Text style={styles.limitationsTitle}>Captain Permissions</Text>
            <View style={styles.permissionItem}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.green} />
              <Text style={styles.permissionText}>Add players to your team (max 11)</Text>
            </View>
            <View style={styles.permissionItem}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.green} />
              <Text style={styles.permissionText}>View team statistics</Text>
            </View>
            <View style={styles.permissionItem}>
              <Ionicons name="close-circle" size={16} color={COLORS.red} />
              <Text style={styles.permissionText}>Edit player information</Text>
            </View>
            <View style={styles.permissionItem}>
              <Ionicons name="close-circle" size={16} color={COLORS.red} />
              <Text style={styles.permissionText}>Create new teams</Text>
            </View>
            <View style={styles.permissionItem}>
              <Ionicons name="close-circle" size={16} color={COLORS.red} />
              <Text style={styles.permissionText}>Schedule matches</Text>
            </View>
          </View>
        </View>
      )}

      {/* CAPTAIN WITHOUT TEAM */}
      {user?.role === "captain" && !userTeam && (
        <View style={styles.captainSection}>
          <Text style={styles.sectionTitle}>Team Management</Text>

          <View style={styles.noTeamCard}>
            <Ionicons name="people-outline" size={60} color={COLORS.gray} />
            <Text style={styles.noTeamTitle}>No Team Assigned</Text>
            <Text style={styles.noTeamText}>
              You are not currently assigned to any team. Please contact tournament management to be assigned to a team.
            </Text>
          </View>

          <View style={styles.captainNote}>
            <Ionicons name="information-circle-outline" size={20} color={COLORS.blue} />
            <Text style={styles.captainNoteText}>
              Once you are assigned to a team by tournament management, you will be able to add players to your team
              (max 11: 7 playing + 3 substitutes).
            </Text>
          </View>
        </View>
      )}

      {/* Add Team Modal - ONLY FOR MANAGEMENT */}
      <Modal
        visible={showAddTeamModal && user?.role === "management"}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddTeamModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Team ({tournament?.teams?.length || 0}/8)</Text>

            <View style={styles.imageSection}>
              <Text style={styles.inputLabel}>Team Logo:</Text>
              <CustomImagePicker
                onImageSelected={setTeamLogo}
                currentImage={teamLogo}
                placeholder="Team Logo"
                size={80}
              />
            </View>

            <TextInput
              style={styles.input}
              placeholder="Team Name"
              placeholderTextColor={COLORS.gray}
              value={teamName}
              onChangeText={setTeamName}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowAddTeamModal(false)}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton, loading && styles.disabledButton]}
                onPress={handleAddTeam}
                disabled={loading}
              >
                <Text style={styles.confirmButtonText}>{loading ? "Adding..." : "Add Team"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Player Modal - For Management and Captains */}
      <Modal
        visible={showAddPlayerModal && (user?.role === "management" || user?.role === "captain")}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddPlayerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Add New Player</Text>

              {/* TEAM SELECTION - Only for management */}
              {user?.role === "management" && (
                <View style={styles.pickerContainer}>
                  <Text style={styles.pickerLabel}>Select Team: *</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {tournament?.teams.map((team) => {
                      const isTeamFull = team.players.length >= 11
                      return (
                        <TouchableOpacity
                          key={team.id || team._id}
                          style={[
                            styles.teamPickerItem,
                            (selectedTeamId === team.id || selectedTeamId === team._id) &&
                              styles.selectedTeamPickerItem,
                            isTeamFull && styles.disabledTeamPickerItem,
                          ]}
                          onPress={() => !isTeamFull && setSelectedTeamId(team.id || team._id)}
                          disabled={isTeamFull}
                        >
                          <Text
                            style={[
                              styles.teamPickerText,
                              (selectedTeamId === team.id || selectedTeamId === team._id) &&
                                styles.selectedTeamPickerText,
                              isTeamFull && styles.disabledTeamPickerText,
                            ]}
                          >
                            {team.name} ({team.players.length}/11)
                          </Text>
                        </TouchableOpacity>
                      )
                    })}
                  </ScrollView>
                </View>
              )}

              {/* TEAM INFO - For captains (fixed team) */}
              {user?.role === "captain" && userTeam && (
                <View style={styles.teamInfoSection}>
                  <Text style={styles.teamInfoLabel}>Adding player to:</Text>
                  <View style={styles.teamInfoCard}>
                    <Text style={styles.teamInfoName}>{userTeam.name}</Text>
                    <Text style={styles.teamInfoDetails}>
                      Current players: {userTeam.players.length}/11 | Playing:{" "}
                      {userTeam.players.filter((p) => !p.isSubstitute).length}/7 | Subs:{" "}
                      {userTeam.players.filter((p) => p.isSubstitute).length}/3
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.imageSection}>
                <Text style={styles.inputLabel}>Player Photo:</Text>
                <CustomImagePicker
                  onImageSelected={setPlayerPhoto}
                  currentImage={playerPhoto}
                  placeholder="Player Photo"
                  size={80}
                />
              </View>

              <Text style={styles.inputLabel}>Player Name: *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter player name"
                placeholderTextColor={COLORS.gray}
                value={playerName}
                onChangeText={setPlayerName}
              />

              <View style={styles.positionSection}>
                <Text style={styles.inputLabel}>Position: *</Text>
                <PositionPicker selectedPosition={playerPosition} onPositionSelect={setPlayerPosition} />
              </View>

              <Text style={styles.inputLabel}>Jersey Number: *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter jersey number (1-99)"
                placeholderTextColor={COLORS.gray}
                value={playerNumber}
                onChangeText={setPlayerNumber}
                keyboardType="numeric"
                maxLength={2}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setShowAddPlayerModal(false)
                    // Reset form
                    setPlayerName("")
                    setPlayerPosition("")
                    setPlayerNumber("")
                    setPlayerPhoto("")
                    if (user?.role === "management") {
                      setSelectedTeamId("")
                    }
                  }}
                  disabled={loading}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmButton, loading && styles.disabledButton]}
                  onPress={handleAddPlayer}
                  disabled={loading}
                >
                  <Text style={styles.confirmButtonText}>{loading ? "Adding..." : "Add Player"}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.black,
  },
  header: {
    padding: 20,
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 5,
  },
  userInfo: {
    padding: 20,
  },
  userCard: {
    backgroundColor: COLORS.background,
    borderRadius: 15,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  userInitials: {
    color: COLORS.black,
    fontSize: 20,
    fontWeight: "bold",
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "bold",
  },
  userRole: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 2,
  },
  userTeam: {
    color: COLORS.gray,
    fontSize: 14,
    marginTop: 2,
  },
  logoutButton: {
    padding: 10,
  },
  managementSection: {
    padding: 20,
  },
  captainSection: {
    padding: 20,
  },
  spectatorSection: {
    padding: 20,
  },
  sectionTitle: {
    color: COLORS.primary,
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
  },
  actionCard: {
    backgroundColor: COLORS.background,
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    flexDirection: "row",
    alignItems: "center",
  },
  primaryActionCard: {
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  captainPrimaryCard: {
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  disabledActionCard: {
    backgroundColor: COLORS.gray,
    opacity: 0.6,
  },
  actionContent: {
    flex: 1,
    marginLeft: 15,
  },
  actionTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
  },
  primaryActionTitle: {
    color: COLORS.black,
  },
  captainPrimaryTitle: {
    color: COLORS.black,
  },
  disabledActionTitle: {
    color: COLORS.gray,
  },
  actionSubtitle: {
    color: COLORS.gray,
    fontSize: 14,
    marginTop: 2,
  },
  primaryActionSubtitle: {
    color: COLORS.black,
    opacity: 0.8,
  },
  captainPrimarySubtitle: {
    color: COLORS.black,
    opacity: 0.8,
  },
  disabledActionSubtitle: {
    color: COLORS.gray,
    opacity: 0.7,
  },
  statsCard: {
    backgroundColor: COLORS.background,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  statsTitle: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    color: COLORS.primary,
    fontSize: 24,
    fontWeight: "bold",
  },
  statLabel: {
    color: COLORS.gray,
    fontSize: 12,
    marginTop: 5,
  },
  teamCard: {
    backgroundColor: COLORS.background,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  teamCardTitle: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  teamStats: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  teamStatItem: {
    alignItems: "center",
  },
  teamStatValue: {
    color: COLORS.primary,
    fontSize: 20,
    fontWeight: "bold",
  },
  teamStatLabel: {
    color: COLORS.gray,
    fontSize: 12,
    marginTop: 5,
  },
  noTeamCard: {
    backgroundColor: COLORS.background,
    borderRadius: 15,
    padding: 30,
    alignItems: "center",
    marginBottom: 20,
  },
  noTeamTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 15,
    marginBottom: 10,
  },
  noTeamText: {
    color: COLORS.gray,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  captainNote: {
    backgroundColor: COLORS.background,
    borderRadius: 15,
    padding: 15,
    flexDirection: "row",
    alignItems: "flex-start",
    borderLeftWidth: 4,
    borderLeftColor: COLORS.blue,
    marginBottom: 20,
  },
  captainNoteText: {
    color: COLORS.gray,
    fontSize: 14,
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
  },
  captainLimitations: {
    backgroundColor: COLORS.background,
    borderRadius: 15,
    padding: 20,
  },
  limitationsTitle: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 15,
  },
  permissionItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  permissionText: {
    color: COLORS.gray,
    fontSize: 14,
    marginLeft: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderRadius: 20,
    padding: 30,
    width: "90%",
    maxWidth: 400,
    maxHeight: "85%",
  },
  modalTitle: {
    color: COLORS.primary,
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    backgroundColor: COLORS.black,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    color: COLORS.white,
    fontSize: 16,
  },
  errorInput: {
    borderColor: COLORS.red,
  },
  errorText: {
    color: COLORS.red,
    fontSize: 12,
    marginTop: -10,
    marginBottom: 10,
  },
  pickerContainer: {
    marginBottom: 20,
  },
  pickerLabel: {
    color: COLORS.white,
    fontSize: 16,
    marginBottom: 10,
    fontWeight: "bold",
  },
  teamPickerItem: {
    backgroundColor: COLORS.black,
    borderWidth: 1,
    borderColor: COLORS.gray,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
  },
  selectedTeamPickerItem: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  disabledTeamPickerItem: {
    backgroundColor: COLORS.gray,
    opacity: 0.5,
  },
  teamPickerText: {
    color: COLORS.gray,
    fontSize: 14,
  },
  selectedTeamPickerText: {
    color: COLORS.black,
    fontWeight: "bold",
  },
  disabledTeamPickerText: {
    color: COLORS.gray,
    opacity: 0.7,
  },
  teamInfoSection: {
    marginBottom: 20,
  },
  teamInfoLabel: {
    color: COLORS.white,
    fontSize: 16,
    marginBottom: 10,
    fontWeight: "bold",
  },
  teamInfoCard: {
    backgroundColor: COLORS.black,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 10,
    padding: 15,
  },
  teamInfoName: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "bold",
  },
  teamInfoDetails: {
    color: COLORS.gray,
    fontSize: 14,
    marginTop: 5,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: COLORS.gray,
    marginRight: 10,
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
    marginLeft: 10,
  },
  disabledButton: {
    opacity: 0.6,
  },
  cancelButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
  },
  confirmButtonText: {
    color: COLORS.black,
    fontSize: 16,
    fontWeight: "bold",
  },
  fanPreferences: {
    backgroundColor: COLORS.background,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  preferencesTitle: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
  },
  preferenceItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray,
  },
  preferenceContent: {
    flex: 1,
    marginLeft: 15,
  },
  preferenceTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
  },
  preferenceSubtitle: {
    color: COLORS.gray,
    fontSize: 14,
    marginTop: 2,
  },
  logoutCard: {
    backgroundColor: COLORS.background,
    borderRadius: 15,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    borderLeftWidth: 4,
    borderLeftColor: COLORS.red,
  },
  logoutContent: {
    flex: 1,
    marginLeft: 15,
  },
  logoutTitle: {
    color: COLORS.red,
    fontSize: 16,
    fontWeight: "bold",
  },
  logoutSubtitle: {
    color: COLORS.gray,
    fontSize: 14,
    marginTop: 2,
  },
  imageSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  inputLabel: {
    color: COLORS.white,
    fontSize: 16,
    marginBottom: 10,
    fontWeight: "bold",
  },
  positionSection: {
    marginBottom: 15,
  },
})

export default ManagementScreen

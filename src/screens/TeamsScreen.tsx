"use client"

import type React from "react"
import { useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Image,
  Alert,
  Modal,
  TextInput,
} from "react-native"
import { useTournament } from "../contexts/TournamentContext"
import { COLORS } from "../constants/colors"
import type { Team, Player } from "../types"
import { Ionicons } from "@expo/vector-icons"
import { useAuth } from "../contexts/AuthContext"
import apiService from "../../services/api"

const TeamsScreen: React.FC = () => {
  const { user } = useAuth()
  const { tournament, refreshData } = useTournament()
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [teamEditMode, setTeamEditMode] = useState(false) // New state for team list edit mode
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editPlayerName, setEditPlayerName] = useState("")
  const [editPlayerPosition, setEditPlayerPosition] = useState("")
  const [editPlayerNumber, setEditPlayerNumber] = useState("")
  const [loading, setLoading] = useState(false)

  const handleDeleteTeam = async (team: Team) => {
    Alert.alert(
      "Delete Team",
      `Are you sure you want to delete ${team.name}? This will also delete all players in this team.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setLoading(true)
            try {
              console.log(`🗑️ Attempting to delete team: ${team.name} (ID: ${team.id})`)

              // Use the deleteTeam API method
              await apiService.deleteTeam(team.id)

              console.log(`✅ Team ${team.name} deleted successfully`)
              Alert.alert("Success", "Team deleted successfully!")

              // Refresh the tournament data
              await refreshData()
            } catch (error: any) {
              console.error("❌ Error deleting team:", error)
              Alert.alert("Error", error.message || "Failed to delete team")
            } finally {
              setLoading(false)
            }
          },
        },
      ],
    )
  }

  const renderTeamCard = ({ item: team }: { item: Team }) => (
    <TouchableOpacity style={styles.teamCard} onPress={() => setSelectedTeam(team)} disabled={loading}>
      <View style={styles.teamHeader}>
        <View style={styles.teamLogo}>
          {team.logo ? (
            <Image source={{ uri: team.logo }} style={styles.teamLogoImage} />
          ) : (
            <Text style={styles.teamLogoText}>
              {team.name
                .split(" ")
                .map((word) => word[0])
                .join("")
                .toUpperCase()}
            </Text>
          )}
        </View>
        <View style={styles.teamInfo}>
          <Text style={styles.teamName}>{team.name}</Text>
          <Text style={styles.teamStats}>
            {team.players.length}/11 Players • {team.points} Points
          </Text>
        </View>
        <View style={styles.teamActions}>
          {user?.role === "management" && teamEditMode ? (
            <TouchableOpacity
              style={styles.deleteTeamButton}
              onPress={(e) => {
                e.stopPropagation()
                handleDeleteTeam(team)
              }}
              disabled={loading}
            >
              <Ionicons name="trash-outline" size={20} color={COLORS.red} />
            </TouchableOpacity>
          ) : (
            <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
          )}
        </View>
      </View>

      <View style={styles.teamStatsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{team.matchesPlayed}</Text>
          <Text style={styles.statLabel}>Played</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{team.wins}</Text>
          <Text style={styles.statLabel}>Won</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{team.draws}</Text>
          <Text style={styles.statLabel}>Draw</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{team.losses}</Text>
          <Text style={styles.statLabel}>Lost</Text>
        </View>
      </View>
    </TouchableOpacity>
  )

  const renderPlayerCard = ({ item: player }: { item: Player }) => (
    <View style={styles.playerCard}>
      <View style={styles.playerInfo}>
        <View style={styles.playerAvatar}>
          {player.photo ? (
            <Image source={{ uri: player.photo }} style={styles.playerPhoto} />
          ) : (
            <Text style={styles.playerNumber}>{player.jerseyNumber}</Text>
          )}
        </View>
        <View style={styles.playerDetails}>
          <Text style={styles.playerName}>{player.name}</Text>
          <Text style={styles.playerPosition}>{player.position}</Text>
        </View>
      </View>
      <View style={styles.playerActions}>
        {player.isSubstitute && (
          <View style={styles.substituteBadge}>
            <Text style={styles.substituteText}>SUB</Text>
          </View>
        )}
        {user?.role === "management" && editMode && (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => {
              setEditingPlayer(player)
              setEditPlayerName(player.name)
              setEditPlayerPosition(player.position)
              setEditPlayerNumber(player.jerseyNumber.toString())
              setShowEditModal(true)
            }}
          >
            <Ionicons name="create-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  )

  const handleEditPlayer = async () => {
    if (!editingPlayer || !editPlayerName.trim() || !editPlayerPosition.trim() || !editPlayerNumber.trim()) {
      Alert.alert("Error", "Please fill in all fields")
      return
    }

    const jerseyNum = Number.parseInt(editPlayerNumber.trim())
    if (isNaN(jerseyNum) || jerseyNum < 1 || jerseyNum > 99) {
      Alert.alert("Invalid Input", "Jersey number must be between 1 and 99")
      return
    }

    // Check if jersey number is taken by another player
    if (selectedTeam) {
      const existingPlayer = selectedTeam.players.find((p) => p.jerseyNumber === jerseyNum && p.id !== editingPlayer.id)
      if (existingPlayer) {
        Alert.alert("Jersey Number Taken", `Jersey number ${jerseyNum} is already taken by ${existingPlayer.name}`)
        return
      }
    }

    setLoading(true)
    try {
      await apiService.updatePlayer(editingPlayer.id, {
        name: editPlayerName.trim(),
        position: editPlayerPosition.trim(),
        jerseyNumber: jerseyNum,
      })

      Alert.alert("Success", "Player updated successfully!")
      setShowEditModal(false)
      setEditingPlayer(null)
      await refreshData()

      // Update selected team with fresh data
      if (selectedTeam) {
        const updatedTournament = await apiService.getTournamentData()
        const updatedTeam = updatedTournament.teams.find((t: Team) => t.id === selectedTeam.id)
        if (updatedTeam) {
          setSelectedTeam(updatedTeam)
        }
      }
    } catch (error: any) {
      console.error("Error updating player:", error)
      Alert.alert("Error", error.message || "Failed to update player")
    } finally {
      setLoading(false)
    }
  }

  const handleDeletePlayer = async (player: Player) => {
    Alert.alert("Delete Player", `Are you sure you want to delete ${player.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setLoading(true)
          try {
            await apiService.deletePlayer(player.id)
            Alert.alert("Success", "Player deleted successfully!")
            await refreshData()

            // Update selected team with fresh data
            if (selectedTeam) {
              const updatedTournament = await apiService.getTournamentData()
              const updatedTeam = updatedTournament.teams.find((t: Team) => t.id === selectedTeam.id)
              if (updatedTeam) {
                setSelectedTeam(updatedTeam)
              }
            }
          } catch (error: any) {
            console.error("Error deleting player:", error)
            Alert.alert("Error", error.message || "Failed to delete player")
          } finally {
            setLoading(false)
          }
        },
      },
    ])
  }

  if (selectedTeam) {
    const mainPlayers = selectedTeam.players.filter((p) => !p.isSubstitute)
    const substitutes = selectedTeam.players.filter((p) => p.isSubstitute)

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              setSelectedTeam(null)
              setEditMode(false) // Reset edit mode when going back
            }}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>{selectedTeam.name}</Text>
          {user?.role === "management" && (
            <TouchableOpacity style={styles.editToggleButton} onPress={() => setEditMode(!editMode)}>
              <Ionicons
                name={editMode ? "checkmark-outline" : "settings-outline"}
                size={24}
                color={editMode ? COLORS.green : COLORS.primary}
              />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView style={styles.teamDetails}>
          <View style={styles.teamOverview}>
            <View style={styles.largeLogo}>
              {selectedTeam.logo ? (
                <Image source={{ uri: selectedTeam.logo }} style={styles.largeLogoImage} />
              ) : (
                <Text style={styles.largeLogoText}>
                  {selectedTeam.name
                    .split(" ")
                    .map((word) => word[0])
                    .join("")
                    .toUpperCase()}
                </Text>
              )}
            </View>
            <Text style={styles.teamFullName}>{selectedTeam.name}</Text>

            <View style={styles.overviewStats}>
              <View style={styles.overviewStatItem}>
                <Text style={styles.overviewStatValue}>{selectedTeam.points}</Text>
                <Text style={styles.overviewStatLabel}>Points</Text>
              </View>
              <View style={styles.overviewStatItem}>
                <Text style={styles.overviewStatValue}>{selectedTeam.goalsFor}</Text>
                <Text style={styles.overviewStatLabel}>Goals For</Text>
              </View>
              <View style={styles.overviewStatItem}>
                <Text style={styles.overviewStatValue}>{selectedTeam.goalsAgainst}</Text>
                <Text style={styles.overviewStatLabel}>Goals Against</Text>
              </View>
            </View>
          </View>

          <View style={styles.playersSection}>
            <Text style={styles.sectionTitle}>Playing Squad ({mainPlayers.length}/7 Players)</Text>
            <FlatList
              data={mainPlayers}
              renderItem={renderPlayerCard}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          </View>

          <View style={styles.playersSection}>
            <Text style={styles.sectionTitle}>Substitutes ({substitutes.length}/3 Players)</Text>
            <FlatList
              data={substitutes}
              renderItem={renderPlayerCard}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          </View>
        </ScrollView>

        {/* Edit Player Modal */}
        <Modal visible={showEditModal} transparent animationType="slide" onRequestClose={() => setShowEditModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Edit Player</Text>

              <Text style={styles.inputLabel}>Player Name:</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter player name"
                placeholderTextColor={COLORS.gray}
                value={editPlayerName}
                onChangeText={setEditPlayerName}
                editable={!loading}
              />

              <Text style={styles.inputLabel}>Position:</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter position"
                placeholderTextColor={COLORS.gray}
                value={editPlayerPosition}
                onChangeText={setEditPlayerPosition}
                editable={!loading}
              />

              <Text style={styles.inputLabel}>Jersey Number:</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter jersey number (1-99)"
                placeholderTextColor={COLORS.gray}
                value={editPlayerNumber}
                onChangeText={setEditPlayerNumber}
                keyboardType="numeric"
                maxLength={2}
                editable={!loading}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.deleteButton]}
                  onPress={() => {
                    setShowEditModal(false)
                    if (editingPlayer) {
                      handleDeletePlayer(editingPlayer)
                    }
                  }}
                  disabled={loading}
                >
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowEditModal(false)}
                  disabled={loading}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={handleEditPlayer}
                  disabled={loading}
                >
                  <Text style={styles.confirmButtonText}>{loading ? "Saving..." : "Save"}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Teams</Text>
        <View style={styles.headerRight}>
          <Text style={styles.subtitle}>{tournament?.teams.length || 0}/8 teams competing</Text>
          {user?.role === "management" && (
            <TouchableOpacity style={styles.editTeamsButton} onPress={() => setTeamEditMode(!teamEditMode)}>
              <Ionicons
                name={teamEditMode ? "checkmark-outline" : "create-outline"}
                size={24}
                color={teamEditMode ? COLORS.green : COLORS.primary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {teamEditMode && user?.role === "management" && (
        <View style={styles.editModeIndicator}>
          <Text style={styles.editModeText}>Edit Teams Mode - Click trash icon to delete teams</Text>
        </View>
      )}

      {loading && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>Processing...</Text>
        </View>
      )}

      <FlatList
        data={tournament?.teams || []}
        renderItem={renderTeamCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.teamsList}
        showsVerticalScrollIndicator={false}
      />
    </View>
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.primary,
    flex: 1,
    marginBottom: 9.5,
    marginLeft: 10,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.gray,
    marginRight: 15,
  },
  editTeamsButton: {
    padding: 8,
  },
  editModeIndicator: {
    backgroundColor: COLORS.primary,
    padding: 10,
    alignItems: "center",
  },
  editModeText: {
    color: COLORS.black,
    fontSize: 14,
    fontWeight: "bold",
  },
  editToggleButton: {
    padding: 10,
  },
  loadingOverlay: {
    backgroundColor: COLORS.primary,
    padding: 10,
    alignItems: "center",
  },
  loadingText: {
    color: COLORS.black,
    fontSize: 14,
    fontWeight: "bold",
  },
  teamsList: {
    padding: 20,
  },
  teamCard: {
    backgroundColor: COLORS.background,
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
  },
  teamHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  teamLogo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  teamLogoText: {
    color: COLORS.black,
    fontSize: 16,
    fontWeight: "bold",
  },
  teamLogoImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "bold",
  },
  teamStats: {
    color: COLORS.gray,
    fontSize: 14,
    marginTop: 2,
  },
  teamActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  teamStatsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: "bold",
  },
  statLabel: {
    color: COLORS.gray,
    fontSize: 12,
    marginTop: 2,
  },
  teamDetails: {
    flex: 1,
  },
  teamOverview: {
    alignItems: "center",
    padding: 30,
    backgroundColor: COLORS.background,
    margin: 20,
    borderRadius: 15,
  },
  largeLogo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  largeLogoText: {
    color: COLORS.black,
    fontSize: 24,
    fontWeight: "bold",
  },
  largeLogoImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  teamFullName: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  overviewStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
  },
  overviewStatItem: {
    alignItems: "center",
  },
  overviewStatValue: {
    color: COLORS.primary,
    fontSize: 24,
    fontWeight: "bold",
  },
  overviewStatLabel: {
    color: COLORS.gray,
    fontSize: 14,
    marginTop: 5,
  },
  playersSection: {
    margin: 20,
  },
  sectionTitle: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
  },
  playerCard: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  playerInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  playerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  playerNumber: {
    color: COLORS.black,
    fontSize: 16,
    fontWeight: "bold",
  },
  playerDetails: {
    flex: 1,
  },
  playerName: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
  },
  playerPosition: {
    color: COLORS.gray,
    fontSize: 14,
    marginTop: 2,
  },
  substituteBadge: {
    backgroundColor: COLORS.blue,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  substituteText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "bold",
  },
  playerPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  playerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  editButton: {
    padding: 8,
    marginLeft: 10,
    backgroundColor: COLORS.background,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  deleteTeamButton: {
    padding: 8,
    backgroundColor: COLORS.background,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.red,
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
  },
  modalTitle: {
    color: COLORS.primary,
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  inputLabel: {
    color: COLORS.white,
    fontSize: 16,
    marginBottom: 10,
    fontWeight: "bold",
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
    marginHorizontal: 5,
  },
  deleteButton: {
    backgroundColor: COLORS.red,
  },
  cancelButton: {
    backgroundColor: COLORS.gray,
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
  },
  deleteButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
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
})

export default TeamsScreen

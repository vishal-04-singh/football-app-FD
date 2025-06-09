"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { 
  View, Text, StyleSheet, ScrollView, Image, 
  TouchableOpacity, SafeAreaView, StatusBar
} from "react-native"
import { useTournament } from "../contexts/TournamentContext"
import { useNavigation, useRoute } from "@react-navigation/native"
import { COLORS } from "../constants/colors"
import type { Match, MatchEvent } from "../types"
import { Ionicons } from "@expo/vector-icons"

const MatchDetailScreen: React.FC = () => {
  const { tournament } = useTournament()
  const navigation = useNavigation()
  const route = useRoute()
  // @ts-ignore - ignore type issues with route params
  const { matchId } = route.params || {}
  
  const [match, setMatch] = useState<Match | null>(null)
  const [sortedEvents, setSortedEvents] = useState<MatchEvent[]>([])
  const [activeTab, setActiveTab] = useState<'events' | 'stats'>('events')
  
  useEffect(() => {
    if (tournament?.matches && matchId) {
      const foundMatch = tournament.matches.find(m => 
        m.id === matchId || m._id === matchId || String(m.id) === String(matchId)
      )
      
      if (foundMatch) {
        setMatch(foundMatch)
        
        // Sort events by minute
        if (foundMatch.events && foundMatch.events.length > 0) {
          // Clone events array and add teamId if not present
          const eventsWithTeamIds = foundMatch.events.map(event => {
            // If event doesn't have teamId, attempt to infer it
            if (!event.teamId) {
              // Logic to determine team - this is a simplification
              // You might need more complex logic based on your app's data structure
              const isHomeTeamPlayer = true // Replace with actual logic
              return {
                ...event,
                teamId: isHomeTeamPlayer ? foundMatch.homeTeamId : foundMatch.awayTeamId
              }
            }
            return event
          })
          
          // Sort events by minute
          const events = [...eventsWithTeamIds].sort((a, b) => a.minute - b.minute)
          setSortedEvents(events)
        }
      }
    }
  }, [tournament, matchId])

  const getTeamInfo = (teamId: string) => {
    const team = tournament?.teams.find((team) => 
      team.id === teamId || 
      team._id === teamId || 
      String(team.id) === String(teamId) || 
      String(team._id) === String(teamId)
    );
    
    if (!team) {
      return { name: "Unknown Team", logo: null };
    }
    
    return {
      name: team.name,
      logo: team.logo,
    };
  }
  
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }

  const renderEventIcon = (eventType: string) => {
    switch (eventType) {
      case "goal":
        return <Ionicons name="football" size={18} color={COLORS.green} />;
      case "yellow_card":
        return <View style={styles.yellowCard} />;
      case "red_card":
        return <View style={styles.redCard} />;
      case "substitution":
        return (
          <View style={styles.substitutionIcons}>
            <Ionicons name="arrow-down" size={14} color={COLORS.red} style={styles.subIcon} />
            <Ionicons name="arrow-up" size={14} color={COLORS.green} />
          </View>
        );
      default:
        return null;
    }
  }

  if (!match) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading match details...</Text>
      </View>
    );
  }
  
  const homeTeam = getTeamInfo(match.homeTeamId);
  const awayTeam = getTeamInfo(match.awayTeamId);

  // Group events by half-time
  const firstHalfEvents = sortedEvents.filter(event => event.minute <= 45);
  const secondHalfEvents = sortedEvents.filter(event => event.minute > 45 && event.minute <= 90);
  const extraTimeEvents = sortedEvents.filter(event => event.minute > 90);

  // Count stats
  const homeStats = {
    goals: sortedEvents.filter(e => e.type === "goal" && e.teamId === match.homeTeamId).length || 0,
    yellowCards: sortedEvents.filter(e => e.type === "yellow_card" && e.teamId === match.homeTeamId).length || 0,
    redCards: sortedEvents.filter(e => e.type === "red_card" && e.teamId === match.homeTeamId).length || 0,
    substitutions: sortedEvents.filter(e => e.type === "substitution" && e.teamId === match.homeTeamId).length || 0
  };
  
  const awayStats = {
    goals: sortedEvents.filter(e => e.type === "goal" && e.teamId === match.awayTeamId).length || 0,
    yellowCards: sortedEvents.filter(e => e.type === "yellow_card" && e.teamId === match.awayTeamId).length || 0,
    redCards: sortedEvents.filter(e => e.type === "red_card" && e.teamId === match.awayTeamId).length || 0,
    substitutions: sortedEvents.filter(e => e.type === "substitution" && e.teamId === match.awayTeamId).length || 0
  };

 return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Match Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.container}>
        {/* Match Score Card */}
        <View style={styles.scoreCard}>
          <View style={styles.matchDate}>
            <Text style={styles.dateText}>{formatDate(match.date)}</Text>
            <View style={styles.completedBadge}>
              <Text style={styles.completedText}>COMPLETED</Text>
            </View>
          </View>
          
          <View style={styles.scoreContainer}>
            <View style={styles.teamSection}>
              {homeTeam.logo ? (
                <Image source={{ uri: homeTeam.logo }} style={styles.teamLogo} />
              ) : (
                <View style={styles.teamLogoPlaceholder}>
                  <Text style={styles.teamLogoPlaceholderText}>
                    {homeTeam.name.charAt(0)}
                  </Text>
                </View>
              )}
              <Text style={styles.teamName}>{homeTeam.name}</Text>
            </View>
            
            <View style={styles.scoreSection}>
              <View style={styles.scoreBox}>
                <Text style={styles.score}>{match.homeScore}</Text>
                <Text style={styles.scoreSeparator}>-</Text>
                <Text style={styles.score}>{match.awayScore}</Text>
              </View>
            </View>
            
            <View style={styles.teamSection}>
              {awayTeam.logo ? (
                <Image source={{ uri: awayTeam.logo }} style={styles.teamLogo} />
              ) : (
                <View style={styles.teamLogoPlaceholder}>
                  <Text style={styles.teamLogoPlaceholderText}>
                    {awayTeam.name.charAt(0)}
                  </Text>
                </View>
              )}
              <Text style={styles.teamName}>{awayTeam.name}</Text>
            </View>
          </View>
          
          <View style={styles.venueContainer}>
            <Text style={styles.venue}>📍 {match.venue}</Text>
            <Text style={styles.time}>{match.time}</Text>
          </View>
        </View>
        
        {/* Tab navigation */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'events' && styles.activeTab]} 
            onPress={() => setActiveTab('events')}
          >
            <Text style={[styles.tabText, activeTab === 'events' && styles.activeTabText]}>TIMELINE</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'stats' && styles.activeTab]} 
            onPress={() => setActiveTab('stats')}
          >
            <Text style={[styles.tabText, activeTab === 'stats' && styles.activeTabText]}>STATISTICS</Text>
          </TouchableOpacity>
        </View>
        
        {/* Match Events Timeline */}
        {activeTab === 'events' && (
          <View style={styles.timelineContainer}>
            {sortedEvents.length === 0 ? (
              <View style={styles.noEventsContainer}>
                <Text style={styles.noEventsText}>No events recorded for this match</Text>
              </View>
            ) : (
              <>
                {/* First half */}
                {firstHalfEvents.length > 0 && (
                  <View style={styles.halfSection}>
                    <View style={styles.halfHeader}>
                      <Ionicons name="time-outline" size={18} color={COLORS.primary} />
                      <Text style={styles.halfTitle}>First Half</Text>
                    </View>
                    
                    {firstHalfEvents.map((event, index) => (
                      <View key={`first-${index}`} style={styles.eventRow}>
                        <View style={styles.minuteBox}>
                          <Text style={styles.minuteText}>{event.minute}'</Text>
                        </View>
                        <View style={styles.eventIconContainer}>
                          {renderEventIcon(event.type)}
                        </View>
                        <View style={styles.eventDetails}>
                          <Text style={styles.playerName}>{event.playerName}</Text>
                          <Text style={styles.eventType}>
                            {event.type.replace('_', ' ')}
                          </Text>
                        </View>
                        <View style={styles.teamIndicator}>
                          <Text style={styles.teamIndicatorText}>
                            {event.teamId === match.homeTeamId ? homeTeam.name : awayTeam.name}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
                
                {/* Half time indicator */}
                <View style={styles.halfTimeSeparator}>
                  <View style={styles.halfTimeLine} />
                  <View style={styles.halfTimeBadge}>
                    <Text style={styles.halfTimeText}>HALF TIME</Text>
                  </View>
                  <View style={styles.halfTimeLine} />
                </View>
                
                {/* Second half */}
                {secondHalfEvents.length > 0 && (
                  <View style={styles.halfSection}>
                    <View style={styles.halfHeader}>
                      <Ionicons name="time-outline" size={18} color={COLORS.primary} />
                      <Text style={styles.halfTitle}>Second Half</Text>
                    </View>
                    
                    {secondHalfEvents.map((event, index) => (
                      <View key={`second-${index}`} style={styles.eventRow}>
                        <View style={styles.minuteBox}>
                          <Text style={styles.minuteText}>{event.minute}'</Text>
                        </View>
                        <View style={styles.eventIconContainer}>
                          {renderEventIcon(event.type)}
                        </View>
                        <View style={styles.eventDetails}>
                          <Text style={styles.playerName}>{event.playerName}</Text>
                          <Text style={styles.eventType}>
                            {event.type.replace('_', ' ')}
                          </Text>
                        </View>
                        <View style={styles.teamIndicator}>
                          <Text style={styles.teamIndicatorText}>
                            {event.teamId === match.homeTeamId ? homeTeam.name : awayTeam.name}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
                
                {/* Extra time */}
                {extraTimeEvents.length > 0 && (
                  <>
                    <View style={styles.extraTimeSeparator}>
                      <View style={styles.halfTimeLine} />
                      <View style={styles.extraTimeBadge}>
                        <Text style={styles.extraTimeText}>EXTRA TIME</Text>
                      </View>
                      <View style={styles.halfTimeLine} />
                    </View>
                  
                    <View style={styles.halfSection}>
                      <View style={styles.halfHeader}>
                        <Ionicons name="time-outline" size={18} color={COLORS.primary} />
                        <Text style={styles.halfTitle}>Extra Time</Text>
                      </View>
                      
                      {extraTimeEvents.map((event, index) => (
                        <View key={`extra-${index}`} style={styles.eventRow}>
                          <View style={styles.minuteBox}>
                            <Text style={styles.minuteText}>{event.minute}'</Text>
                          </View>
                          <View style={styles.eventIconContainer}>
                            {renderEventIcon(event.type)}
                          </View>
                          <View style={styles.eventDetails}>
                            <Text style={styles.playerName}>{event.playerName}</Text>
                            <Text style={styles.eventType}>
                              {event.type.replace('_', ' ')}
                            </Text>
                          </View>
                          <View style={styles.teamIndicator}>
                            <Text style={styles.teamIndicatorText}>
                              {event.teamId === match.homeTeamId ? homeTeam.name : awayTeam.name}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </>
                )}
              </>
            )}
          </View>
        )}
        
        {/* Match Statistics */}
        {activeTab === 'stats' && (
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <View style={styles.statHeader}>
                <Text style={styles.statTitle}>Match Statistics</Text>
              </View>
              
              {/* Goals */}
              <View style={styles.statRow}>
                <View style={styles.teamStatValue}>
                  <Text style={styles.statValueText}>{match.homeScore}</Text>
                </View>
                <View style={styles.statType}>
                  <Text style={styles.statTypeText}>Goals</Text>
                </View>
                <View style={styles.teamStatValue}>
                  <Text style={styles.statValueText}>{match.awayScore}</Text>
                </View>
              </View>
              
              {/* Yellow Cards */}
              <View style={styles.statRow}>
                <View style={styles.teamStatValue}>
                  <Text style={styles.statValueText}>{homeStats.yellowCards}</Text>
                </View>
                <View style={styles.statType}>
                  <View style={styles.cardIndicator}>
                    <View style={styles.yellowCardIndicator} />
                    <Text style={styles.statTypeText}>Yellow Cards</Text>
                  </View>
                </View>
                <View style={styles.teamStatValue}>
                  <Text style={styles.statValueText}>{awayStats.yellowCards}</Text>
                </View>
              </View>
              
              {/* Red Cards */}
              <View style={styles.statRow}>
                <View style={styles.teamStatValue}>
                  <Text style={styles.statValueText}>{homeStats.redCards}</Text>
                </View>
                <View style={styles.statType}>
                  <View style={styles.cardIndicator}>
                    <View style={styles.redCardIndicator} />
                    <Text style={styles.statTypeText}>Red Cards</Text>
                  </View>
                </View>
                <View style={styles.teamStatValue}>
                  <Text style={styles.statValueText}>{awayStats.redCards}</Text>
                </View>
              </View>
              
              {/* Substitutions */}
              <View style={styles.statRow}>
                <View style={styles.teamStatValue}>
                  <Text style={styles.statValueText}>{homeStats.substitutions}</Text>
                </View>
                <View style={styles.statType}>
                  <View style={styles.subIndicator}>
                    <Ionicons name="swap-horizontal" size={16} color={COLORS.primary} />
                    <Text style={styles.statTypeText}>Substitutions</Text>
                  </View>
                </View>
                <View style={styles.teamStatValue}>
                  <Text style={styles.statValueText}>{awayStats.substitutions}</Text>
                </View>
              </View>
              
              {/* Team Names */}
              <View style={styles.teamNameRow}>
                <Text style={styles.statTeamName}>{homeTeam.name}</Text>
                <View style={{width: 100}} />
                <Text style={styles.statTeamName}>{awayTeam.name}</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.black,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.black,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: COLORS.background,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "bold",
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.black,
  },
  loadingText: {
    color: COLORS.white,
    fontSize: 16,
  },
  
  // Score card styles
  scoreCard: {
    backgroundColor: COLORS.background,
    borderRadius: 15,
    margin: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  matchDate: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  dateText: {
    color: COLORS.gray,
    fontSize: 14,
  },
  completedBadge: {
    backgroundColor: COLORS.green,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  completedText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "bold",
  },
  scoreContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  teamSection: {
    flex: 1,
    alignItems: "center",
  },
  teamLogo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
  },
  teamLogoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  teamLogoPlaceholderText: {
    color: COLORS.black,
    fontSize: 24,
    fontWeight: 'bold',
  },
  teamName: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  scoreSection: {
    marginHorizontal: 16,
  },
  scoreBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
  },
  score: {
    color: COLORS.black,
    fontSize: 28,
    fontWeight: "bold",
  },
  scoreSeparator: {
    color: COLORS.black,
    fontSize: 24,
    marginHorizontal: 10,
  },
  venueContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  venue: {
    color: COLORS.gray,
    fontSize: 14,
  },
  time: {
    color: COLORS.gray,
    fontSize: 14,
  },
  
  // Tab navigation styles
  tabsContainer: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: COLORS.background,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    color: COLORS.gray,
    fontSize: 14,
    fontWeight: "bold",
  },
  activeTabText: {
    color: COLORS.black,
  },
  
  // Timeline styles
  timelineContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 15,
    margin: 16,
    padding: 16,
  },
  halfSection: {
    marginBottom: 16,
  },
  halfHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  halfTitle: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  minuteBox: {
    width: 40,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.black,
    alignItems: "center",
    justifyContent: "center",
  },
  minuteText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "bold",
  },
  eventIconContainer: {
    width: 30,
    alignItems: "center",
    marginHorizontal: 8,
  },
  yellowCard: {
    width: 12,
    height: 16,
    backgroundColor: "#FFD700", // Yellow card color
    borderRadius: 2,
  },
  redCard: {
    width: 12,
    height: 16,
    backgroundColor: COLORS.red,
    borderRadius: 2,
  },
  substitutionIcons: {
    flexDirection: "row",
    alignItems: "center",
  },
  subIcon: {
    marginRight: -2,
  },
  eventDetails: {
    flex: 1,
  },
  playerName: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "bold",
  },
  eventType: {
    color: COLORS.gray,
    fontSize: 12,
  },
  teamIndicator: {
    maxWidth: 100,
  },
  teamIndicatorText: {
    color: COLORS.gray,
    fontSize: 12,
    textAlign: "right",
  },
  halfTimeSeparator: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
  },
  halfTimeLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  halfTimeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 15,
    marginHorizontal: 8,
  },
  halfTimeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "bold",
  },
  extraTimeSeparator: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
  },
  extraTimeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#9C27B0", // Purple color for extra time
    borderRadius: 15,
    marginHorizontal: 8,
  },
  extraTimeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "bold",
  },
  noEventsContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  noEventsText: {
    color: COLORS.gray,
    fontSize: 16,
  },
  
  // Stats styles
  statsContainer: {
    margin: 16,
  },
  statCard: {
    backgroundColor: COLORS.background,
    borderRadius: 15,
    padding: 16,
  },
  statHeader: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
    paddingBottom: 12,
    marginBottom: 16,
  },
  statTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  teamStatValue: {
    width: 60,
    alignItems: "center",
  },
  statValueText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "bold",
  },
  statType: {
    flex: 1,
    alignItems: "center",
  },
  statTypeText: {
    color: COLORS.gray,
    fontSize: 14,
  },
  cardIndicator: {
    flexDirection: "row",
    alignItems: "center",
  },
  yellowCardIndicator: {
    width: 10,
    height: 14,
    backgroundColor: "#FFD700",
    marginRight: 8,
    borderRadius: 1,
  },
  redCardIndicator: {
    width: 10,
    height: 14,
    backgroundColor: COLORS.red,
    marginRight: 8,
    borderRadius: 1,
  },
  subIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  teamNameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  statTeamName: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "bold",
  },
})

export default MatchDetailScreen
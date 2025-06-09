"use client"

import type React from "react"
import { useState, useCallback, useMemo } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, Image, ImageBackground, Dimensions } from "react-native"
import { useTournament } from "../contexts/TournamentContext"
import { useAuth } from "../contexts/AuthContext"
import { useNavigation } from "@react-navigation/native"
import { COLORS } from "../constants/colors"
import type { Match } from "../types"
import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"

const { width } = Dimensions.get('window')

const MatchesScreen: React.FC = () => {
  const { tournament } = useTournament()
  const { user } = useAuth()
  const navigation = useNavigation()
  const [selectedWeek, setSelectedWeek] = useState(1)

  const weeks = [1, 2, 3, 4]

  // Group and prioritize live matches
  const getMatchesData = useCallback((week: number) => {
    const matches = tournament?.matches.filter((match) => match.week === week) || [];
    
    // Extract all live matches to show at the top
    const liveMatches = matches.filter(match => match.status === "live");
    
    // Remaining matches grouped by date
    const remainingMatches = matches.filter(match => match.status !== "live");
    const groupedMatches: { [date: string]: Match[] } = {};
    
    remainingMatches.forEach(match => {
      const dateKey = formatDate(match.date);
      if (!groupedMatches[dateKey]) {
        groupedMatches[dateKey] = [];
      }
      groupedMatches[dateKey].push(match);
    });
    
    const result = [];
    
    // Add live matches section if any exist
    if (liveMatches.length > 0) {
      result.push({
        date: "LIVE NOW",
        isLiveSection: true,
        matches: liveMatches
      });
    }
    
    // Add regular date sections
    Object.entries(groupedMatches).forEach(([date, matches]) => {
      result.push({
        date,
        isLiveSection: false,
        matches
      });
    });
    
    return result;
  }, [tournament]);

  const getTeamInfo = (teamId: string) => {
    const team = tournament?.teams.find((team) => 
      team.id === teamId || 
      team._id === teamId || 
      String(team.id) === String(teamId) || 
      String(team._id) === String(teamId)
    );
    
    if (!team) {
      return { 
        name: "Unknown Team", 
        logo: null, 
        primaryColor: COLORS.gray, 
        secondaryColor: COLORS.background 
      };
    }
    
    return {
      name: team.name,
      logo: team.logo,
      primaryColor: team.primaryColor || COLORS.primary,
      secondaryColor: team.secondaryColor || COLORS.background,
    };
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "live":
        return ['#FF3B30', '#FF6B6B']
      case "completed":
        return ['#34C759', '#4ECDC4']
      default:
        return ['#007AFF', '#5AC8FA']
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "live":
        return "LIVE"
      case "completed":
        return "FINISHED"
      default:
        return "UPCOMING"
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      day: "numeric",
      month: "short"
    });
  }

  const formatTime = (timeString: string) => {
    if (!timeString) return "";
    return timeString.replace(/:\d{2}$/, ''); // Remove seconds if present
  }

  const renderMatch = ({ item: match }: { item: Match }) => {
    const homeTeam = getTeamInfo(match.homeTeamId);
    const awayTeam = getTeamInfo(match.awayTeamId);
    const stadiumImage = match.stadiumImage || require("../../assets/ground.jpg");
    const statusColors = getStatusColor(match.status);
    
    return (
      <TouchableOpacity 
        style={styles.matchCard}
        onPress={() => {
          if (match.status === "completed") {
            // @ts-ignore
            navigation.navigate("MatchDetail", { matchId: match.id || match._id })
          } else if (match.status === "live") {
            // @ts-ignore
            navigation.navigate("LiveMatch", { matchId: match.id || match._id })
          }
        }}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.8)']}
          style={styles.cardGradient}
        >
          <ImageBackground 
            source={typeof stadiumImage === 'string' ? { uri: stadiumImage } : stadiumImage}
            style={styles.stadiumBackground}
            imageStyle={styles.stadiumImage}
          >
            <View style={styles.overlay}>
              {/* Header with venue and status */}
              <View style={styles.matchHeader}>
                <View style={styles.venueInfo}>
                  <Text style={styles.venueName} numberOfLines={1}>{match.venue}</Text>
                </View>
                
                <LinearGradient
                  colors={statusColors}
                  style={styles.statusBadge}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {match.status === "live" && (
                    <View style={styles.livePulse} />
                  )}
                  
                  
                  <Text style={styles.statusText}>{getStatusText(match.status)}</Text>
                </LinearGradient>
              </View>
              {match.status === "live" && (
                <View style={styles.liveActionContainer}>
                  <LinearGradient
                    colors={['#FF3B30', '#FF6B6B']}
                    style={styles.watchLiveButton}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <View style={styles.liveIndicator} />
                    <Text style={styles.watchLiveText}>WATCH LIVE</Text>
                    <Ionicons name="play-circle" size={18} color={COLORS.white} />
                  </LinearGradient>
                </View>
              )}

              {/* Main match content */}
              <View style={styles.matchContent}>
                
                {/* Home Team */}
                <View style={styles.teamContainer}>
                  <View style={styles.teamCard}>
                    <View style={styles.teamLogoContainer}>
                      {homeTeam.logo ? (
                        <Image source={{ uri: homeTeam.logo }} style={styles.teamLogo} />
                      ) : (
                        <LinearGradient
                          colors={[homeTeam.primaryColor, homeTeam.secondaryColor]}
                          style={styles.teamLogoPlaceholder}
                        >
                          <Text style={styles.teamLogoPlaceholderText}>
                            {homeTeam.name.charAt(0)}
                          </Text>
                        </LinearGradient>
                      )}
                    </View>
                    <Text style={styles.teamName} numberOfLines={2}>{homeTeam.name}</Text>
                  </View>
                </View>

                {/* Score/Time Section */}
                <View style={styles.centerSection}>
                  {match.status === "completed" || match.status === "live" ? (
                    <View style={styles.scoreCard}>
                      <Text style={styles.score}>{match.homeScore || 0}</Text>
                      <View style={styles.scoreDivider} />
                      <Text style={styles.score}>{match.awayScore || 0}</Text>
                      {match.status === "live" && (
                        <Text style={styles.liveMinute}></Text>
                      )}
                    </View>
                  ) : (
                    <View style={styles.timeCard}>
                      <Text style={styles.matchTime}>{formatTime(match.time)}</Text>
                      {match.broadcaster && (
                        <View style={styles.broadcasterContainer}>
                          <Image 
                            source={{ uri: match.broadcaster.logo }} 
                            style={styles.broadcasterLogo} 
                            resizeMode="contain"
                          />
                        </View>
                      )}
                    </View>
                  )}
                </View>

                {/* Away Team */}
                <View style={styles.teamContainer}>
                  <View style={styles.teamCard}>
                    <View style={styles.teamLogoContainer}>
                      {awayTeam.logo ? (
                        <Image source={{ uri: awayTeam.logo }} style={styles.teamLogo} />
                      ) : (
                        <LinearGradient
                          colors={[awayTeam.primaryColor, awayTeam.secondaryColor]}
                          style={styles.teamLogoPlaceholder}
                        >
                          <Text style={styles.teamLogoPlaceholderText}>
                            {awayTeam.name.charAt(0)}
                          </Text>
                        </LinearGradient>
                      )}
                    </View>
                    <Text style={styles.teamName} numberOfLines={2}>{awayTeam.name}</Text>
                  </View>
                </View>
              </View>

              {/* Footer actions */}
              

              {match.status === "upcoming" && (
                <View style={styles.upcomingActions}>
                  <TouchableOpacity style={styles.reminderButton}>
                    <Ionicons name="notifications-outline" size={16} color={COLORS.primary} />
                    <Text style={styles.reminderText}>Set Reminder</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ImageBackground>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  // New component to render a group of matches for a single date
  const renderMatchGroup = ({ item }: { item: { date: string, matches: Match[], isLiveSection?: boolean }}) => (
    <View style={styles.matchDateGroup}>
      <View style={styles.dateHeader}>
        <View style={styles.dateLineDivider} />
        <View style={styles.dateContainer}>
          {item.isLiveSection ? (
            <LinearGradient
              colors={['#FF3B30', '#FF6B6B']}
              style={styles.liveSectionBadge}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={styles.livePulse} />
              <Text style={styles.liveSectionText}>{item.date}</Text>
            </LinearGradient>
          ) : (
            <>
              <Ionicons name="calendar" size={16} color={COLORS.primary} />
              <Text style={styles.dateText}>{item.date}</Text>
            </>
          )}
        </View>
        <View style={styles.dateLineDivider} />
      </View>
      
      {item.matches.map(match => (
        <View key={match.id || match._id || String(Math.random())}>
          {renderMatch({ item: match })}
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Enhanced Header */}
      <LinearGradient
        colors={[COLORS.background, 'rgba(0,0,0,0.9)']}
        style={styles.header}
      >
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Matches</Text>
          <Text style={styles.subtitle}>Tournament Schedule</Text>
        </View>
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.weekSelector}
          contentContainerStyle={styles.weekSelectorContent}
        >
          {weeks.map((week) => (
            <TouchableOpacity
              key={week}
              style={[styles.weekButton, selectedWeek === week && styles.selectedWeekButton]}
              onPress={() => setSelectedWeek(week)}
              activeOpacity={0.8}
            >
              {selectedWeek === week ? (
                <LinearGradient
                  colors={[COLORS.primary, '#FFD700']}
                  style={styles.weekButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.selectedWeekButtonText}>Week {week}</Text>
                </LinearGradient>
              ) : (
                <Text style={styles.weekButtonText}>Week {week}</Text>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </LinearGradient>

      <FlatList
        data={getMatchesData(selectedWeek)}
        renderItem={renderMatchGroup}
        keyExtractor={(item) => item.date}
        contentContainerStyle={styles.matchesList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <LinearGradient
              colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
              style={styles.emptyStateCard}
            >
              <Ionicons name="calendar-outline" size={60} color={COLORS.primary} />
              <Text style={styles.emptyTitle}>No Matches Scheduled</Text>
              <Text style={styles.emptyText}>Check back later for Week {selectedWeek} fixtures</Text>
            </LinearGradient>
          </View>
        }
      />

      {selectedWeek === 4 && (
        <LinearGradient
          colors={['rgba(255,215,0,0.1)', 'rgba(255,215,0,0.05)']}
          style={styles.playoffInfo}
        >
          <View style={styles.playoffHeader}>
            <Text style={styles.playoffTitle}>🏆 Playoff Stage</Text>
            <Ionicons name="trophy" size={24} color="#FFD700" />
          </View>
          <Text style={styles.playoffText}>
            Semi-finals and Final matches will be scheduled based on league standings
          </Text>
        </LinearGradient>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.black,
  },
  header: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  titleContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: COLORS.white,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: "500",
    marginTop: 4,
  },
  weekSelector: {
    flexDirection: "row",
  },
  weekSelectorContent: {
    paddingRight: 20,
  },
  weekButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginRight: 12,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  selectedWeekButton: {
    backgroundColor: 'transparent',
    borderColor: COLORS.primary,
  },
  weekButtonGradient: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginHorizontal: -20,
    marginVertical: -12,
  },
  weekButtonText: {
    color: 'rgba(255,255,255,0.8)',
    fontWeight: "600",
    fontSize: 14,
  },
  selectedWeekButtonText: {
    color: COLORS.black,
    fontWeight: "700",
    fontSize: 14,
  },
  matchesList: {
    padding: 20,
    paddingBottom: 100,
  },
  matchDateGroup: {
    marginBottom: 24,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  dateText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  dateLineDivider: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  liveSectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  liveSectionText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  livePulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.white,
    marginRight: 8,
    opacity: 0.9,
  },
  matchCard: {
    height: 220, 
    borderRadius: 20,
    marginBottom: 16,
    paddingBottom:10,
    
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  cardGradient: {
    flex: 1,
  },
  stadiumBackground: {
    width: '100%',
    height: '100%',
  },
  stadiumImage: {
    borderRadius: 20,
  },
  overlay: {
    flex: 1,
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'space-between',
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  venueInfo: {
    flex: 1,
  },
  venueName: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  statusText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  matchContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  teamContainer: {
    flex: 1,
    alignItems: 'center',
  },
  teamCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 15,
    paddingHorizontal: 12,
    borderRadius: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingBottom: 10,
  },
  teamLogoContainer: {
    marginBottom: 8,
  },
  teamLogo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  teamLogoPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  teamLogoPlaceholderText: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: "800",
  },
  teamName: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 18,
  },
  centerSection: {
    alignItems: "center",
    justifyContent: 'center',
    flex: 0.8,
  },
  scoreCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  score: {
    color: COLORS.black,
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 32,
  },
  scoreDivider: {
    width: 10,
    height: 2,
    marginHorizontal: 12,
    backgroundColor: COLORS.gray,
    marginVertical: 8,
    borderRadius: 1,
  },
  liveMinute: {
    color: '#FF3B30',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  timeCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: 'center',
    minWidth: 120,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  matchTime: {
    color: COLORS.black,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 4,
  },
  broadcasterContainer: {
    marginTop: 6,
  },
  broadcasterLogo: {
    height: 14,
    width: 50,
  },
  liveActionContainer: {
    alignItems: 'center',
    marginTop: 5,
    
  },
  watchLiveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,

  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.white,
    marginRight: 8,
  },
  watchLiveText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 14,
    marginRight: 8,
    letterSpacing: 0.5,
  },
  upcomingActions: {
    alignItems: 'center',
    marginTop: 5,
  },
  reminderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  reminderText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 12,
    marginLeft: 6,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    marginTop: 60,
  },
  emptyStateCard: {
    alignItems: 'center',
    padding: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  emptyTitle: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    color: COLORS.gray,
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
  },
  playoffInfo: {
    margin: 20,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
  },
  playoffHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  playoffTitle: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: "800",
    marginRight: 8,
  },
  playoffText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    fontWeight: '500',
  },
})

export default MatchesScreen;
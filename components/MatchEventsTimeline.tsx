import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../src/constants/colors';
import type { MatchEvent } from '../src/types';

interface MatchEventsTimelineProps {
  matchEvents: MatchEvent[];
  homeTeamId: string;
  awayTeamId: string;
  teams?: any[];
}

const MatchEventsTimeline: React.FC<MatchEventsTimelineProps> = ({
  matchEvents,
  homeTeamId,
  awayTeamId,
  teams,
}) => {
  console.log('=== MatchEventsTimeline DEBUG ===');
  console.log('matchEvents received:', matchEvents);
  console.log('homeTeamId:', homeTeamId);
  console.log('awayTeamId:', awayTeamId);

  // EXACT SAME LOGIC AS YOUR LIVE SCREEN
  const isEventFromHomeTeam = (event: any) => {
    const eventTeamId = String(event.team || event.teamId || "");
    const normalizedHomeTeamId = String(homeTeamId || "");
    
    console.log('Event team check:', {
      eventTeamId,
      normalizedHomeTeamId,
      playerName: event.playerName,
      eventType: event.type
    });
    
    if (eventTeamId === normalizedHomeTeamId) return true;
    
    // Fallback: check via player team lookup - EXACT SAME AS LIVE SCREEN
    if (event.playerId && teams) {
      const playerTeam = teams.find(team => 
        team.players?.some(player => 
          String(player.id) === String(event.playerId) || 
          String(player._id) === String(event.playerId)
        )
      );
      
      if (playerTeam) {
        const playerTeamId = String(playerTeam.id || playerTeam._id);
        return playerTeamId === normalizedHomeTeamId;
      }
    }
    
    return false;
  };

  // EXACT SAME ICON LOGIC AS YOUR LIVE SCREEN
  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "goal":
        return (
          <View style={styles.eventIconContainer}>
            <Ionicons name="football" size={16} color={COLORS.green} />
          </View>
        );
      case "yellow_card":
        return (
          <View style={styles.eventIconContainer}>
            <View style={styles.eventCard} />
          </View>
        );
      case "red_card":
        return (
          <View style={styles.eventIconContainer}>
            <View style={[styles.eventCard, { backgroundColor: COLORS.red }]} />
          </View>
        );
      case "substitution":
        return (
          <View style={styles.eventIconContainer}>
            <Ionicons name="swap-horizontal" size={16} color={COLORS.green} />
          </View>
        );
      default:
        return (
          <View style={styles.eventIconContainer}>
            <Ionicons name="ellipse" size={16} color={COLORS.gray} />
          </View>
        );
    }
  };

  // EXACT SAME DIVIDER LOGIC AS YOUR LIVE SCREEN
  const getEventsWithDividers = () => {
    if (!matchEvents || matchEvents.length === 0) return [];
    
    // Sort events by minute in descending order (most recent first)
    const sortedEvents = [...matchEvents].sort((a, b) => b.minute - a.minute);
    const eventsWithDividers = [];
    
    let hasAddedSecondHalf = false;
    let hasAddedFirstHalf = false;
    let hasAddedExtraTime = false;
    
    // Go through events from latest to earliest
    for (let i = 0; i < sortedEvents.length; i++) {
      const event = sortedEvents[i];
      
      // Add extra time divider for events > 90 minutes
      if (!hasAddedExtraTime && event.minute > 90) {
        eventsWithDividers.push({
          type: 'divider',
          id: 'extra-time',
          title: 'Extra Time',
          icon: 'time-outline'
        });
        hasAddedExtraTime = true;
      }
      
      // Add second half divider for events between 46-90 minutes
      if (!hasAddedSecondHalf && event.minute > 45 && event.minute <= 90) {
        eventsWithDividers.push({
          type: 'divider',
          id: 'second-half',
          title: 'Second Half',
          icon: 'time-outline'
        });
        hasAddedSecondHalf = true;
      }
      
      // Add the actual event
      eventsWithDividers.push(event);
      
      // Add first half divider before events 1-45 minutes (only if there are second half events)
      if (!hasAddedFirstHalf && hasAddedSecondHalf && event.minute <= 45) {
        eventsWithDividers.push({
          type: 'divider',
          id: 'first-half',
          title: 'First Half',
          icon: 'time-outline'
        });
        hasAddedFirstHalf = true;
      }
    }
    
    // If we only have first half events and no divider was added, add it at the end
    if (!hasAddedFirstHalf && !hasAddedSecondHalf && sortedEvents.length > 0) {
      eventsWithDividers.push({
        type: 'divider',
        id: 'first-half',
        title: 'First Half',
        icon: 'time-outline'
      });
    }
    
    return eventsWithDividers;
  };

  const processedEvents = getEventsWithDividers();
  console.log('Processed events with dividers:', processedEvents);

  return (
    <View style={styles.eventsSection}>
      <View style={styles.eventsSectionHeader}>
        <Text style={styles.eventsTitle}>Match Events</Text>
        <View style={styles.eventCount}>
          <Text style={styles.eventCountText}>
            {matchEvents ? matchEvents.length : 0}
          </Text>
        </View>
      </View>

      {!matchEvents || matchEvents.length === 0 ? (
        <Text style={styles.noEventsText}>No events yet</Text>
      ) : (
        <View style={styles.eventsTimeline}>
          {processedEvents.map((item, index) => {
            if (item.type === 'divider') {
              return (
                <View key={item.id} style={styles.timeDivider}>
                  <View style={styles.timeDividerLine} />
                  <View style={styles.timeDividerContent}>
                    <Ionicons 
                      name={item.icon as any} 
                      size={16} 
                      color={COLORS.primary} 
                      style={styles.timeDividerIcon}
                    />
                    <Text style={styles.timeDividerText}>{item.title}</Text>
                  </View>
                  <View style={styles.timeDividerLine} />
                </View>
              );
            }

            // Regular event
            const event = item;
            const isHomeTeamEvent = isEventFromHomeTeam(event);
            
            console.log(`Rendering event: ${event.playerName} at ${event.minute}' - isHomeTeam: ${isHomeTeamEvent}`);
            
            return (
              <View key={`${event.id || event.playerName}-${index}`} style={styles.eventRow}>
                {/* Left side - Home team events */}
                <View style={styles.eventSide}>
                  {isHomeTeamEvent && (
                    <View style={styles.eventContent}>
                      <View style={styles.eventPlayerInfo}>
                        <Text style={styles.eventPlayerName}>
                          {event.playerName}
                        </Text>
                        <Text style={styles.eventDescription}>
                          {event.type === 'goal' ? 'Goal' :
                           event.type === 'yellow_card' ? 'Yellow card' :
                           event.type === 'red_card' ? 'Red card' :
                           event.type === 'substitution' ? 'Substitution' :
                           event.description}
                        </Text>
                      </View>
                      {getEventIcon(event.type)}
                    </View>
                  )}
                </View>

                {/* Center - Time */}
                <View style={styles.eventTimeCenter}>
                  <Text style={styles.eventTime}>{event.minute}'</Text>
                </View>

                {/* Right side - Away team events */}
                <View style={styles.eventSide}>
                  {!isHomeTeamEvent && (
                    <View style={[styles.eventContent, styles.eventContentRight]}>
                      {getEventIcon(event.type)}
                      <View style={styles.eventPlayerInfo}>
                        <Text style={[styles.eventPlayerName, styles.eventPlayerNameRight]}>
                          {event.playerName}
                        </Text>
                        <Text style={[styles.eventDescription, styles.eventDescriptionRight]}>
                          {event.type === 'goal' ? 'Goal' :
                           event.type === 'yellow_card' ? 'Yellow card' :
                           event.type === 'red_card' ? 'Red card' :
                           event.type === 'substitution' ? 'Substitution' :
                           event.description}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

// EXACT SAME STYLES AS YOUR LIVE SCREEN
const styles = StyleSheet.create({
  eventsSection: {
    margin: 20,
    padding: 20,
    backgroundColor: COLORS.background,
    borderRadius: 15,
  },
  eventsSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  eventsTitle: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: "bold",
  },
  eventCount: {
    backgroundColor: COLORS.primary,
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  eventCountText: {
    color: COLORS.black,
    fontWeight: "bold",
  },
  noEventsText: {
    color: COLORS.gray,
    fontSize: 14,
    textAlign: "center",
    fontStyle: "italic",
    padding: 20,
  },
  // EXACT SAME EVENT STYLES AS YOUR LIVE SCREEN
  eventsTimeline: {
    paddingVertical: 10,
  },
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
    minHeight: 50,
  },
  eventSide: {
    flex: 1,
    paddingHorizontal: 10,
  },
  eventContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  eventContentRight: {
    justifyContent: "flex-start",
  },
  eventPlayerInfo: {
    marginHorizontal: 12,
  },
  eventPlayerName: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "right",
  },
  eventPlayerNameRight: {
    textAlign: "left",
  },
  eventDescription: {
    color: COLORS.gray,
    fontSize: 12,
    marginTop: 2,
    textAlign: "right",
  },
  eventDescriptionRight: {
    textAlign: "left",
  },
  eventIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  eventCard: {
    width: 14,
    height: 18,
    backgroundColor: "#FFD700",
    borderRadius: 2,
  },
  eventTimeCenter: {
    width: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  eventTime: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  // EXACT SAME TIME DIVIDER STYLES AS YOUR LIVE SCREEN
  timeDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
    paddingVertical: 12,
  },
  timeDividerLine: {
    flex: 1,
    height: 2,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  timeDividerContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    paddingVertical: 8,
    elevation: 2,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  timeDividerIcon: {
    marginRight: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: 4,
  },
  timeDividerText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
});

export default MatchEventsTimeline;
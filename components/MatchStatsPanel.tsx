import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS } from '../src/constants/colors'
import type { MatchStats, MatchStatsUpdate } from '../src/types/matchStats'

interface MatchStatsPanelProps {
  stats: MatchStats
  onUpdateStat: (update: MatchStatsUpdate) => boolean
  isLocked: boolean
  isManagement: boolean
}

const MatchStatsPanel: React.FC<MatchStatsPanelProps> = ({
  stats,
  onUpdateStat,
  isLocked,
  isManagement
}) => {
  const [showStatsModal, setShowStatsModal] = useState(false)
  const [selectedStat, setSelectedStat] = useState<{
    type: keyof MatchStats
    team: 'home' | 'away'
    label: string
  } | null>(null)
  const [inputValue, setInputValue] = useState('')

  const openStatModal = (statType: keyof MatchStats, team: 'home' | 'away', label: string) => {
    if (!isManagement || isLocked) return
    
    setSelectedStat({ type: statType, team, label })
    const currentValue = (stats[statType] as any)[team]
    setInputValue(currentValue.toString())
    setShowStatsModal(true)
  }

  const handleStatUpdate = () => {
    if (!selectedStat) return

    const value = parseFloat(inputValue)
    if (isNaN(value) || value < 0) {
      Alert.alert('Invalid Input', 'Please enter a valid number')
      return
    }

    const success = onUpdateStat({
      statType: selectedStat.type,
      team: selectedStat.team,
      value,
      increment: false
    })

    if (success) {
      setShowStatsModal(false)
      setSelectedStat(null)
      setInputValue('')
    }
  }

  const quickUpdate = (statType: keyof MatchStats, team: 'home' | 'away', increment: number) => {
    if (!isManagement || isLocked) return

    onUpdateStat({
      statType,
      team,
      value: increment,
      increment: true
    })
  }

  const StatRow = ({ 
    label, 
    homeValue, 
    awayValue, 
    statType, 
    showQuickButtons = false 
  }: {
    label: string
    homeValue: number
    awayValue: number
    statType: keyof MatchStats
    showQuickButtons?: boolean
  }) => (
    <View style={styles.statRow}>
      <View style={styles.statHome}>
        {showQuickButtons && isManagement && !isLocked && (
          <TouchableOpacity 
            style={styles.quickButton}
            onPress={() => quickUpdate(statType, 'home', 1)}
          >
            <Text style={styles.quickButtonText}>+</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity 
          style={styles.statValue}
          onPress={() => openStatModal(statType, 'home', `Home ${label}`)}
          disabled={!isManagement || isLocked}
        >
          <Text style={[
            styles.statText,
            !isManagement || isLocked ? styles.disabledText : styles.editableText
          ]}>
            {typeof homeValue === 'number' ? homeValue.toFixed(statType === 'possession' || statType === 'passAccuracy' ? 1 : 0) : homeValue}
            {(statType === 'possession' || statType === 'passAccuracy') && '%'}
          </Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.statLabel}>
        <Text style={styles.statLabelText}>{label}</Text>
      </View>
      
      <View style={styles.statAway}>
        <TouchableOpacity 
          style={styles.statValue}
          onPress={() => openStatModal(statType, 'away', `Away ${label}`)}
          disabled={!isManagement || isLocked}
        >
          <Text style={[
            styles.statText,
            !isManagement || isLocked ? styles.disabledText : styles.editableText
          ]}>
            {typeof awayValue === 'number' ? awayValue.toFixed(statType === 'possession' || statType === 'passAccuracy' ? 1 : 0) : awayValue}
            {(statType === 'possession' || statType === 'passAccuracy') && '%'}
          </Text>
        </TouchableOpacity>
        {showQuickButtons && isManagement && !isLocked && (
          <TouchableOpacity 
            style={styles.quickButton}
            onPress={() => quickUpdate(statType, 'away', 1)}
          >
            <Text style={styles.quickButtonText}>+</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Match Statistics</Text>
        {isLocked && (
          <View style={styles.lockIndicator}>
            <Ionicons name="lock-closed" size={16} color={COLORS.red} />
            <Text style={styles.lockText}>Locked</Text>
          </View>
        )}
      </View>

      <ScrollView style={styles.statsContainer} showsVerticalScrollIndicator={false}>
        {/* Score */}
        <StatRow 
          label="Goals" 
          homeValue={stats.homeScore} 
          awayValue={stats.awayScore}
          statType="homeScore"
          showQuickButtons={true}
        />

        {/* Possession */}
        <StatRow 
          label="Possession" 
          homeValue={stats.possession.home} 
          awayValue={stats.possession.away}
          statType="possession"
        />

        {/* Shots */}
        <StatRow 
          label="Shots" 
          homeValue={stats.shots.home} 
          awayValue={stats.shots.away}
          statType="shots"
          showQuickButtons={true}
        />

        {/* Shots on Target */}
        <StatRow 
          label="Shots on Target" 
          homeValue={stats.shotsOnTarget.home} 
          awayValue={stats.shotsOnTarget.away}
          statType="shotsOnTarget"
          showQuickButtons={true}
        />

        {/* Corners */}
        <StatRow 
          label="Corners" 
          homeValue={stats.corners.home} 
          awayValue={stats.corners.away}
          statType="corners"
          showQuickButtons={true}
        />

        {/* Fouls */}
        <StatRow 
          label="Fouls" 
          homeValue={stats.fouls.home} 
          awayValue={stats.fouls.away}
          statType="fouls"
          showQuickButtons={true}
        />

        {/* Cards */}
        <StatRow 
          label="Yellow Cards" 
          homeValue={stats.yellowCards.home} 
          awayValue={stats.yellowCards.away}
          statType="yellowCards"
          showQuickButtons={true}
        />

        <StatRow 
          label="Red Cards" 
          homeValue={stats.redCards.home} 
          awayValue={stats.redCards.away}
          statType="redCards"
          showQuickButtons={true}
        />

        {/* Pass Accuracy */}
        <StatRow 
          label="Pass Accuracy" 
          homeValue={stats.passAccuracy.home} 
          awayValue={stats.passAccuracy.away}
          statType="passAccuracy"
        />

        {/* Offsides */}
        <StatRow 
          label="Offsides" 
          homeValue={stats.offsides.home} 
          awayValue={stats.offsides.away}
          statType="offsides"
          showQuickButtons={true}
        />

        {/* Saves */}
        <StatRow 
          label="Saves" 
          homeValue={stats.saves.home} 
          awayValue={stats.saves.away}
          statType="saves"
          showQuickButtons={true}
        />
      </ScrollView>

      {/* Update Modal */}
      <Modal
        visible={showStatsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStatsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Update {selectedStat?.label}
            </Text>
            
            <TextInput
              style={styles.input}
              value={inputValue}
              onChangeText={setInputValue}
              keyboardType="numeric"
              placeholder="Enter value"
              placeholderTextColor={COLORS.gray}
              autoFocus
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowStatsModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.updateButton]}
                onPress={handleStatUpdate}
              >
                <Text style={styles.updateButtonText}>Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background,
    borderRadius: 15,
    margin: 20,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  lockIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lockText: {
    color: COLORS.red,
    fontSize: 12,
    marginLeft: 4,
    fontWeight: 'bold',
  },
  statsContainer: {
    maxHeight: 400,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  statHome: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  statAway: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  statLabel: {
    flex: 2,
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  statLabelText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  statValue: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  statText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  editableText: {
    color: COLORS.primary,
  },
  disabledText: {
    color: COLORS.white,
  },
  quickButton: {
    backgroundColor: COLORS.primary,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  quickButtonText: {
    color: COLORS.black,
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderRadius: 20,
    padding: 20,
    width: '80%',
  },
  modalTitle: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    backgroundColor: COLORS.black,
    color: COLORS.white,
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.gray,
  },
  updateButton: {
    backgroundColor: COLORS.primary,
  },
  cancelButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  updateButtonText: {
    color: COLORS.black,
    fontWeight: 'bold',
  },
})

export default MatchStatsPanel
"use client"

import type React from "react"
import { useState } from "react"
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { COLORS } from "../src/constants/colors"

interface PositionPickerProps {
  selectedPosition: string
  onPositionSelect: (position: string) => void
}

const positions = [
  { id: "goalkeeper", name: "Goalkeeper", icon: "hand-left" },
  { id: "defender", name: "Defender", icon: "shield" },
  { id: "midfielder", name: "Midfielder", icon: "ellipse" },
  { id: "forward", name: "Forward", icon: "arrow-up" },
]

const PositionPicker: React.FC<PositionPickerProps> = ({ selectedPosition, onPositionSelect }) => {
  const [showModal, setShowModal] = useState(false)

  const handlePositionSelect = (position: string) => {
    onPositionSelect(position)
    setShowModal(false)
  }

  const selectedPositionData = positions.find((pos) => pos.id === selectedPosition)

  return (
    <View>
      <TouchableOpacity style={styles.picker} onPress={() => setShowModal(true)}>
        <View style={styles.selectedPosition}>
          {selectedPositionData && (
            <Ionicons name={selectedPositionData.icon as any} size={20} color={COLORS.primary} />
          )}
          <Text style={styles.selectedText}>
            {selectedPositionData ? selectedPositionData.name : "Select Position"}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={20} color={COLORS.gray} />
      </TouchableOpacity>

      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Position</Text>

            <FlatList
              data={positions}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.positionItem} onPress={() => handlePositionSelect(item.id)}>
                  <Ionicons name={item.icon as any} size={24} color={COLORS.primary} />
                  <Text style={styles.positionText}>{item.name}</Text>
                  {selectedPosition === item.id && <Ionicons name="checkmark" size={20} color={COLORS.primary} />}
                </TouchableOpacity>
              )}
            />

            <TouchableOpacity style={styles.cancelButton} onPress={() => setShowModal(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  picker: {
    backgroundColor: COLORS.black,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 10,
    padding: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectedPosition: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  selectedText: {
    color: COLORS.white,
    fontSize: 16,
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
    padding: 20,
    width: "80%",
    maxHeight: "60%",
  },
  modalTitle: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  positionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray,
  },
  positionText: {
    color: COLORS.white,
    fontSize: 16,
    marginLeft: 15,
    flex: 1,
  },
  cancelButton: {
    backgroundColor: COLORS.gray,
    borderRadius: 10,
    padding: 15,
    alignItems: "center",
    marginTop: 20,
  },
  cancelButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
  },
})

export default PositionPicker

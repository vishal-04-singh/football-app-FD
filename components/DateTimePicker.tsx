"use client"

import type React from "react"
import { useState } from "react"
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, Platform } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { COLORS } from "../src/constants/colors"
import RNDateTimePicker from "@react-native-community/datetimepicker"

interface DateTimePickerProps {
  mode: "date" | "time"
  value: Date
  onChange: (date: Date) => void
  placeholder: string
}

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

const CustomDateTimePicker: React.FC<DateTimePickerProps> = ({ mode, value, onChange, placeholder }) => {
  const [showPicker, setShowPicker] = useState(false)
  const [tempDate, setTempDate] = useState(value)
  const [showCustomPicker, setShowCustomPicker] = useState(false)

  // For custom picker
  const [selectedMonth, setSelectedMonth] = useState(value.getMonth())
  const [selectedDay, setSelectedDay] = useState(value.getDate())
  const [selectedYear, setSelectedYear] = useState(value.getFullYear())
  const [selectedHour, setSelectedHour] = useState(value.getHours())
  const [selectedMinute, setSelectedMinute] = useState(value.getMinutes())
  const [selectedAmPm, setSelectedAmPm] = useState(value.getHours() >= 12 ? "PM" : "AM")

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i)
  const days = Array.from({ length: 31 }, (_, i) => i + 1)
  const hours = Array.from({ length: 12 }, (_, i) => (i === 0 ? 12 : i))
  const minutes = Array.from({ length: 60 }, (_, i) => i)

  const handleNativeChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || value
    if (Platform.OS === "android") {
      setShowPicker(false)
    }
    setTempDate(currentDate)
    if (selectedDate) {
      onChange(currentDate)
    }
  }

  const handleCustomPickerConfirm = () => {
    const newDate = new Date()
    newDate.setFullYear(selectedYear)
    newDate.setMonth(selectedMonth)
    newDate.setDate(selectedDay)

    let hour = selectedHour
    if (selectedAmPm === "PM" && hour < 12) {
      hour += 12
    } else if (selectedAmPm === "AM" && hour === 12) {
      hour = 0
    }

    newDate.setHours(hour)
    newDate.setMinutes(selectedMinute)
    newDate.setSeconds(0)

    onChange(newDate)
    setShowCustomPicker(false)
  }

  const openPicker = () => {
    if (Platform.OS === "ios") {
      setShowPicker(true)
    } else {
      // On Android, we'll use our custom picker for better UX
      setSelectedMonth(value.getMonth())
      setSelectedDay(value.getDate())
      setSelectedYear(value.getFullYear())
      setSelectedHour(value.getHours() % 12 === 0 ? 12 : value.getHours() % 12)
      setSelectedMinute(value.getMinutes())
      setSelectedAmPm(value.getHours() >= 12 ? "PM" : "AM")
      setShowCustomPicker(true)
    }
  }

  const formatValue = () => {
    if (mode === "date") {
      return value.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    } else {
      return value.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    }
  }

  const renderPickerItem = ({ item, selected, onSelect }: { item: any; selected: boolean; onSelect: () => void }) => (
    <TouchableOpacity style={[styles.pickerItem, selected && styles.selectedPickerItem]} onPress={onSelect}>
      <Text style={[styles.pickerItemText, selected && styles.selectedPickerItemText]}>
        {item.toString().padStart(2, "0")}
      </Text>
    </TouchableOpacity>
  )

  return (
    <View>
      <TouchableOpacity style={styles.pickerButton} onPress={openPicker}>
        <Text style={styles.pickerButtonText}>{value ? formatValue() : placeholder}</Text>
        <Ionicons name={mode === "date" ? "calendar" : "time"} size={20} color={COLORS.primary} />
      </TouchableOpacity>

      {/* Native iOS Picker */}
      {showPicker && Platform.OS === "ios" && (
        <Modal transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.pickerHeader}>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    onChange(tempDate)
                    setShowPicker(false)
                  }}
                >
                  <Text style={styles.doneText}>Done</Text>
                </TouchableOpacity>
              </View>
              <RNDateTimePicker
                value={tempDate}
                mode={mode}
                display="spinner"
                onChange={handleNativeChange}
                style={styles.nativePicker}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Native Android Picker (will show as dialog) */}
      {showPicker && Platform.OS === "android" && (
        <RNDateTimePicker value={value} mode={mode} display="default" onChange={handleNativeChange} />
      )}

      {/* Custom Picker for Android */}
      {showCustomPicker && (
        <Modal transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.pickerHeader}>
                <TouchableOpacity onPress={() => setShowCustomPicker(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.pickerTitle}>{mode === "date" ? "Select Date" : "Select Time"}</Text>
                <TouchableOpacity onPress={handleCustomPickerConfirm}>
                  <Text style={styles.doneText}>Done</Text>
                </TouchableOpacity>
              </View>

              {mode === "date" ? (
                <View style={styles.customPickerContainer}>
                  <View style={styles.pickerColumn}>
                    <Text style={styles.pickerColumnLabel}>Month</Text>
                    <FlatList
                      data={months}
                      keyExtractor={(item, index) => `month-${index}`}
                      renderItem={({ item, index }) => (
                        <TouchableOpacity
                          style={[styles.pickerItem, selectedMonth === index && styles.selectedPickerItem]}
                          onPress={() => setSelectedMonth(index)}
                        >
                          <Text
                            style={[styles.pickerItemText, selectedMonth === index && styles.selectedPickerItemText]}
                          >
                            {item}
                          </Text>
                        </TouchableOpacity>
                      )}
                      showsVerticalScrollIndicator={false}
                      initialScrollIndex={selectedMonth}
                      getItemLayout={(data, index) => ({
                        length: 50,
                        offset: 50 * index,
                        index,
                      })}
                    />
                  </View>

                  <View style={styles.pickerColumn}>
                    <Text style={styles.pickerColumnLabel}>Day</Text>
                    <FlatList
                      data={days}
                      keyExtractor={(item) => `day-${item}`}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={[styles.pickerItem, selectedDay === item && styles.selectedPickerItem]}
                          onPress={() => setSelectedDay(item)}
                        >
                          <Text style={[styles.pickerItemText, selectedDay === item && styles.selectedPickerItemText]}>
                            {item}
                          </Text>
                        </TouchableOpacity>
                      )}
                      showsVerticalScrollIndicator={false}
                      initialScrollIndex={selectedDay - 1}
                      getItemLayout={(data, index) => ({
                        length: 50,
                        offset: 50 * index,
                        index,
                      })}
                    />
                  </View>

                  <View style={styles.pickerColumn}>
                    <Text style={styles.pickerColumnLabel}>Year</Text>
                    <FlatList
                      data={years}
                      keyExtractor={(item) => `year-${item}`}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={[styles.pickerItem, selectedYear === item && styles.selectedPickerItem]}
                          onPress={() => setSelectedYear(item)}
                        >
                          <Text style={[styles.pickerItemText, selectedYear === item && styles.selectedPickerItemText]}>
                            {item}
                          </Text>
                        </TouchableOpacity>
                      )}
                      showsVerticalScrollIndicator={false}
                      initialScrollIndex={years.indexOf(selectedYear)}
                      getItemLayout={(data, index) => ({
                        length: 50,
                        offset: 50 * index,
                        index,
                      })}
                    />
                  </View>
                </View>
              ) : (
                <View style={styles.customPickerContainer}>
                  <View style={styles.pickerColumn}>
                    <Text style={styles.pickerColumnLabel}>Hour</Text>
                    <FlatList
                      data={hours}
                      keyExtractor={(item) => `hour-${item}`}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={[styles.pickerItem, selectedHour === item && styles.selectedPickerItem]}
                          onPress={() => setSelectedHour(item)}
                        >
                          <Text style={[styles.pickerItemText, selectedHour === item && styles.selectedPickerItemText]}>
                            {item}
                          </Text>
                        </TouchableOpacity>
                      )}
                      showsVerticalScrollIndicator={false}
                      initialScrollIndex={hours.indexOf(selectedHour)}
                      getItemLayout={(data, index) => ({
                        length: 50,
                        offset: 50 * index,
                        index,
                      })}
                    />
                  </View>

                  <View style={styles.pickerColumn}>
                    <Text style={styles.pickerColumnLabel}>Minute</Text>
                    <FlatList
                      data={minutes}
                      keyExtractor={(item) => `minute-${item}`}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={[styles.pickerItem, selectedMinute === item && styles.selectedPickerItem]}
                          onPress={() => setSelectedMinute(item)}
                        >
                          <Text
                            style={[styles.pickerItemText, selectedMinute === item && styles.selectedPickerItemText]}
                          >
                            {item.toString().padStart(2, "0")}
                          </Text>
                        </TouchableOpacity>
                      )}
                      showsVerticalScrollIndicator={false}
                      initialScrollIndex={selectedMinute}
                      getItemLayout={(data, index) => ({
                        length: 50,
                        offset: 50 * index,
                        index,
                      })}
                    />
                  </View>

                  <View style={styles.pickerColumn}>
                    <Text style={styles.pickerColumnLabel}>AM/PM</Text>
                    <View>
                      <TouchableOpacity
                        style={[styles.ampmItem, selectedAmPm === "AM" && styles.selectedPickerItem]}
                        onPress={() => setSelectedAmPm("AM")}
                      >
                        <Text style={[styles.pickerItemText, selectedAmPm === "AM" && styles.selectedPickerItemText]}>
                          AM
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.ampmItem, selectedAmPm === "PM" && styles.selectedPickerItem]}
                        onPress={() => setSelectedAmPm("PM")}
                      >
                        <Text style={[styles.pickerItemText, selectedAmPm === "PM" && styles.selectedPickerItemText]}>
                          PM
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
            </View>
          </View>
        </Modal>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  pickerButton: {
    backgroundColor: COLORS.black,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 10,
    padding: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pickerButtonText: {
    color: COLORS.white,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray,
  },
  pickerTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "bold",
  },
  cancelText: {
    color: COLORS.gray,
    fontSize: 16,
  },
  doneText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "bold",
  },
  nativePicker: {
    height: 200,
  },
  customPickerContainer: {
    flexDirection: "row",
    height: 250,
  },
  pickerColumn: {
    flex: 1,
    alignItems: "center",
  },
  pickerColumnLabel: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "bold",
    marginVertical: 10,
  },
  pickerItem: {
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  selectedPickerItem: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
  },
  pickerItemText: {
    color: COLORS.white,
    fontSize: 18,
  },
  selectedPickerItemText: {
    color: COLORS.black,
    fontWeight: "bold",
  },
  ampmItem: {
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    marginVertical: 5,
  },
})

export default CustomDateTimePicker

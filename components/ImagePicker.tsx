"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { View, Text, TouchableOpacity, StyleSheet, Alert, Image } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { COLORS } from "../src/constants/colors"
import * as ImagePicker from "expo-image-picker"
import { imageService } from "../services/imageService"

interface ImagePickerProps {
  onImageSelected: (imageData: string) => void
  currentImage?: string
  placeholder: string
  size?: number
  type?: "team" | "player"
}

const CustomImagePicker: React.FC<ImagePickerProps> = ({
  onImageSelected,
  currentImage,
  placeholder,
  size = 100,
  type = "player",
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(currentImage || null)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    if (currentImage) {
      setSelectedImage(currentImage)
    }
  }, [currentImage])

  const processImage = async (imageUri: string) => {
    try {
      setIsProcessing(true)
      console.log("🖼️ Processing image:", imageUri)

      // Convert image to base64 for storage
      const processedImage = await imageService.uploadImage(imageUri, type)

      setSelectedImage(processedImage)
      onImageSelected(processedImage)

      console.log("✅ Image processed successfully")
    } catch (error) {
      console.error("❌ Error processing image:", error)
      Alert.alert("Error", "Failed to process image. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  const pickImage = async () => {
    if (isProcessing) return

    // Request permission
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync()

    if (permissionResult.granted === false) {
      Alert.alert("Permission Required", "Permission to access camera roll is required!")
      return
    }

    Alert.alert("Select Image", "Choose an option", [
      {
        text: "Camera",
        onPress: async () => {
          const cameraPermission = await ImagePicker.requestCameraPermissionsAsync()
          if (cameraPermission.granted === false) {
            Alert.alert("Permission Required", "Permission to access camera is required!")
            return
          }

          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7, // Reduced quality for better performance
          })

          if (!result.canceled && result.assets[0]) {
            await processImage(result.assets[0].uri)
          }
        },
      },
      {
        text: "Gallery",
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7, // Reduced quality for better performance
          })

          if (!result.canceled && result.assets[0]) {
            await processImage(result.assets[0].uri)
          }
        },
      },
      {
        text: "Remove Image",
        style: "destructive",
        onPress: () => {
          setSelectedImage(null)
          onImageSelected("")
        },
      },
      {
        text: "Cancel",
        style: "cancel",
      },
    ])
  }

  const renderImage = () => {
    if (selectedImage) {
      // Handle both base64 data URLs and regular URIs
      const imageSource = selectedImage.startsWith("data:")
        ? { uri: selectedImage }
        : selectedImage.startsWith("http")
          ? { uri: selectedImage }
          : { uri: selectedImage }

      return (
        <Image
          source={imageSource}
          style={[styles.image, { width: size, height: size }]}
          onError={(error) => {
            console.error("❌ Image load error:", error)
            setSelectedImage(null)
          }}
        />
      )
    }

    return (
      <View style={[styles.placeholder, { width: size, height: size }]}>
        <Ionicons name="camera-outline" size={size * 0.3} color={COLORS.gray} />
        <Text style={styles.placeholderText}>{placeholder}</Text>
      </View>
    )
  }

  return (
    <TouchableOpacity
      style={[styles.container, { width: size, height: size }]}
      onPress={pickImage}
      disabled={isProcessing}
    >
      {renderImage()}

      <View style={styles.editIcon}>
        {isProcessing ? (
          <Ionicons name="hourglass-outline" size={16} color={COLORS.white} />
        ) : (
          <Ionicons name="pencil" size={16} color={COLORS.white} />
        )}
      </View>

      {isProcessing && (
        <View style={styles.processingOverlay}>
          <Text style={styles.processingText}>Processing...</Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    borderRadius: 10,
    overflow: "hidden",
  },
  image: {
    borderRadius: 10,
  },
  placeholder: {
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: "dashed",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
  },
  placeholderText: {
    color: COLORS.gray,
    fontSize: 10,
    textAlign: "center",
    marginTop: 5,
  },
  editIcon: {
    position: "absolute",
    bottom: 5,
    right: 5,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  processingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
  },
  processingText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "bold",
  },
})

export default CustomImagePicker

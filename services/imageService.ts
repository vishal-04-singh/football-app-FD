import * as FileSystem from "expo-file-system"

class ImageService {
  private baseURL: string

  constructor() {
    this.baseURL = "http://192.168.29.71:3000/api"
  }

  // Convert image to base64
  async convertImageToBase64(imageUri: string): Promise<string> {
    try {
      console.log("📸 Converting image to base64:", imageUri)

      // Read the image file as base64
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      })

      // Add data URL prefix
      const mimeType = this.getMimeType(imageUri)
      const dataUrl = `data:${mimeType};base64,${base64}`

      console.log("✅ Image converted to base64, size:", dataUrl.length)
      return dataUrl
    } catch (error) {
      console.error("❌ Error converting image to base64:", error)
      throw new Error("Failed to process image")
    }
  }

  // Get MIME type from file extension
  private getMimeType(uri: string): string {
    const extension = uri.split(".").pop()?.toLowerCase()
    switch (extension) {
      case "jpg":
      case "jpeg":
        return "image/jpeg"
      case "png":
        return "image/png"
      case "gif":
        return "image/gif"
      case "webp":
        return "image/webp"
      default:
        return "image/jpeg"
    }
  }

  // Upload image to server (for future implementation)
  async uploadImage(imageUri: string, type: "team" | "player"): Promise<string> {
    try {
      // For now, convert to base64 for storage
      const base64Data = await this.convertImageToBase64(imageUri)

      // In a real implementation, you would upload to a cloud service
      // For now, we'll return the base64 data URL
      return base64Data
    } catch (error) {
      console.error("❌ Error uploading image:", error)
      throw error
    }
  }

  // Validate image
  validateImage(imageUri: string): boolean {
    if (!imageUri) return false

    // Check if it's a valid URI
    const validExtensions = ["jpg", "jpeg", "png", "gif", "webp"]
    const extension = imageUri.split(".").pop()?.toLowerCase()

    return validExtensions.includes(extension || "")
  }

  // Get placeholder image
  getPlaceholderImage(type: "team" | "player"): string {
    // Return a default placeholder based on type
    if (type === "team") {
      return "https://via.placeholder.com/100x100/FFD700/000000?text=TEAM"
    } else {
      return "https://via.placeholder.com/100x100/FFD700/000000?text=PLAYER"
    }
  }
}

export const imageService = new ImageService()
export default imageService

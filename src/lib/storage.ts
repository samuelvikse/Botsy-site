import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from './firebase'

/**
 * Upload a company logo to Firebase Storage
 * @param companyId - The company's unique ID
 * @param file - The image file to upload
 * @returns The download URL of the uploaded image
 */
export async function uploadCompanyLogo(
  companyId: string,
  file: File
): Promise<string> {
  if (!storage) throw new Error('Firebase Storage not initialized')

  // Validate file type
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
  if (!validTypes.includes(file.type)) {
    throw new Error('Ugyldig filtype. Bruk JPG, PNG, GIF, WebP eller SVG.')
  }

  // Validate file size (max 2MB)
  const maxSize = 2 * 1024 * 1024 // 2MB
  if (file.size > maxSize) {
    throw new Error('Filen er for stor. Maks 2MB.')
  }

  // Create a unique filename
  const extension = file.name.split('.').pop() || 'png'
  const filename = `logo_${Date.now()}.${extension}`
  const storagePath = `companies/${companyId}/logos/${filename}`

  // Create storage reference
  const storageRef = ref(storage, storagePath)

  // Upload the file
  const snapshot = await uploadBytes(storageRef, file, {
    contentType: file.type,
    customMetadata: {
      uploadedAt: new Date().toISOString(),
      originalName: file.name,
    },
  })

  // Get the download URL
  const downloadUrl = await getDownloadURL(snapshot.ref)

  return downloadUrl
}

/**
 * Delete a company logo from Firebase Storage
 * @param logoUrl - The URL of the logo to delete
 */
export async function deleteCompanyLogo(logoUrl: string): Promise<void> {
  if (!storage) throw new Error('Firebase Storage not initialized')

  try {
    // Extract the path from the URL
    // Firebase Storage URLs look like: https://firebasestorage.googleapis.com/v0/b/bucket/o/path%2Fto%2Ffile?...
    const url = new URL(logoUrl)
    const pathMatch = url.pathname.match(/\/o\/(.+)$/)
    if (!pathMatch) return

    const path = decodeURIComponent(pathMatch[1].split('?')[0])
    const storageRef = ref(storage, path)

    await deleteObject(storageRef)
  } catch (error) {
    // Ignore errors if file doesn't exist
    console.warn('Could not delete logo:', error)
  }
}

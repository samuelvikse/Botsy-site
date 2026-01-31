import { NextRequest, NextResponse } from 'next/server'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getStorage } from 'firebase-admin/storage'

// Initialize Firebase Admin
let adminStorageInstance: ReturnType<typeof getStorage> | null = null

function getAdminStorage() {
  if (adminStorageInstance) {
    return adminStorageInstance
  }

  if (getApps().length === 0) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
      initializeApp({
        credential: cert(serviceAccount),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      })
    } else {
      throw new Error('Firebase credentials not configured')
    }
  }

  adminStorageInstance = getStorage()
  return adminStorageInstance
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const companyId = formData.get('companyId') as string | null
    const sessionId = formData.get('sessionId') as string | null

    if (!file || !companyId || !sessionId) {
      return NextResponse.json(
        { success: false, error: 'Mangler fil, companyId eller sessionId' },
        { status: 400 }
      )
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Ugyldig filtype. Bruk JPG, PNG, GIF eller WebP.' },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'Filen er for stor. Maks 10MB.' },
        { status: 400 }
      )
    }

    // Get storage instance
    const storage = getAdminStorage()
    const bucket = storage.bucket()

    // Create filename and path
    const extension = file.name.split('.').pop() || 'jpg'
    const filename = `chat_${Date.now()}.${extension}`
    const storagePath = `companies/${companyId}/chat-images/${sessionId}/${filename}`

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Firebase Storage
    const fileRef = bucket.file(storagePath)
    await fileRef.save(buffer, {
      metadata: {
        contentType: file.type,
        metadata: {
          uploadedAt: new Date().toISOString(),
          originalName: file.name,
        },
      },
    })

    // Make file public and get URL
    await fileRef.makePublic()
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`

    return NextResponse.json({
      success: true,
      imageUrl: publicUrl,
    })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Kunne ikke laste opp bildet' },
      { status: 500 }
    )
  }
}

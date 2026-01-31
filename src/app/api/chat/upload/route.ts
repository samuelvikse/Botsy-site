import { NextRequest, NextResponse } from 'next/server'

// This route requires Firebase Admin SDK with service account credentials
// Since the organization doesn't allow service account key creation,
// image upload is disabled for now

export async function POST(request: NextRequest) {
  // Check if we have the required environment variable
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    return NextResponse.json(
      {
        success: false,
        error: 'Bildeopplasting er ikke tilgjengelig. Kontakt support.'
      },
      { status: 503 }
    )
  }

  try {
    // Dynamic import to avoid bundling issues
    const { initializeApp, getApps, cert } = await import('firebase-admin/app')
    const { getStorage } = await import('firebase-admin/storage')

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

    // Initialize Firebase Admin
    if (getApps().length === 0) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
      initializeApp({
        credential: cert(serviceAccount),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      })
    }

    const storage = getStorage()
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

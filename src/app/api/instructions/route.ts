import { NextRequest, NextResponse } from 'next/server'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import type { Instruction, InstructionDoc } from '@/types'

// Initialize Firebase Admin (server-side)
function getAdminDb() {
  if (getApps().length === 0) {
    // For development, use default credentials
    // In production, use service account
    initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    })
  }
  return getFirestore()
}

// GET - Fetch instructions for a company
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId er påkrevd' },
        { status: 400 }
      )
    }

    const db = getAdminDb()
    const instructionsRef = db.collection('companies').doc(companyId).collection('instructions')

    // Get active instructions, ordered by creation date
    const snapshot = await instructionsRef
      .where('isActive', '==', true)
      .orderBy('createdAt', 'desc')
      .get()

    const instructions: Instruction[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      startsAt: doc.data().startsAt?.toDate() || null,
      expiresAt: doc.data().expiresAt?.toDate() || null,
    })) as Instruction[]

    return NextResponse.json({ instructions })

  } catch {
    return NextResponse.json(
      { error: 'Kunne ikke hente instruksjoner' },
      { status: 500 }
    )
  }
}

// POST - Create a new instruction
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { companyId, instruction } = body as {
      companyId: string
      instruction: Omit<InstructionDoc, 'createdAt'>
    }

    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId er påkrevd' },
        { status: 400 }
      )
    }

    if (!instruction || !instruction.content) {
      return NextResponse.json(
        { error: 'Instruksjonsinnhold er påkrevd' },
        { status: 400 }
      )
    }

    const db = getAdminDb()
    const instructionsRef = db.collection('companies').doc(companyId).collection('instructions')

    const now = new Date()
    const startsAt = instruction.startsAt ? new Date(instruction.startsAt as string) : null
    const expiresAt = instruction.expiresAt ? new Date(instruction.expiresAt as string) : null

    const docData = {
      content: instruction.content,
      category: instruction.category || 'general',
      priority: instruction.priority || 'medium',
      isActive: instruction.isActive !== false,
      startsAt,
      expiresAt,
      createdAt: now,
      createdBy: instruction.createdBy || '',
    }

    const docRef = await instructionsRef.add(docData)

    const createdInstruction: Instruction = {
      id: docRef.id,
      content: docData.content,
      category: docData.category,
      priority: docData.priority,
      isActive: docData.isActive,
      startsAt: docData.startsAt,
      expiresAt: docData.expiresAt,
      createdAt: docData.createdAt,
      createdBy: docData.createdBy,
    }

    return NextResponse.json({ instruction: createdInstruction })

  } catch {
    return NextResponse.json(
      { error: 'Kunne ikke opprette instruks' },
      { status: 500 }
    )
  }
}

// PATCH - Update an instruction
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { companyId, instructionId, updates } = body as {
      companyId: string
      instructionId: string
      updates: Partial<InstructionDoc>
    }

    if (!companyId || !instructionId) {
      return NextResponse.json(
        { error: 'companyId og instructionId er påkrevd' },
        { status: 400 }
      )
    }

    const db = getAdminDb()
    const docRef = db.collection('companies').doc(companyId).collection('instructions').doc(instructionId)

    // Remove undefined values
    const cleanUpdates: Record<string, unknown> = {}
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        cleanUpdates[key] = value
      }
    })

    await docRef.update(cleanUpdates)

    return NextResponse.json({ success: true })

  } catch {
    return NextResponse.json(
      { error: 'Kunne ikke oppdatere instruks' },
      { status: 500 }
    )
  }
}

// DELETE - Deactivate an instruction
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const instructionId = searchParams.get('instructionId')

    if (!companyId || !instructionId) {
      return NextResponse.json(
        { error: 'companyId og instructionId er påkrevd' },
        { status: 400 }
      )
    }

    const db = getAdminDb()
    const docRef = db.collection('companies').doc(companyId).collection('instructions').doc(instructionId)

    // Soft delete by setting isActive to false
    await docRef.update({ isActive: false })

    return NextResponse.json({ success: true })

  } catch {
    return NextResponse.json(
      { error: 'Kunne ikke slette instruks' },
      { status: 500 }
    )
  }
}

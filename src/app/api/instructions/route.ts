import { NextRequest, NextResponse } from 'next/server'
import type { Instruction, InstructionDoc } from '@/types'
import { parseFirestoreFields, toFirestoreValue } from '@/lib/firestore-utils'

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'botsy-no'
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`

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

    // Use REST API to get instructions
    const response = await fetch(`${FIRESTORE_BASE_URL}/companies/${companyId}/instructions`)

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ instructions: [] })
      }
      throw new Error('Failed to fetch instructions')
    }

    const data = await response.json()

    if (!data.documents) {
      return NextResponse.json({ instructions: [] })
    }

    const instructions: Instruction[] = data.documents
      .map((doc: { name: string; fields?: Record<string, unknown> }) => {
        if (!doc.fields) return null
        const parsed = parseFirestoreFields(doc.fields)
        const docId = doc.name.split('/').pop()

        return {
          id: docId,
          content: parsed.content as string,
          category: parsed.category as string || 'general',
          priority: parsed.priority as string || 'medium',
          isActive: parsed.isActive as boolean,
          startsAt: parsed.startsAt as Date | null,
          expiresAt: parsed.expiresAt as Date | null,
          createdAt: parsed.createdAt as Date || new Date(),
          createdBy: parsed.createdBy as string || '',
        }
      })
      .filter((inst: Instruction | null) => inst !== null && inst.isActive)
      .sort((a: Instruction, b: Instruction) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return bTime - aTime
      })

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

    // Create document with auto-generated ID
    const createResponse = await fetch(
      `${FIRESTORE_BASE_URL}/companies/${companyId}/instructions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            content: toFirestoreValue(docData.content),
            category: toFirestoreValue(docData.category),
            priority: toFirestoreValue(docData.priority),
            isActive: toFirestoreValue(docData.isActive),
            startsAt: toFirestoreValue(docData.startsAt),
            expiresAt: toFirestoreValue(docData.expiresAt),
            createdAt: toFirestoreValue(docData.createdAt),
            createdBy: toFirestoreValue(docData.createdBy),
          }
        }),
      }
    )

    if (!createResponse.ok) {
      throw new Error('Failed to create instruction')
    }

    const createdDoc = await createResponse.json()
    const docId = createdDoc.name.split('/').pop()

    const createdInstruction: Instruction = {
      id: docId,
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

    // Build update fields and mask
    const fields: Record<string, unknown> = {}
    const fieldPaths: string[] = []

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        fields[key] = toFirestoreValue(value)
        fieldPaths.push(key)
      }
    })

    if (fieldPaths.length === 0) {
      return NextResponse.json({ success: true })
    }

    const updateMask = fieldPaths.map(p => `updateMask.fieldPaths=${p}`).join('&')

    const updateResponse = await fetch(
      `${FIRESTORE_BASE_URL}/companies/${companyId}/instructions/${instructionId}?${updateMask}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields }),
      }
    )

    if (!updateResponse.ok) {
      throw new Error('Failed to update instruction')
    }

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

    // Soft delete by setting isActive to false
    const updateResponse = await fetch(
      `${FIRESTORE_BASE_URL}/companies/${companyId}/instructions/${instructionId}?updateMask.fieldPaths=isActive`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            isActive: toFirestoreValue(false),
          }
        }),
      }
    )

    if (!updateResponse.ok) {
      throw new Error('Failed to delete instruction')
    }

    return NextResponse.json({ success: true })

  } catch {
    return NextResponse.json(
      { error: 'Kunne ikke slette instruks' },
      { status: 500 }
    )
  }
}

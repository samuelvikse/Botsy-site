/**
 * Unanswered Questions API
 * GET /api/unanswered-questions
 *
 * Fetches questions where the chatbot couldn't provide a satisfactory answer
 */

import { NextRequest, NextResponse } from 'next/server'

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'botsy-no'
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json({ error: 'companyId er påkrevd' }, { status: 400 })
    }

    // Query for unanswered questions in the last 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    // Fetch unanswered questions from the unansweredQuestions subcollection
    const response = await fetch(
      `${FIRESTORE_BASE_URL}/companies/${companyId}/unansweredQuestions?orderBy=createdAt desc&pageSize=20`
    )

    if (!response.ok) {
      // Collection might not exist yet
      return NextResponse.json({ questions: [] })
    }

    const data = await response.json()
    const documents = data.documents || []

    const questions = documents.map((doc: { name: string; fields: Record<string, unknown> }) => {
      const fields = doc.fields || {}
      return {
        id: doc.name.split('/').pop(),
        question: parseValue(fields.question),
        customerIdentifier: parseValue(fields.customerIdentifier),
        channel: parseValue(fields.channel),
        conversationId: parseValue(fields.conversationId),
        createdAt: parseValue(fields.createdAt),
        resolved: parseValue(fields.resolved) || false,
      }
    }).filter((q: { resolved: boolean }) => !q.resolved)

    return NextResponse.json({ questions })
  } catch (error) {
    console.error('[Unanswered Questions] Error:', error)
    return NextResponse.json({ questions: [] })
  }
}

function parseValue(field: unknown): unknown {
  if (!field || typeof field !== 'object') return null
  const f = field as Record<string, unknown>
  if ('stringValue' in f) return f.stringValue
  if ('integerValue' in f) return parseInt(f.integerValue as string)
  if ('doubleValue' in f) return f.doubleValue
  if ('booleanValue' in f) return f.booleanValue
  if ('timestampValue' in f) return f.timestampValue
  if ('nullValue' in f) return null
  return null
}

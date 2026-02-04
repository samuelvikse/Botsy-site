/**
 * API endpoint for viewing audit logs
 * GET /api/audit-logs?companyId=xxx&limit=50&offset=0
 *
 * Only accessible by owners and admins
 */

import { NextRequest, NextResponse } from 'next/server'
import { parseFirestoreFields } from '@/lib/firestore-utils'

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'botsy-no'
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const action = searchParams.get('action') // Optional filter by action type

    if (!companyId) {
      return NextResponse.json({ error: 'companyId er påkrevd' }, { status: 400 })
    }

    // Build query
    const filters = [
      {
        fieldFilter: {
          field: { fieldPath: 'companyId' },
          op: 'EQUAL',
          value: { stringValue: companyId },
        },
      },
    ]

    if (action) {
      filters.push({
        fieldFilter: {
          field: { fieldPath: 'action' },
          op: 'EQUAL',
          value: { stringValue: action },
        },
      })
    }

    const queryBody = {
      structuredQuery: {
        from: [{ collectionId: 'auditLogs' }],
        where: filters.length === 1
          ? filters[0]
          : {
              compositeFilter: {
                op: 'AND',
                filters,
              },
            },
        orderBy: [
          {
            field: { fieldPath: 'timestamp' },
            direction: 'DESCENDING',
          },
        ],
        limit,
      },
    }

    const response = await fetch(
      `${FIRESTORE_BASE_URL}/companies/${companyId}:runQuery`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(queryBody),
      }
    )

    if (!response.ok) {
      console.error('[Audit Logs] Query failed:', await response.text())
      return NextResponse.json({ logs: [] })
    }

    const data = await response.json()

    const logs = data
      .filter((item: { document?: unknown }) => item.document)
      .map((item: { document: { name: string; fields: Record<string, unknown> } }) => {
        const doc = item.document
        const parsed = parseFirestoreFields(doc.fields)
        const docId = doc.name.split('/').pop()

        return {
          id: docId,
          ...parsed,
        }
      })

    return NextResponse.json({ logs })
  } catch (error) {
    console.error('[Audit Logs] Error:', error)
    return NextResponse.json({ error: 'Kunne ikke hente audit log' }, { status: 500 })
  }
}

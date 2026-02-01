/**
 * Shared Firestore utility functions
 * Used by email-firestore.ts, messenger-firestore.ts, and API routes
 */

/**
 * Parse a single Firestore value to JavaScript value
 */
export function parseFirestoreValue(value: unknown): unknown {
  const v = value as Record<string, unknown>
  if ('stringValue' in v) return v.stringValue
  if ('integerValue' in v) return parseInt(v.integerValue as string)
  if ('doubleValue' in v) return v.doubleValue
  if ('booleanValue' in v) return v.booleanValue
  if ('timestampValue' in v) return new Date(v.timestampValue as string)
  if ('mapValue' in v) {
    const mapValue = v.mapValue as { fields?: Record<string, unknown> }
    return mapValue.fields ? parseFirestoreFields(mapValue.fields) : {}
  }
  if ('arrayValue' in v) {
    const arrayValue = v.arrayValue as { values?: unknown[] }
    return (arrayValue.values || []).map(parseFirestoreValue)
  }
  if ('nullValue' in v) return null
  return null
}

/**
 * Parse Firestore document fields to JavaScript object
 */
export function parseFirestoreFields(fields: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(fields)) {
    result[key] = parseFirestoreValue(value)
  }

  return result
}

/**
 * Convert JavaScript value to Firestore field format
 */
export function toFirestoreValue(value: unknown): Record<string, unknown> {
  if (value === null || value === undefined) {
    return { nullValue: null }
  }
  if (typeof value === 'string') {
    return { stringValue: value }
  }
  if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      return { integerValue: String(value) }
    }
    return { doubleValue: value }
  }
  if (typeof value === 'boolean') {
    return { booleanValue: value }
  }
  if (value instanceof Date) {
    return { timestampValue: value.toISOString() }
  }
  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map(toFirestoreValue)
      }
    }
  }
  if (typeof value === 'object') {
    const fields: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) {
      fields[k] = toFirestoreValue(v)
    }
    return { mapValue: { fields } }
  }
  return { stringValue: String(value) }
}

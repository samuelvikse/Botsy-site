import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16

// Get encryption key from environment variable or generate a warning
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY

  if (!key) {
    // Fallback key for development only - DO NOT USE IN PRODUCTION
    return crypto.scryptSync('botsy-dev-key-do-not-use-in-prod', 'salt', 32)
  }

  // If key is provided, derive a proper 32-byte key using scrypt
  return crypto.scryptSync(key, 'botsy-salt', 32)
}

export function encryptCredentials(credentials: Record<string, string | undefined>): string {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  const jsonData = JSON.stringify(credentials)
  let encrypted = cipher.update(jsonData, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  // Combine iv + authTag + encrypted data
  const combined = Buffer.concat([
    iv,
    authTag,
    Buffer.from(encrypted, 'hex'),
  ])

  return combined.toString('base64')
}

export function decryptCredentials(encryptedData: string): Record<string, string | undefined> {
  try {
    const key = getEncryptionKey()
    const combined = Buffer.from(encryptedData, 'base64')

    // Extract iv, authTag, and encrypted data
    const iv = combined.subarray(0, IV_LENGTH)
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
    const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return JSON.parse(decrypted)
  } catch {
    // Return empty object if decryption fails (corrupted data or key change)
    return {}
  }
}

// Check if a string looks like encrypted data (base64 with expected length)
export function isEncrypted(data: unknown): boolean {
  if (typeof data !== 'string') return false
  if (data.length < 50) return false // Too short to be encrypted

  try {
    const decoded = Buffer.from(data, 'base64')
    // Should be at least iv + authTag + some data
    return decoded.length >= IV_LENGTH + AUTH_TAG_LENGTH + 10
  } catch {
    return false
  }
}

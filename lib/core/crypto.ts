import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'

function getKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY || process.env.ENC_KEY
  if (!envKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ENCRYPTION_KEY/ENC_KEY environment variable is required in production')
    }
    // Development fallback with warning
    console.warn('[DEV] ENCRYPTION_KEY not set, using AUTH_SECRET as fallback (NOT SECURE FOR PRODUCTION)')
    const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'dev-secret-insecure'
    if (secret === 'dev-secret-insecure') {
      console.warn('[DEV] Both ENCRYPTION_KEY/ENC_KEY and AUTH_SECRET are missing!')
    }
    return crypto.createHash('sha256').update(secret).digest()
  }
  if (envKey.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)')
  }
  return Buffer.from(envKey, 'hex')
}

export function encrypt(text: string): string {
  const KEY = getKey()
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv)
  const encrypted = Buffer.concat([
    cipher.update(text, 'utf8'),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${encrypted.toString('hex')}:${tag.toString('hex')}`
}

export function decrypt(encrypted: string): string {
  const KEY = getKey()
  const [ivHex, dataHex, tagHex] = encrypted.split(':')
  if (!ivHex || !dataHex || !tagHex) {
    throw new Error('Invalid encrypted string format')
  }
  const iv = Buffer.from(ivHex, 'hex')
  const data = Buffer.from(dataHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv)
  decipher.setAuthTag(tag)
  return decipher.update(data).toString('utf8') + decipher.final('utf8')
}

export function maskPassword(password: string): string {
  if (!password || password.length < 4) return '****'
  return password.substring(0, 2) + '*'.repeat(password.length - 4) + password.substring(password.length - 2)
}

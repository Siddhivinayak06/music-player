/**
 * Input sanitization and validation utilities.
 *
 * Provides helpers to sanitize user input before it reaches the database,
 * protecting against XSS, SQL injection (defense-in-depth alongside Supabase
 * parameterized queries), and other injection attacks.
 */

/**
 * Strip HTML tags from a string to prevent stored XSS.
 */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '')
}

/**
 * Sanitize a general text input:
 *  - Trim whitespace
 *  - Strip HTML tags
 *  - Limit length
 */
export function sanitizeText(input: unknown, maxLength = 500): string {
  if (typeof input !== 'string') return ''
  return stripHtml(input.trim()).slice(0, maxLength)
}

/**
 * Validate and sanitize a UUID string.
 * Returns the UUID if valid, or null if not.
 */
export function sanitizeUuid(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const uuid = input.trim().toLowerCase()
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
  return uuidRegex.test(uuid) ? uuid : null
}

/**
 * Validate an email address format.
 */
export function isValidEmail(input: unknown): boolean {
  if (typeof input !== 'string') return false
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(input.trim()) && input.length <= 254
}

/**
 * Validate password strength.
 *
 * Requirements:
 *  - Minimum 8 characters
 *  - At least one uppercase letter
 *  - At least one lowercase letter
 *  - At least one digit
 *  - At least one special character
 *
 * Returns an array of violation messages (empty = valid).
 */
export function validatePassword(password: string): string[] {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }
  if (password.length > 128) {
    errors.push('Password must be at most 128 characters long')
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one digit')
  }
  if (!/[^a-zA-Z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }

  return errors
}

/**
 * Sanitize a numeric input.
 * Returns the number if valid, or the default value.
 */
export function sanitizeNumber(
  input: unknown,
  { min = 0, max = Number.MAX_SAFE_INTEGER, defaultValue = 0 } = {}
): number {
  const num = Number(input)
  if (!Number.isFinite(num)) return defaultValue
  return Math.max(min, Math.min(max, Math.floor(num)))
}

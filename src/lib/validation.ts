// Shared form checks (design rules 2, 5, 11). The browser may check these
// first, but no action may trust the browser — call these on the server.

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@budiman\.com$/i.test(value.trim())
}

export function isValidIc(value: string): boolean {
  return /^\d{2}-\d{6}$/.test(value)
}

/** Design Reference A: new passwords are at least 8 characters. */
export function validateNewPassword(value: string): string | null {
  if (value.length < 8) {
    return 'New password must be at least 8 characters'
  }
  return null
}

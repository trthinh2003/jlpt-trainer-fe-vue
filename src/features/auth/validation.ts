export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export function isValidDisplayName(value: string): boolean {
  const length = value.trim().length
  return length >= 1 && length <= 100
}

export const newPasswordHelp = 'Ít nhất 8 ký tự, có chữ hoa A–Z và chữ số 0–9. Tối đa 72 byte UTF-8.'

export function isValidNewPassword(value: string): boolean {
  return value.length >= 8 && /[A-Z]/.test(value) && /[0-9]/.test(value) && new TextEncoder().encode(value).length <= 72
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest extends LoginRequest {
  displayName: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

export interface AuthResult {
  userId: string
  email: string
  displayName: string
  token: string
}

export interface AccountCapabilities {
  canManageCatalog: boolean
}

export type AuthUser = {
  id: number
  firstName: string
  lastName: string
  email: string
  username: string
  emailVerifiedAt: string | null
  createdAt: string
  updatedAt: string
}

export type ApiResponse<T> = {
  success: boolean
  data: T
  timestamp: string
  message: string | null
  code: number
}

export type LoginInput = {
  email: string
  password: string
}

export type RegisterInput = {
  firstName: string
  lastName: string
  username: string
  email: string
  password: string
  passwordConfirmation: string
}

export type AuthValidationErrors = Record<string, string[]>

export class AuthApiError extends Error {
  status: number
  errors?: AuthValidationErrors

  constructor(
    message: string,
    status: number,
    errors?: AuthValidationErrors
  ) {
    super(message)
    this.name = "AuthApiError"
    this.status = status
    this.errors = errors
  }
}

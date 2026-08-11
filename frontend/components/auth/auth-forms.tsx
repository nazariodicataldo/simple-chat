"use client"

import { useState } from "react"

import { LoginForm } from "./login-form"
import { RegisterForm } from "./register-form"

export function AuthForms() {
  const [mode, setMode] = useState<"login" | "register">("login")

  return (
    <>
      <LoginForm active={mode === "login"} onRegister={() => setMode("register")} />
      <RegisterForm active={mode === "register"} onLogin={() => setMode("login")} />
    </>
  )
}

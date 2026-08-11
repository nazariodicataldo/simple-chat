import "server-only"

import axios from "axios"

import { getBackendUrl } from "@/lib/backend"

export const serverHttp = axios.create({
  baseURL: getBackendUrl(),
  headers: { Accept: "application/json" },
})

import axios from "axios"

import { getBackendUrl } from "@/lib/backend"

const http = axios.create()

http.interceptors.request.use((config) => {
  config.baseURL = getBackendUrl()

  return config
})

export { http }

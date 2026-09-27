export function getBackendUrl(): string {
  // Un bundle production non deve fissare il dominio pubblico: una stringa vuota lascia usare all'Axios browser l'origine corrente.
  return (process.env.NEXT_PUBLIC_BACKEND_URL ?? "").replace(/\/$/, "")
}

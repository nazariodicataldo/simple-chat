import { randomInt } from "node:crypto"

const LOWERCASE = "abcdefghijklmnopqrstuvwxyz"
const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
const NUMBERS = "0123456789"
const SYMBOLS = "!@#$%^&*()-_=+[]{}:,.?"
const PASSWORD_CHARACTERS = `${LOWERCASE}${UPPERCASE}${NUMBERS}${SYMBOLS}`

function randomCharacter(characters: string) {
  return characters[randomInt(characters.length)]
}

export function createStrongPassword() {
  // I quattro caratteri obbligatori rendono deterministico il requisito mixedCase piu' simboli.
  const characters = [
    randomCharacter(LOWERCASE),
    randomCharacter(UPPERCASE),
    randomCharacter(NUMBERS),
    randomCharacter(SYMBOLS),
  ]

  // La lunghezza aggiuntiva riduce il rischio di collisione e resta compatibile con il validator Laravel.
  while (characters.length < 32) characters.push(randomCharacter(PASSWORD_CHARACTERS))

  // Mescolare i caratteri evita che le classi obbligatorie occupino posizioni prevedibili.
  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1)
    const current = characters[index]
    characters[index] = characters[swapIndex]
    characters[swapIndex] = current
  }

  return characters.join("")
}

export function createStrongPasswords(count: number) {
  const passwords = new Set<string>()

  // Il Set garantisce due credenziali diverse senza conservare valori oltre il processo E2E.
  while (passwords.size < count) passwords.add(createStrongPassword())

  return [...passwords]
}

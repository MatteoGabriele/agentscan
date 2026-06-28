export function formatUsername(username: string): string {
  let decoded = username
  try {
    decoded = decodeURIComponent(username)
  } catch {
    // keep raw input when malformed encoding is provided
  }
  return decoded.trim().toLowerCase().replaceAll(' ', '')
}

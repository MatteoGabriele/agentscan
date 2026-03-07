export function formatUsername(username: string): string {
  return decodeURIComponent(username).trim().toLowerCase().replace(" ", "");
}

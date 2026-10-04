export type AdopterPlatform = 'app' | 'action'

export type AdopterRepository = {
  name: string
  url: string
  stars: number
  avatar: string
  platform: AdopterPlatform
}

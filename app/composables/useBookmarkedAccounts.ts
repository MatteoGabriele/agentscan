import type { GitHubUser } from '@unveil/identity'

export interface BookmarkedAccount {
  login: string
  name: string | null
  avatarUrl: string | null
  bookmarkedAt: number
}

const DB_NAME = 'agentscan'
const DB_VERSION = 1
const STORE_NAME = 'bookmarked-accounts'

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'login' })
        }
      }

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    }).catch((error) => {
      dbPromise = null
      throw error
    })
  }

  return dbPromise
}

// Shared across every instance so all bookmark buttons and the bookmarks
// page agree on state without each re-reading IndexedDB.
const bookmarkedAccounts = ref<BookmarkedAccount[]>([])
const isLoaded = ref(false)
let loadPromise: Promise<void> | null = null

function loadBookmarks(): Promise<void> {
  if (!loadPromise) {
    loadPromise = openDb()
      .then((db) => {
        return new Promise<void>((resolve, reject) => {
          const request = db
            .transaction(STORE_NAME, 'readonly')
            .objectStore(STORE_NAME)
            .getAll()

          request.onsuccess = () => {
            bookmarkedAccounts.value = request.result as BookmarkedAccount[]
            isLoaded.value = true
            resolve()
          }
          request.onerror = () => reject(request.error)
        })
      })
      .catch((error) => {
        loadPromise = null
        bookmarkedAccounts.value = []
        isLoaded.value = true
        throw error
      })
  }

  return loadPromise
}

export function useBookmarkedAccounts() {
  if (import.meta.client) {
    loadBookmarks().catch(() => {})
  }

  const sortedBookmarkedAccounts = computed(() => {
    return [...bookmarkedAccounts.value].sort(
      (a, b) => b.bookmarkedAt - a.bookmarkedAt,
    )
  })

  function isBookmarked(login: string): boolean {
    return bookmarkedAccounts.value.some((account) => account.login === login)
  }

  async function addBookmark(user: GitHubUser): Promise<void> {
    try {
      const db = await openDb()
      const account: BookmarkedAccount = {
        login: user.login,
        name: user.name ?? null,
        avatarUrl: user.avatar_url ?? null,
        bookmarkedAt: Date.now(),
      }

      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        tx.objectStore(STORE_NAME).put(account)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })

      bookmarkedAccounts.value = [
        ...bookmarkedAccounts.value.filter((a) => a.login !== account.login),
        account,
      ]
    } catch (error) {
      console.error('Failed to add bookmark:', error)
    }
  }

  async function removeBookmark(login: string): Promise<void> {
    try {
      const db = await openDb()

      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        tx.objectStore(STORE_NAME).delete(login)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })

      bookmarkedAccounts.value = bookmarkedAccounts.value.filter(
        (account) => account.login !== login,
      )
    } catch (error) {
      console.error('Failed to remove bookmark:', error)
    }
  }

  async function toggleBookmark(user: GitHubUser): Promise<void> {
    if (isBookmarked(user.login)) {
      await removeBookmark(user.login)
      await trackEvent('bookmark_toggle_remove_clicked')
    } else {
      await addBookmark(user)
      await trackEvent('bookmark_toggle_add_clicked')
    }
  }

  return {
    bookmarkedAccounts: sortedBookmarkedAccounts,
    isLoaded,
    isBookmarked,
    toggleBookmark,
    removeBookmark,
  }
}

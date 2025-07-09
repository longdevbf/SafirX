// Request singleton để tránh duplicate API calls
class RequestSingleton {
  private activeRequests = new Map<string, Promise<any>>()
  private lastRequestTime = new Map<string, number>()
  private readonly DEBOUNCE_TIME = 1000 // 1 second debounce

  async request<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const now = Date.now()
    const lastTime = this.lastRequestTime.get(key) || 0
    
    // Debounce: nếu request quá gần nhau, skip
    if (now - lastTime < this.DEBOUNCE_TIME) {
      console.log(`⏭️ Skipping request ${key} (debounced)`)
      // Return empty result để không break UI
      return Promise.resolve([]) as T
    }

    // Nếu đang có request active, return existing promise
    if (this.activeRequests.has(key)) {
      console.log(`♻️ Reusing active request ${key}`)
      return this.activeRequests.get(key)!
    }

    console.log(`🚀 Starting new request ${key}`)
    this.lastRequestTime.set(key, now)

    // Tạo request mới
    const requestPromise = fetcher()
      .finally(() => {
        // Cleanup khi request xong
        this.activeRequests.delete(key)
      })

    this.activeRequests.set(key, requestPromise)
    return requestPromise
  }

  clear() {
    this.activeRequests.clear()
    this.lastRequestTime.clear()
  }
}

export const requestSingleton = new RequestSingleton()
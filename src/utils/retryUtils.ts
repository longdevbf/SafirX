// Utility functions for handling network retries and timeouts

export interface RetryOptions {
  maxRetries: number
  delayMs: number
  backoffMultiplier?: number
  onRetry?: (attemptNumber: number, error: unknown) => void
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const { maxRetries, delayMs, backoffMultiplier = 1.5, onRetry } = options
  
  let lastError: unknown
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      
      if (attempt === maxRetries) {
        throw error
      }
      
      if (onRetry) {
        onRetry(attempt + 1, error)
      }
      
      const delay = delayMs * Math.pow(backoffMultiplier, attempt)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError
}

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutError?: string
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(timeoutError || `Operation timed out after ${timeoutMs}ms`))
    }, timeoutMs)
  })
  
  return Promise.race([promise, timeoutPromise])
}

export function isNetworkError(error: unknown): boolean {
  if (!error) return false

  const errorMessage = (error as Error).message?.toLowerCase() || ''
  const errorName = (error as Error).name?.toLowerCase() || ''

  return (
    errorMessage.includes('failed to fetch') ||
    errorMessage.includes('network') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('connection') ||
    errorName.includes('networkerror') ||
    errorName.includes('timeouterror')
  )
}

export function createNetworkErrorMessage(error: unknown): string {
  if (isNetworkError(error)) {
    return 'Failed to connect to auction contract. Please check your network connection.'
  }
  
  return error as string || 'An unexpected error occurred'
}

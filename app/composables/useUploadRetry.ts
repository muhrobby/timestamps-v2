/**
 * Upload Retry Composable with Exponential Backoff
 * Provides retry mechanism for failed uploads with configurable backoff
 */

interface RetryConfig {
  maxRetries: number;
  initialDelay: number; // ms
  maxDelay: number; // ms
  backoffMultiplier: number;
  retryableStatusCodes: number[];
}

interface UploadResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  attempts: number;
  finalStatusCode?: number;
}

const defaultConfig: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504, 0], // 0 for network errors
};

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(attempt: number, config: RetryConfig): number {
  const exponentialDelay =
    config.initialDelay * Math.pow(config.backoffMultiplier, attempt);
  const cappedDelay = Math.min(exponentialDelay, config.maxDelay);
  // Add jitter (±25%) to prevent thundering herd
  const jitter = cappedDelay * (0.75 + Math.random() * 0.5);
  return Math.floor(jitter);
}

/**
 * Check if error is retryable
 */
function isRetryable(statusCode: number, config: RetryConfig): boolean {
  return config.retryableStatusCodes.includes(statusCode);
}

/**
 * Wait for specified milliseconds
 */
function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useUploadRetry(customConfig?: Partial<RetryConfig>) {
  const config = { ...defaultConfig, ...customConfig };

  const isRetrying = ref(false);
  const currentAttempt = ref(0);
  const lastError = ref<string | null>(null);
  const retryDelay = ref(0);

  /**
   * Upload with retry logic
   */
  async function uploadWithRetry<T>(
    uploadFn: () => Promise<Response>,
    parseResponse?: (response: Response) => Promise<T>
  ): Promise<UploadResult<T>> {
    isRetrying.value = false;
    currentAttempt.value = 0;
    lastError.value = null;
    retryDelay.value = 0;

    let lastStatusCode = 0;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      currentAttempt.value = attempt + 1;

      try {
        const response = await uploadFn();
        lastStatusCode = response.status;

        if (response.ok) {
          const data = parseResponse
            ? await parseResponse(response)
            : ((await response.json()) as T);

          return {
            success: true,
            data,
            attempts: attempt + 1,
            finalStatusCode: response.status,
          };
        }

        // Check if error is retryable
        if (
          !isRetryable(response.status, config) ||
          attempt === config.maxRetries
        ) {
          const errorBody = await response.text();
          let errorMessage: string;
          try {
            const parsed = JSON.parse(errorBody);
            errorMessage =
              parsed.message || parsed.error || `HTTP ${response.status}`;
          } catch {
            errorMessage = errorBody || `HTTP ${response.status}`;
          }

          lastError.value = errorMessage;
          return {
            success: false,
            error: errorMessage,
            attempts: attempt + 1,
            finalStatusCode: response.status,
          };
        }

        // Retryable error - wait and retry
        if (attempt < config.maxRetries) {
          const delay = calculateDelay(attempt, config);
          retryDelay.value = delay;
          isRetrying.value = true;
          lastError.value = `Retry ${attempt + 1}/${
            config.maxRetries
          } in ${Math.ceil(delay / 1000)}s...`;
          await wait(delay);
        }
      } catch (error) {
        // Network error or other exception
        lastStatusCode = 0;
        const errorMessage =
          error instanceof Error ? error.message : "Network error";

        if (attempt === config.maxRetries) {
          lastError.value = errorMessage;
          return {
            success: false,
            error: errorMessage,
            attempts: attempt + 1,
            finalStatusCode: 0,
          };
        }

        // Retry on network errors
        const delay = calculateDelay(attempt, config);
        retryDelay.value = delay;
        isRetrying.value = true;
        lastError.value = `Network error. Retry ${attempt + 1}/${
          config.maxRetries
        } in ${Math.ceil(delay / 1000)}s...`;
        await wait(delay);
      }
    }

    // Should not reach here, but just in case
    return {
      success: false,
      error: lastError.value || "Max retries exceeded",
      attempts: config.maxRetries + 1,
      finalStatusCode: lastStatusCode,
    };
  }

  /**
   * Upload file with retry and progress tracking
   */
  async function uploadFileWithRetry<T>(
    url: string,
    body: FormData | Record<string, any>,
    headers: Record<string, string> = {},
    onProgress?: (progress: number) => void
  ): Promise<UploadResult<T>> {
    return uploadWithRetry<T>(async () => {
      // For simple fetch without progress
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: body instanceof FormData ? body : JSON.stringify(body),
      });

      // Simulate progress for simple fetch
      if (onProgress) {
        onProgress(100);
      }

      return response;
    });
  }

  /**
   * Upload file with XHR for progress tracking
   */
  function uploadFileWithProgress<T>(
    url: string,
    formData: FormData,
    headers: Record<string, string> = {},
    onProgress?: (progress: number) => void,
    onRetry?: (attempt: number, delay: number) => void
  ): Promise<UploadResult<T>> {
    return new Promise((resolve) => {
      let attempt = 0;

      const attemptUpload = () => {
        currentAttempt.value = attempt + 1;

        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable && onProgress) {
            const progress = Math.round((event.loaded / event.total) * 100);
            onProgress(progress);
          }
        });

        xhr.addEventListener("load", async () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText) as T;
              resolve({
                success: true,
                data,
                attempts: attempt + 1,
                finalStatusCode: xhr.status,
              });
            } catch {
              resolve({
                success: true,
                attempts: attempt + 1,
                finalStatusCode: xhr.status,
              });
            }
          } else if (
            isRetryable(xhr.status, config) &&
            attempt < config.maxRetries
          ) {
            // Retry
            attempt++;
            const delay = calculateDelay(attempt - 1, config);
            retryDelay.value = delay;
            isRetrying.value = true;
            lastError.value = `Retry ${attempt}/${config.maxRetries}...`;

            if (onRetry) {
              onRetry(attempt, delay);
            }

            setTimeout(attemptUpload, delay);
          } else {
            // Final failure
            let errorMessage: string;
            try {
              const parsed = JSON.parse(xhr.responseText);
              errorMessage =
                parsed.message || parsed.error || `HTTP ${xhr.status}`;
            } catch {
              errorMessage = xhr.responseText || `HTTP ${xhr.status}`;
            }

            lastError.value = errorMessage;
            resolve({
              success: false,
              error: errorMessage,
              attempts: attempt + 1,
              finalStatusCode: xhr.status,
            });
          }
        });

        xhr.addEventListener("error", () => {
          if (attempt < config.maxRetries) {
            attempt++;
            const delay = calculateDelay(attempt - 1, config);
            retryDelay.value = delay;
            isRetrying.value = true;
            lastError.value = `Network error. Retry ${attempt}/${config.maxRetries}...`;

            if (onRetry) {
              onRetry(attempt, delay);
            }

            setTimeout(attemptUpload, delay);
          } else {
            lastError.value = "Network error";
            resolve({
              success: false,
              error: "Network error after all retries",
              attempts: attempt + 1,
              finalStatusCode: 0,
            });
          }
        });

        xhr.addEventListener("timeout", () => {
          if (attempt < config.maxRetries) {
            attempt++;
            const delay = calculateDelay(attempt - 1, config);
            retryDelay.value = delay;
            isRetrying.value = true;
            lastError.value = `Timeout. Retry ${attempt}/${config.maxRetries}...`;

            if (onRetry) {
              onRetry(attempt, delay);
            }

            setTimeout(attemptUpload, delay);
          } else {
            lastError.value = "Request timeout";
            resolve({
              success: false,
              error: "Request timeout after all retries",
              attempts: attempt + 1,
              finalStatusCode: 0,
            });
          }
        });

        xhr.open("POST", url);
        xhr.timeout = 60000; // 60 second timeout

        // Set headers
        Object.entries(headers).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value);
        });

        xhr.send(formData);
      };

      attemptUpload();
    });
  }

  function reset() {
    isRetrying.value = false;
    currentAttempt.value = 0;
    lastError.value = null;
    retryDelay.value = 0;
  }

  return {
    // State
    isRetrying: readonly(isRetrying),
    currentAttempt: readonly(currentAttempt),
    lastError: readonly(lastError),
    retryDelay: readonly(retryDelay),

    // Methods
    uploadWithRetry,
    uploadFileWithRetry,
    uploadFileWithProgress,
    reset,

    // Config
    config,
  };
}

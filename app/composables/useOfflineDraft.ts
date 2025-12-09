/**
 * Offline Draft Composable
 * Manages draft data storage for offline support using IndexedDB
 */

interface DraftPhoto {
  id: string;
  fileName: string;
  base64Data: string;
  mimeType: string;
  type: "BEFORE" | "AFTER";
  order: number;
  timestamp: string;
}

interface PackingDraft {
  id: string;
  invoiceNumber: string;
  notes: string;
  storeId?: string;
  photos: DraftPhoto[];
  createdAt: string;
  updatedAt: string;
  synced: boolean;
}

const DB_NAME = "packing-drafts";
const DB_VERSION = 1;
const STORE_NAME = "drafts";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error("Failed to open IndexedDB"));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("invoiceNumber", "invoiceNumber", { unique: false });
        store.createIndex("synced", "synced", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
  });
}

export function useOfflineDraft() {
  const drafts = ref<PackingDraft[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const isOnline = ref(true);

  // Check online status
  if (import.meta.client) {
    isOnline.value = navigator.onLine;

    window.addEventListener("online", () => {
      isOnline.value = true;
    });

    window.addEventListener("offline", () => {
      isOnline.value = false;
    });
  }

  /**
   * Convert File to base64 for storage
   */
  async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix if present
        const base64 = result.includes(",") ? result.split(",")[1] : result;
        resolve(base64 || "");
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Convert base64 back to File
   */
  function base64ToFile(
    base64: string,
    fileName: string,
    mimeType: string
  ): File {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });

    return new File([blob], fileName, { type: mimeType });
  }

  /**
   * Save draft to IndexedDB
   */
  async function saveDraft(
    invoiceNumber: string,
    notes: string,
    photos: Array<{
      id: string;
      file: File;
      type: "BEFORE" | "AFTER";
      order: number;
      timestamp?: string;
    }>,
    storeId?: string
  ): Promise<string> {
    isLoading.value = true;
    error.value = null;

    try {
      const db = await openDatabase();

      // Convert photos to storable format
      const draftPhotos: DraftPhoto[] = await Promise.all(
        photos.map(async (photo) => ({
          id: photo.id,
          fileName: photo.file.name,
          base64Data: await fileToBase64(photo.file),
          mimeType: photo.file.type,
          type: photo.type,
          order: photo.order,
          timestamp: photo.timestamp || new Date().toISOString(),
        }))
      );

      const draftId = `draft-${Date.now()}-${Math.random()
        .toString(36)
        .substring(7)}`;
      const now = new Date().toISOString();

      const draft: PackingDraft = {
        id: draftId,
        invoiceNumber,
        notes,
        storeId,
        photos: draftPhotos,
        createdAt: now,
        updatedAt: now,
        synced: false,
      };

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(draft);

        request.onsuccess = () => {
          drafts.value = [
            ...drafts.value.filter((d) => d.id !== draftId),
            draft,
          ];
          resolve(draftId);
        };

        request.onerror = () => {
          reject(new Error("Failed to save draft"));
        };
      });
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Unknown error";
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Load all drafts from IndexedDB
   */
  async function loadDrafts(): Promise<PackingDraft[]> {
    isLoading.value = true;
    error.value = null;

    try {
      const db = await openDatabase();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
          drafts.value = request.result;
          resolve(request.result);
        };

        request.onerror = () => {
          reject(new Error("Failed to load drafts"));
        };
      });
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Unknown error";
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Get a single draft by ID
   */
  async function getDraft(id: string): Promise<PackingDraft | null> {
    try {
      const db = await openDatabase();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onsuccess = () => {
          resolve(request.result || null);
        };

        request.onerror = () => {
          reject(new Error("Failed to get draft"));
        };
      });
    } catch {
      return null;
    }
  }

  /**
   * Delete a draft
   */
  async function deleteDraft(id: string): Promise<void> {
    try {
      const db = await openDatabase();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => {
          drafts.value = drafts.value.filter((d) => d.id !== id);
          resolve();
        };

        request.onerror = () => {
          reject(new Error("Failed to delete draft"));
        };
      });
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Unknown error";
      throw err;
    }
  }

  /**
   * Mark draft as synced
   */
  async function markSynced(id: string): Promise<void> {
    try {
      const draft = await getDraft(id);
      if (!draft) return;

      draft.synced = true;
      draft.updatedAt = new Date().toISOString();

      const db = await openDatabase();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(draft);

        request.onsuccess = () => {
          drafts.value = drafts.value.map((d) => (d.id === id ? draft : d));
          resolve();
        };

        request.onerror = () => {
          reject(new Error("Failed to update draft"));
        };
      });
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Unknown error";
      throw err;
    }
  }

  /**
   * Get unsynced drafts
   */
  async function getUnsyncedDrafts(): Promise<PackingDraft[]> {
    const allDrafts = await loadDrafts();
    return allDrafts.filter((d) => !d.synced);
  }

  /**
   * Convert draft photos back to Files
   */
  function draftPhotosToFiles(draft: PackingDraft): Array<{
    id: string;
    file: File;
    url: string;
    type: "BEFORE" | "AFTER";
    order: number;
    fileName: string;
    timestamp: string;
  }> {
    return draft.photos.map((photo) => {
      const file = base64ToFile(
        photo.base64Data,
        photo.fileName,
        photo.mimeType
      );
      const url = URL.createObjectURL(file);

      return {
        id: photo.id,
        file,
        url,
        type: photo.type,
        order: photo.order,
        fileName: photo.fileName,
        timestamp: photo.timestamp,
      };
    });
  }

  /**
   * Clear all drafts
   */
  async function clearAllDrafts(): Promise<void> {
    try {
      const db = await openDatabase();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => {
          drafts.value = [];
          resolve();
        };

        request.onerror = () => {
          reject(new Error("Failed to clear drafts"));
        };
      });
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Unknown error";
      throw err;
    }
  }

  // Load drafts on mount
  if (import.meta.client) {
    loadDrafts().catch(console.error);
  }

  return {
    // State
    drafts: readonly(drafts),
    isLoading: readonly(isLoading),
    error: readonly(error),
    isOnline: readonly(isOnline),

    // Methods
    saveDraft,
    loadDrafts,
    getDraft,
    deleteDraft,
    markSynced,
    getUnsyncedDrafts,
    draftPhotosToFiles,
    clearAllDrafts,
    fileToBase64,
    base64ToFile,
  };
}

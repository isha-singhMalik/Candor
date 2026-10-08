/**
 * Resume file storage abstraction (server side).
 * MVP behaviour: files are parsed in memory and discarded, so nothing is stored.
 * To keep files later, implement this interface (Vercel Blob, S3, Supabase Storage...) and
 * return it from `getFileStorage()`; the upload route does not need to change.
 */
export interface FileStorageProvider {
  readonly name: string;
  put(key: string, data: Uint8Array, contentType: string): Promise<{ url: string }>;
  delete(key: string): Promise<void>;
}

export class DiscardStorage implements FileStorageProvider {
  readonly name = "none (files are discarded after parsing)";
  async put(): Promise<{ url: string }> { throw new Error("File storage is not configured."); }
  async delete() { /* nothing stored */ }
}

export const getFileStorage = (): FileStorageProvider => new DiscardStorage();

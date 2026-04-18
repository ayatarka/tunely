// IndexedDB wrapper for downloaded songs (offline cache) and library data.
import { openDB, type IDBPDatabase } from "idb";
import type { SaavnSong } from "./saavn";

interface DBSchema {}

const DB_NAME = "tunely";
const DB_VERSION = 1;

let _db: Promise<IDBPDatabase<DBSchema>> | null = null;
function db() {
  if (!_db) {
    _db = openDB<DBSchema>(DB_NAME, DB_VERSION, {
      upgrade(d) {
        if (!d.objectStoreNames.contains("downloads")) d.createObjectStore("downloads", { keyPath: "id" });
        if (!d.objectStoreNames.contains("blobs")) d.createObjectStore("blobs"); // key = songId, val = Blob
        if (!d.objectStoreNames.contains("liked")) d.createObjectStore("liked", { keyPath: "id" });
        if (!d.objectStoreNames.contains("recent")) d.createObjectStore("recent", { keyPath: "id" });
      },
    });
  }
  return _db;
}

export interface DownloadedSong { 
  id: string; song: SaavnSong; size: number; addedAt: number,
 lyrics?: string | null;
  syncedLyrics?: string | null; }

export const idb = {
  async putDownload(song: SaavnSong, blob: Blob, extra?: {
    lyrics?: string | null;
    syncedLyrics?: string | null;
  }) {
    const d = await db();
    const tx = d.transaction(["downloads", "blobs"], "readwrite");
    await tx.objectStore("blobs").put(blob, song.id);
    await tx.objectStore("downloads").put({
  id: song.id,
  song,
  size: blob.size,
  addedAt: Date.now(),
  // ⭐ ADD THESE HERE
  lyrics: extra?.lyrics ?? null,
  syncedLyrics: extra?.syncedLyrics ?? null,
} as any);
  },
  async getBlob(id: string): Promise<Blob | undefined> {
    return (await db()).get("blobs", id);
  },
  async hasDownload(id: string): Promise<boolean> {
    return !!(await (await db()).getKey("downloads", id));
  },
  async listDownloads(): Promise<DownloadedSong[]> {
    return (await (await db()).getAll("downloads")) as DownloadedSong[];
  },
  async removeDownload(id: string) {
    const d = await db();
    const tx = d.transaction(["downloads", "blobs"], "readwrite");
    await tx.objectStore("downloads").delete(id);
    await tx.objectStore("blobs").delete(id);
    await tx.done;
  },

  async toggleLike(song: SaavnSong) {
    const d = await db();
    const exists = await d.get("liked", song.id);
    if (exists) await d.delete("liked", song.id);
    else await d.put("liked", { id: song.id, song, addedAt: Date.now() });
    return !exists;
  },
  async isLiked(id: string) { return !!(await (await db()).getKey("liked", id)); },
  async listLiked(): Promise<{ id: string; song: SaavnSong; addedAt: number }[]> {
    return (await (await db()).getAll("liked")) as any;
  },

  async pushRecent(song: SaavnSong) {
    await (await db()).put("recent", { id: song.id, song, at: Date.now() });
  },
  async listRecent(limit = 20): Promise<{ id: string; song: SaavnSong; at: number }[]> {
    const all = (await (await db()).getAll("recent")) as any[];
    return all.sort((a, b) => b.at - a.at).slice(0, limit);
  },
};

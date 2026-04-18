// Download helpers: cache for offline (IndexedDB) + save to phone (Files app).
import { bestAudio, saavn, type SaavnSong, decodeHtml } from "./saavn";
import { idb } from "./db";

async function realAudioUrl(song: SaavnSong): Promise<string> {
  const raw = bestAudio(song.downloadUrl);
  if (raw.startsWith("saavn-encrypted://") && song.encryptedMediaUrl) {
    return await saavn.resolveAudioUrl(song.encryptedMediaUrl);
  }
  return raw;
}

export async function downloadForOffline(
  song: SaavnSong,
  onProgress?: (p: number) => void
): Promise<void> {
  const url = await realAudioUrl(song);
  if (!url) throw new Error("No audio source for this song");

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);

  let blob: Blob;

  // Stream w/ progress when possible
  const total = Number(res.headers.get("content-length") ?? 0);

  if (res.body && total) {
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      if (value) {
        chunks.push(value);
        received += value.length;
        onProgress?.(received / total);
      }
    }

    blob = new Blob(chunks as BlobPart[], {
      type: res.headers.get("content-type") ?? "audio/mp4",
    });
  } else {
    blob = await res.blob();
  }

  // 🔥 FETCH LYRICS (IMPORTANT PART)
  let lyrics = null;
  let syncedLyrics = null;

  try {
    const l = await saavn.lyrics(song.id);
    lyrics = l?.lyrics || null;
    syncedLyrics = l?.syncedLyrics || null;
  } catch (e) {
    console.log("Lyrics not found");
  }

  // 💾 SAVE EVERYTHING TO OFFLINE DB
  await idb.putDownload(song, blob, {
    lyrics,
    syncedLyrics,
  });
}

export async function saveToDevice(song: SaavnSong) {
  // Pull from offline cache first; otherwise download.
  let blob = await idb.getBlob(song.id);
  if (!blob) {
    const url = await realAudioUrl(song);
    if (!url) throw new Error("No audio source");
    const res = await fetch(url);
    blob = await res.blob();
  }
  const cleanName = `${decodeHtml(song.name)}.m4a`.replace(/[/\\?%*:|"<>]/g, "-");

  // Try the modern File System Access API (desktop Chrome / some Android Chrome)
  // @ts-expect-error - showSaveFilePicker may not exist
  if (window.showSaveFilePicker) {
    try {
      // @ts-expect-error
      const handle = await window.showSaveFilePicker({
        suggestedName: cleanName,
        types: [{ description: "Audio", accept: { "audio/mp4": [".m4a", ".mp4"] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (e) {
      // fall through to anchor download
    }
  }

  // Fallback: trigger a normal browser download (goes to Files app on iOS / Downloads on Android)
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = cleanName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

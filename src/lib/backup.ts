import { idb } from "./db";

export async function exportLibrary() {
  const downloads = await idb.listDownloads();

  const data = [];

  for (const item of downloads) {
    const blob = await idb.getBlob(item.id);

    if (!blob) continue;

    const base64 = await blobToBase64(blob);

    data.push({
  id: item.id,
  song: item.song,
  size: item.size,
  addedAt: item.addedAt,
  lyrics: item.lyrics ?? null,
  syncedLyrics: item.syncedLyrics ?? null,
  audio: base64,
});
  }

  const file = new Blob([JSON.stringify(data)], {
    type: "application/json",
  });

  downloadFile(file, "my-music-backup.tunely.json");
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

function downloadFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const isNative = /iPad|iPhone|iPod|Android/.test(navigator.userAgent);

  // Use Web Share API on mobile (iOS + Android)
  if (isNative && navigator.canShare?.({ files: [new File([blob], filename)] })) {
    const file = new File([blob], filename, { type: blob.type });
    navigator.share({ files: [file], title: filename })
      .finally(() => URL.revokeObjectURL(url));
    return;
  }

  // Fallback for desktop
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
export async function importLibrary(file: File) {
  const text = await file.text();
  const data = JSON.parse(text);

  for (const item of data) {
    const blob = base64ToBlob(item.audio);

    await idb.putDownload(item.song, blob, {
      lyrics: item.lyrics,
      syncedLyrics: item.syncedLyrics,
    });
  }
}

function base64ToBlob(base64: string) {
  const arr = base64.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1] || "audio/mp4";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  return new Blob([u8arr], { type: mime });
}
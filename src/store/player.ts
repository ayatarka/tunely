// Zustand store managing the audio engine, queue, and playback state.
import { create } from "zustand";
import { bestAudio, bestImage, artistsLine, saavn, type SaavnSong, decodeHtml } from "@/lib/saavn";
import { idb } from "@/lib/db";

type RepeatMode = "off" | "all" | "one";

interface PlayerState {
  queue: SaavnSong[];
  index: number;
  current: SaavnSong | null;
  isPlaying: boolean;
  position: number;
  duration: number;
  volume: number;
  shuffle: boolean;
  repeat: RepeatMode;
  expanded: boolean;

  audio: HTMLAudioElement | null;
  init: () => void;

  playQueue: (songs: SaavnSong[], startIndex?: number) => Promise<void>;
  playSong: (song: SaavnSong) => Promise<void>;
  enqueue: (song: SaavnSong) => void;
  removeFromQueue: (idx: number) => void;
  toggle: () => void;
  next: () => Promise<void>;
  prev: () => Promise<void>;
  seek: (sec: number) => void;
  setVolume: (v: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  setExpanded: (v: boolean) => void;
}

export const usePlayer = create<PlayerState>((set, get) => ({
  queue: [],
  index: -1,
  current: null,
  isPlaying: false,
  position: 0,
  duration: 0,
  volume: 1,
  shuffle: false,
  repeat: "off",
  expanded: false,
  audio: null,

  init: () => {
    if (get().audio) return;
    const audio = new Audio();
    audio.preload = "metadata";
    audio.crossOrigin = "anonymous";

    audio.addEventListener("timeupdate", () => set({ position: audio.currentTime }));
    audio.addEventListener("loadedmetadata", () => set({ duration: audio.duration || 0 }));
    audio.addEventListener("durationchange", () => set({ duration: audio.duration || 0 }));
    audio.addEventListener("play", () => set({ isPlaying: true }));
    audio.addEventListener("pause", () => set({ isPlaying: false }));
    audio.addEventListener("ended", () => {
      const { repeat, next } = get();
      if (repeat === "one") {
        audio.currentTime = 0;
        audio.play();
      } else {
        next();
      }
    });

    if ("mediaSession" in navigator) {
  navigator.mediaSession.setActionHandler("play", () => get().toggle());
  navigator.mediaSession.setActionHandler("pause", () => get().toggle());

  // ❌ REMOVE default 10s behavior (THIS IS THE FIX)
  navigator.mediaSession.setActionHandler("seekbackward", null);
  navigator.mediaSession.setActionHandler("seekforward", null);

  // ✅ REAL SONG CONTROL
  navigator.mediaSession.setActionHandler("previoustrack", () => get().prev());
  navigator.mediaSession.setActionHandler("nexttrack", () => get().next());

  navigator.mediaSession.setActionHandler("seekto", (d) => {
    if (d.seekTime != null) audio.currentTime = d.seekTime;
  });
}

    set({ audio });
  },

  playQueue: async (songs, startIndex = 0) => {
    set({ queue: songs, index: startIndex });
    const song = songs[startIndex];
    if (song) await loadAndPlay(song, get, set);
  },
  playSong: async (song) => {
  const { queue } = get();

  const existing = queue.findIndex((s) => s.id === song.id);

  if (existing >= 0) {
    set({ index: existing });
    await loadAndPlay(queue[existing], get, set);
    return;
  }

  // fallback: treat as single-song queue
  const newQueue = [song];

  set({ queue: newQueue, index: 0 });
  await loadAndPlay(song, get, set);
},
  enqueue: (song) => {
    set((s) => ({ queue: [...s.queue, song] }));
  },
  removeFromQueue: (idx) => {
    set((s) => {
      const q = s.queue.filter((_, i) => i !== idx);
      let newIndex = s.index;
      if (idx < s.index) newIndex = s.index - 1;
      return { queue: q, index: newIndex };
    });
  },
  toggle: () => {
    const a = get().audio;
    if (!a || !get().current) return;
    if (a.paused) a.play(); else a.pause();
  },
  next: async () => {
  const { queue, index, shuffle } = get();
  if (!queue.length) return;

  let nextIdx: number;

  if (shuffle) {
    nextIdx = Math.floor(Math.random() * queue.length);
  } else {
    // ✅ LOOP forward
    nextIdx = (index + 1) % queue.length;
  }

  set({ index: nextIdx });
  await loadAndPlay(queue[nextIdx], get, set);
},
  prev: async () => {
  const { queue, index, audio } = get();
  if (!queue.length || !audio) return;

  // if user is in middle of song → restart it
  if (audio.currentTime > 3) {
    audio.currentTime = 0;
    return;
  }

  // ✅ LOOP backward
  const prevIdx = (index - 1 + queue.length) % queue.length;

  set({ index: prevIdx });
  await loadAndPlay(queue[prevIdx], get, set);
},
  seek: (sec) => {
    const a = get().audio; if (a) a.currentTime = sec;
  },
  setVolume: (v) => {
    const a = get().audio; if (a) a.volume = v;
    set({ volume: v });
  },
  toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),
  cycleRepeat: () => set((s) => ({ repeat: s.repeat === "off" ? "all" : s.repeat === "all" ? "one" : "off" })),
  setExpanded: (v) => set({ expanded: v }),
}));

async function loadAndPlay(song: SaavnSong, get: () => PlayerState, set: (s: Partial<PlayerState>) => void) {
  const audio = get().audio!;
  set({ current: song, position: 0, duration: 0 });

  // Try local downloaded blob first
  let src = "";
  try {
    const blob = await idb.getBlob(song.id);
    if (blob) src = URL.createObjectURL(blob);
  } catch { /* ignore */ }
  if (!src) {
    const raw = bestAudio(song.downloadUrl);
    if (raw.startsWith("saavn-encrypted://") && song.encryptedMediaUrl) {
      try {
        src = await saavn.resolveAudioUrl(song.encryptedMediaUrl);
      } catch (e) {
        console.warn("Could not resolve audio URL", e);
      }
    } else {
      src = raw;
    }
  }

  audio.src = src;
  try {
    await audio.play();
  } catch (e) {
    console.warn("Autoplay blocked:", e);
  }

  // Save to recent
  idb.pushRecent(song).catch(() => {});

  // Media Session metadata for lock-screen controls
  if ("mediaSession" in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: decodeHtml(song.name),
      artist: artistsLine(song),
      album: decodeHtml(song.album?.name ?? ""),
      artwork: [
        { src: bestImage(song.image), sizes: "500x500", type: "image/jpeg" },
      ],
    });
  }
}

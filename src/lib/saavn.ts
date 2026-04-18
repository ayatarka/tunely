// JioSaavn API wrapper using a public, CORS-enabled mirror that returns
// direct downloadable audio URLs (no decryption / proxy needed).

const HOST = "https://jiosaavn-api-privatecvc2.vercel.app";

async function call<T = any>(path: string, params: Record<string, string | number> = {}): Promise<T> {
  const url = new URL(`${HOST}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Saavn ${res.status}`);
  const json = (await res.json()) as { status?: string; data?: T };
  return (json?.data ?? ({} as T));
}

// --- Public types -----------------------------------------------------------

export interface SaavnImage { quality: string; url: string }
export interface SaavnDownloadUrl { quality: string; url: string }
export interface SaavnArtistMini { id: string; name: string; image?: SaavnImage[]; type?: string; role?: string }
export interface SaavnArtistsBlock { primary?: SaavnArtistMini[]; featured?: SaavnArtistMini[]; all?: SaavnArtistMini[] }

export interface SaavnSong {
  id: string;
  name: string;
  type: string;
  duration?: number;
  label?: string;
  language?: string;
  year?: string;
  playCount?: number;
  image: SaavnImage[];
  downloadUrl: SaavnDownloadUrl[];
  encryptedMediaUrl?: string;
  album?: { id?: string; name?: string; url?: string };
  artists?: SaavnArtistsBlock;
}

export interface SaavnAlbum {
  id: string;
  name: string;
  description?: string;
  year?: string;
  language?: string;
  songCount?: number;
  image: SaavnImage[];
  artists?: SaavnArtistsBlock;
  songs?: SaavnSong[];
}

export interface SaavnArtist {
  id: string;
  name: string;
  image: SaavnImage[];
  followerCount?: number;
  fanCount?: string;
  bio?: { title?: string; text?: string }[] | string;
  topSongs?: SaavnSong[];
  topAlbums?: SaavnAlbum[];
}

// --- Helpers ----------------------------------------------------------------

function imageSet(raw: any): SaavnImage[] {
  if (!raw) return [];
  // Already-shaped array of {quality, link|url}
  if (Array.isArray(raw)) {
    return raw
      .filter((i) => i && (i.link || i.url))
      .map((i) => ({ quality: i.quality, url: (i.link ?? i.url).replace(/^http:\/\//, "https://") }));
  }
  // Plain string URL — synthesize the three usual sizes
  const base = String(raw).replace(/^http:\/\//, "https://");
  return [
    { quality: "50x50", url: base.replace(/(150x150|500x500)/, "50x50") },
    { quality: "150x150", url: base.replace(/(50x50|500x500)/, "150x150") },
    { quality: "500x500", url: base.replace(/(50x50|150x150)/, "500x500") },
  ];
}

function downloadSet(raw: any): SaavnDownloadUrl[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((d) => d && (d.link || d.url))
    .map((d) => ({ quality: d.quality, url: (d.link ?? d.url).replace(/^http:\/\//, "https://") }));
}

function splitArtistList(s?: string, ids?: string): SaavnArtistMini[] {
  if (!s) return [];
  const names = s.split(",").map((x) => x.trim()).filter(Boolean);
  const idList = (ids ?? "").split(",").map((x) => x.trim());
  return names.map((name, i) => ({ id: idList[i] ?? name, name }));
}

function mapArtistsFromAlbum(a: any): SaavnArtistsBlock {
  const toMini = (x: any): SaavnArtistMini => ({
    id: x.id,
    name: x.name,
    role: x.role,
    type: x.type,
    image: imageSet(x.image),
  });
  if (Array.isArray(a?.primaryArtists)) {
    return {
      primary: a.primaryArtists.map(toMini),
      featured: (a.featuredArtists ?? []).map(toMini),
      all: (a.artists ?? []).map(toMini),
    };
  }
  // Album details endpoint returns plain strings
  return {
    primary: splitArtistList(a?.primaryArtists, a?.primaryArtistsId),
    featured: [],
    all: [],
  };
}

function mapSong(s: any): SaavnSong {
  return {
    id: String(s.id),
    name: s.name ?? s.title ?? "Untitled",
    type: "song",
    duration: Number(s.duration) || undefined,
    label: s.label,
    language: s.language,
    year: s.year,
    playCount: Number(s.playCount) || undefined,
    image: imageSet(s.image),
    downloadUrl: downloadSet(s.downloadUrl),
    album: {
      id: s.album?.id,
      name: s.album?.name,
      url: s.album?.url,
    },
    artists: {
      primary: splitArtistList(s.primaryArtists, s.primaryArtistsId),
      featured: splitArtistList(s.featuredArtists, s.featuredArtistsId),
      all: splitArtistList(
        [s.primaryArtists, s.featuredArtists].filter(Boolean).join(","),
        [s.primaryArtistsId, s.featuredArtistsId].filter(Boolean).join(","),
      ),
    },
  };
}

function mapAlbumLite(a: any): SaavnAlbum {
  return {
    id: String(a.id),
    name: a.name ?? a.title ?? "Untitled",
    year: a.year,
    language: a.language,
    image: imageSet(a.image),
    songCount: Number(a.songCount) || undefined,
    artists: mapArtistsFromAlbum(a),
  };
}

function mapArtistLite(a: any): SaavnArtist {
  return {
    id: String(a.id ?? a.artistid),
    name: a.name ?? a.title,
    image: imageSet(a.image),
  };
}

// --- API surface ------------------------------------------------------------

export const saavn = {
  searchAll: async (q: string) => {
    const [songs, albums, artists] = await Promise.all([
      saavn.searchSongs(q, 10),
      saavn.searchAlbums(q, 10),
      saavn.searchArtists(q, 10),
    ]);
    return {
      songs: { results: songs.results },
      albums: { results: albums.results },
      artists: { results: artists.results },
    };
  },
  searchSongs: async (q: string, limit = 30) => {
    const d = await call<any>("/search/songs", { query: q, limit });
    return { results: (d?.results ?? []).map(mapSong) as SaavnSong[], total: d?.total ?? 0 };
  },
  searchAlbums: async (q: string, limit = 20) => {
    const d = await call<any>("/search/albums", { query: q, limit });
    return { results: (d?.results ?? []).map(mapAlbumLite) as SaavnAlbum[], total: d?.total ?? 0 };
  },
  searchArtists: async (q: string, limit = 20) => {
    const d = await call<any>("/search/artists", { query: q, limit });
    return { results: (d?.results ?? []).map(mapArtistLite) as SaavnArtist[], total: d?.total ?? 0 };
  },
  song: async (id: string) => {
    const d = await call<any>("/songs", { id });
    const list = Array.isArray(d) ? d : (d?.songs ?? []);
    return { songs: list.map(mapSong) as SaavnSong[] };
  },
  album: async (id: string): Promise<SaavnAlbum> => {
    const d = await call<any>("/albums", { id });
    const songs = (d?.songs ?? []).map(mapSong) as SaavnSong[];
    return {
      id: String(d.id),
      name: d.name,
      year: d.year,
      language: d.language,
      songCount: Number(d.songCount) || songs.length,
      image: imageSet(d.image),
      artists: mapArtistsFromAlbum(d),
      songs,
    };
  },
  artist: async (id: string): Promise<SaavnArtist> => {
    const d = await call<any>("/artists", { id });
    let topSongs: SaavnSong[] = [];
    try {
      const songsData = await call<any>(`/artists/${id}/songs`);
      const list = Array.isArray(songsData) ? songsData : (songsData?.songs ?? []);
      topSongs = list.map(mapSong);
    } catch { /* ignore */ }
    return {
      id: String(d.id ?? id),
      name: d.name,
      image: imageSet(d.image),
      followerCount: Number(d.followerCount) || undefined,
      fanCount: d.fanCount,
      bio: typeof d.bio === "string"
        ? safeBio(d.bio)
        : Array.isArray(d.bio) && d.bio.length
          ? d.bio.map((b: any) => `${b.title ? b.title + "\n\n" : ""}${b.text ?? ""}`).join("\n\n")
          : "",
      topSongs,
      topAlbums: [],
    };
  },
  artistSongs: async (id: string, page = 0) => {
    try {
      const d = await call<any>(`/artists/${id}/songs`, { page });
      const list = Array.isArray(d) ? d : (d?.songs ?? d?.results ?? []);
      return { songs: list.map(mapSong) as SaavnSong[], total: list.length };
    } catch {
      return { songs: [] as SaavnSong[], total: 0 };
    }
  },
 lyrics: async (songId: string) => {
  try {
    // 1. get song info from Saavn first
    const d = await call<any>("/songs", { id: songId });
    const song = Array.isArray(d) ? d[0] : d?.songs?.[0];

    if (!song) return null;

    const artist =
      song.primaryArtists ||
      song.artists?.primary?.map((a: any) => a.name).join(", ") ||
      "";

    const title = song.name;

    // 2. try LRCLIB first (better lyrics)
    const lrc = await fetchLrcLibLyrics(artist, title);

    if (lrc?.lyrics) {
      return {
        lyrics: lrc.lyrics,
        syncedLyrics: lrc.syncedLyrics ?? null,
        source: "lrclib",
      };
    }

    // 3. fallback to Saavn lyrics
    const saavnLyrics = await call<any>("/lyrics", { id: songId });

    if (saavnLyrics?.lyrics) {
      return {
  lyrics: saavnLyrics.lyrics,
  syncedLyrics: saavnLyrics.syncedLyrics ?? null,
  source: "saavn",
};
    }

    return null;
  } catch {
    return null;
  }
},
  // Kept for backward compatibility; new API exposes direct URLs already.
  resolveAudioUrl: async (encrypted: string) => encrypted,
};

function safeBio(s: string): string {
  try {
    const arr = JSON.parse(s);
    if (Array.isArray(arr)) return arr.map((b: any) => `${b.title ? b.title + "\n\n" : ""}${b.text ?? ""}`).join("\n\n");
    return s;
  } catch { return s; }
}
// --- Lyrics helper (LRCLIB) -----------------------------------------------

async function fetchLrcLibLyrics(artist: string, track: string) {
  const url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(
    artist
  )}&track_name=${encodeURIComponent(track)}`;

  const res = await fetch(url);
  if (!res.ok) return null;

  const data = await res.json();

  // ✅ LRCLIB uses plainLyrics (NOT "lyrics")
  const lyrics = data?.plainLyrics || data?.lyrics;

  if (!lyrics) return null;

  return {
    lyrics,
    syncedLyrics: data?.syncedLyrics || null,
    source: "lrclib",
  };
}
// --- Display helpers --------------------------------------------------------

export function bestImage(images?: SaavnImage[]): string {
  if (!images?.length) return "";
  const big = images.find((i) => i.quality?.includes("500")) ?? images[images.length - 1];
  return big.url;
}

export function bestAudio(urls?: SaavnDownloadUrl[]): string {
  if (!urls?.length) return "";
  const hi =
    urls.find((u) => u.quality === "320kbps") ??
    urls.find((u) => u.quality === "160kbps") ??
    urls.find((u) => u.quality === "96kbps") ??
    urls[urls.length - 1];
  return hi.url;
}

export function decodeHtml(s?: string): string {
  if (!s) return "";
  return s
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export function artistsLine(s: SaavnSong | SaavnAlbum): string {
  const list = s.artists?.primary?.length ? s.artists.primary : s.artists?.all ?? [];
  return list.map((a) => decodeHtml(a.name)).join(", ");
}

export function fmtTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

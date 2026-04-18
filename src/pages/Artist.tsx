import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Play } from "lucide-react";
import { saavn, type SaavnAlbum, type SaavnArtist, type SaavnSong, bestImage, decodeHtml } from "@/lib/saavn";
import { SongRow } from "@/components/SongRow";
import { AlbumCard } from "@/components/AlbumCard";
import { usePlayer } from "@/store/player";

export default function Artist() {
  const { id } = useParams();
  const [artist, setArtist] = useState<SaavnArtist | null>(null);
  const [songs, setSongs] = useState<SaavnSong[]>([]);
  const [albums, setAlbums] = useState<SaavnAlbum[]>([]);
  const [section, setSection] = useState<"topSongs" | "albums" | "about">("topSongs");
  const [albumSubSection, setAlbumSubSection] = useState<"albums" | "eps">("albums");
  const playQueue = usePlayer((s) => s.playQueue);

  useEffect(() => {
    if (!id) return;
    saavn.artist(id).then(async (a) => {
      setArtist(a);
      let top = a.topSongs ?? [];
      // Fallback: many English artist pages return empty topSongs.
      if (top.length === 0 && a.name) {
        try {
          const r = await saavn.searchSongs(a.name, 30);
          top = r.results;
        } catch {}
      }
      setSongs(top);

      if (a.topAlbums && a.topAlbums.length > 0) {
        setAlbums(a.topAlbums);
      } else if (a.name) {
        try {
          const albumSearch = await saavn.searchAlbums(a.name, 20);
          setAlbums(albumSearch.results);
        } catch {
          setAlbums([]);
        }
      } else {
        setAlbums([]);
      }
    });
  }, [id]);

  if (!artist) return <div className="p-6 text-muted-foreground">Loading…</div>;
  const cover = bestImage(artist.image);

  const sortByYear = (a: SaavnAlbum[]) => [...a].sort((a, b) => {
    const yearA = Number(a.year) || 0;
    const yearB = Number(b.year) || 0;
    return yearB - yearA; // Newest first
  });

  const allAlbums = sortByYear(albums.filter((a) => (a.songCount ?? 0) > 6));
  const allEps = sortByYear(albums.filter((a) => (a.songCount ?? 0) <= 6 && (a.songCount ?? 0) > 0));

  return (
    <div className="pb-4">
      <div className="relative h-64 w-full overflow-hidden">
        {cover && <img src={cover} alt="" className="h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background" />
        <div className="absolute bottom-3 left-4 right-4">
          <h1 className="text-3xl font-bold drop-shadow-lg">{decodeHtml(artist.name)}</h1>
          {artist.fanCount && <p className="text-xs text-muted-foreground">{Number(artist.fanCount).toLocaleString()} fans</p>}
        </div>
      </div>

      <div className="px-4 pt-4">
        <button
          onClick={() => songs.length && playQueue(songs, 0)}
          className="flex items-center gap-2 rounded-full bg-primary px-6 py-2 font-bold text-primary-foreground"
        >
          <Play className="h-4 w-4" fill="currentColor" /> Play
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 px-4">
        <button
          type="button"
          onClick={() => setSection("topSongs")}
          className={
            section === "topSongs"
              ? "rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              : "rounded-full bg-surface-2 px-4 py-2 text-sm text-muted-foreground hover:bg-surface-3"
          }
        >
          Top songs
        </button>
        <button
          type="button"
          onClick={() => setSection("albums")}
          className={
            section === "albums"
              ? "rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              : "rounded-full bg-surface-2 px-4 py-2 text-sm text-muted-foreground hover:bg-surface-3"
          }
        >
          Albums & EPs
        </button>
        <button
          type="button"
          onClick={() => setSection("about")}
          className={
            section === "about"
              ? "rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              : "rounded-full bg-surface-2 px-4 py-2 text-sm text-muted-foreground hover:bg-surface-3"
          }
        >
          About
        </button>
      </div>

      {section === "topSongs" && songs.length > 0 && (
        <section className="px-2 pt-4">
          <h2 className="mb-2 px-2 text-lg font-bold">Top songs</h2>
          <div className="space-y-1">
            {songs.map((s, i) => <SongRow key={s.id} song={s} index={i} queue={songs} showAlbum />)}
          </div>
        </section>
      )}

      {section === "albums" && (allAlbums.length > 0 || allEps.length > 0) && (
        <section className="px-4 pt-6">
          <h2 className="mb-3 text-lg font-bold">Albums & EPs</h2>
          
          <div className="mb-4 flex gap-2">
            <button
              type="button"
              onClick={() => setAlbumSubSection("albums")}
              className={
                albumSubSection === "albums"
                  ? "rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                  : "rounded-full bg-surface-2 px-4 py-2 text-sm text-muted-foreground hover:bg-surface-3"
              }
            >
              Albums
            </button>
            <button
              type="button"
              onClick={() => setAlbumSubSection("eps")}
              className={
                albumSubSection === "eps"
                  ? "rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                  : "rounded-full bg-surface-2 px-4 py-2 text-sm text-muted-foreground hover:bg-surface-3"
              }
            >
              EPs
            </button>
          </div>

          {albumSubSection === "albums" && allAlbums.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {allAlbums.map((a) => <AlbumCard key={a.id} album={a} />)}
            </div>
          )}

          {albumSubSection === "eps" && allEps.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {allEps.map((a) => <AlbumCard key={a.id} album={a} />)}
            </div>
          )}

          {albumSubSection === "albums" && allAlbums.length === 0 && (
            <p className="text-sm text-muted-foreground">No albums found</p>
          )}

          {albumSubSection === "eps" && allEps.length === 0 && (
            <p className="text-sm text-muted-foreground">No EPs found</p>
          )}
        </section>
      )}

      {section === "about" && typeof artist.bio === "string" && artist.bio && (
        <section className="px-4 pt-6">
          <h2 className="mb-2 text-lg font-bold">About</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-line">{artist.bio}</p>
        </section>
      )}
    </div>
  );
}

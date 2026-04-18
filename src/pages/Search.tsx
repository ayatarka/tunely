import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search as SearchIcon, X } from "lucide-react";
import { saavn, type SaavnSong, type SaavnAlbum, type SaavnArtist } from "@/lib/saavn";
import { SongRow } from "@/components/SongRow";
import { AlbumCard } from "@/components/AlbumCard";
import { ArtistCard } from "@/components/ArtistCard";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function Search() {
  const [params, setParams] = useSearchParams();
  const initial = params.get("q") ?? "";
  const [q, setQ] = useState(initial);
  const [debounced, setDebounced] = useState(initial);
  const [songs, setSongs] = useState<SaavnSong[]>([]);
  const [albums, setAlbums] = useState<SaavnAlbum[]>([]);
  const [artists, setArtists] = useState<SaavnArtist[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (!debounced) { setSongs([]); setAlbums([]); setArtists([]); return; }
    setParams({ q: debounced }, { replace: true });
    setLoading(true);
    Promise.all([
      saavn.searchSongs(debounced, 30),
      saavn.searchAlbums(debounced, 20),
      saavn.searchArtists(debounced, 20),
    ])
      .then(([s, a, ar]) => {
        setSongs(s.results ?? []);
        setAlbums(a.results ?? []);
        setArtists(ar.results ?? []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [debounced, setParams]);

  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 bg-background p-4">
        <h1 className="mb-3 text-2xl font-bold">Search</h1>
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Songs, albums, artists"
            className="w-full rounded-md bg-surface-2 py-3 pl-10 pr-10 text-sm outline-none focus:ring-2 focus:ring-primary"
            autoFocus={!initial}
          />
          {q && (
            <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {!debounced ? (
        <div className="p-6 text-center text-muted-foreground">Try Harry Styles, Rihanna, Drake…</div>
      ) : (
        <Tabs defaultValue="songs" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="mx-4 grid w-auto grid-cols-3 bg-surface-2">
            <TabsTrigger value="songs">Songs</TabsTrigger>
            <TabsTrigger value="albums">Albums</TabsTrigger>
            <TabsTrigger value="artists">Artists</TabsTrigger>
          </TabsList>
          <div className="flex-1 overflow-y-auto px-4 pt-3 pb-4">
            <TabsContent value="songs" className="m-0 space-y-1">
              {loading && <div className="text-sm text-muted-foreground p-3">Searching…</div>}
              {songs.map((s, i) => (
                <SongRow key={s.id} song={s} index={i} queue={songs} showAlbum />
              ))}
            </TabsContent>
            <TabsContent value="albums" className="m-0">
              <div className="grid grid-cols-2 gap-3">
                {albums.map((a) => <AlbumCard key={a.id} album={a} />)}
              </div>
            </TabsContent>
            <TabsContent value="artists" className="m-0">
              <div className="grid grid-cols-3 gap-3">
                {artists.map((a) => <ArtistCard key={a.id} artist={a} />)}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      )}
    </div>
  );
}

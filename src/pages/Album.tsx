import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Play, Shuffle } from "lucide-react";
import { saavn, type SaavnAlbum, bestImage, decodeHtml, artistsLine } from "@/lib/saavn";
import { SongRow } from "@/components/SongRow";
import { usePlayer } from "@/store/player";

export default function Album() {
  const { id } = useParams();
  const [album, setAlbum] = useState<SaavnAlbum | null>(null);
  const playQueue = usePlayer((s) => s.playQueue);
  const toggleShuffle = usePlayer((s) => s.toggleShuffle);
  const shuffle = usePlayer((s) => s.shuffle);

  useEffect(() => { if (id) saavn.album(id).then(setAlbum); }, [id]);
  if (!album) return <div className="p-6 text-muted-foreground">Loading…</div>;

  const songs = album.songs ?? [];

  return (
    <div className="pb-4">
      <div className="bg-gradient-hero p-6 pt-8 text-center">
        <div className="mx-auto h-44 w-44 overflow-hidden rounded-lg bg-surface-2 shadow-card">
          {bestImage(album.image) && <img src={bestImage(album.image)} alt="" className="h-full w-full object-cover" />}
        </div>
        <h1 className="mt-4 text-2xl font-bold">{decodeHtml(album.name)}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{artistsLine(album)} • {album.year}</p>
      </div>

      <div className="flex gap-3 px-4 py-4">
        <button
          onClick={() => playQueue(songs, 0)}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary py-3 font-bold text-primary-foreground"
        >
          <Play className="h-4 w-4" fill="currentColor" /> Play
        </button>
        <button
          onClick={() => { if (!shuffle) toggleShuffle(); playQueue(songs, Math.floor(Math.random() * songs.length)); }}
          className="flex items-center justify-center rounded-full bg-surface-2 px-5"
        >
          <Shuffle className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-1 px-2">
        {songs.map((s, i) => <SongRow key={s.id} song={s} index={i} queue={songs} />)}
      </div>
    </div>
  );
}

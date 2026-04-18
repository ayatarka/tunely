import { useEffect, useState } from "react";
import { Heart, Download as DLIcon, Trash2 } from "lucide-react";
import { idb, type DownloadedSong } from "@/lib/db";
import { SongRow } from "@/components/SongRow";
import type { SaavnSong } from "@/lib/saavn";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { artistsLine, bestImage, decodeHtml } from "@/lib/saavn";
import { usePlayer } from "@/store/player";
import { toast } from "sonner";
import { exportLibrary, importLibrary } from "@/lib/backup";

export default function Library() {
  const [liked, setLiked] = useState<SaavnSong[]>([]);
  const [downloads, setDownloads] = useState<DownloadedSong[]>([]);
  const playSong = usePlayer((s) => s.playSong);
const playQueue = usePlayer((s) => s.playQueue);

  const refresh = async () => {
    const l = await idb.listLiked(); setLiked(l.map((x) => x.song));
    setDownloads(await idb.listDownloads());
  };
  useEffect(() => { refresh(); }, []);

  const remove = async (id: string) => { await idb.removeDownload(id); refresh(); toast.success("Removed"); };
  const shuffleArray = (arr) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};
const sortedLiked = [...liked].sort((a, b) =>
  a.name.localeCompare(b.name)
);
const shuffleLiked = () => {
  if (liked.length === 0) return;
  const shuffled = shuffleArray(liked);
  playQueue(shuffled, 0);
};
const shuffleDownloads = () => {
  if (downloads.length === 0) return;
  const songs = downloads.map(d => d.song);
  const shuffled = shuffleArray(songs);
  playQueue(shuffled, 0);
};

  return (
  <div className="p-4 pb-4">
    <h1 className="mb-4 text-2xl font-bold">Your Library</h1>

    {/* ⭐ ADD THIS HERE */}
    <div className="flex gap-3 mb-4">
      <button
        onClick={exportLibrary}
        className="px-3 py-2 bg-green-600 text-white rounded"
      >
        Export Downloads
      </button>

      <label className="px-3 py-2 bg-blue-600 text-white rounded cursor-pointer">
        Import Downloads
        <input
          type="file"
          accept=".tunely.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) importLibrary(file);
          }}
        />
      </label>
    </div>

    <Tabs defaultValue="liked">
        <TabsList className="grid w-full grid-cols-2 bg-surface-2">
          <TabsTrigger value="liked">
            <Heart className="h-4 w-4 mr-1" /> Liked
             </TabsTrigger>
          <TabsTrigger value="downloads">
            <DLIcon className="h-4 w-4 mr-1" /> Downloads
          </TabsTrigger>
        </TabsList>
        <TabsContent value="liked" className="mt-4 space-y-1">
          <button
              onClick={shuffleLiked}
              className="mb-2 px-3 py-1 text-sm bg-surface-2 rounded-md"
            >
               🔀 Shuffle
            </button>
          {liked.length === 0 && <p className="text-sm text-muted-foreground p-4 text-center">Tap the heart on songs to save them here.</p>}
          {sortedLiked.map((s, i) => (
  <SongRow
    key={s.id}
    song={s}
    index={i}
    queue={sortedLiked}
    onPlay={() => playQueue(sortedLiked, i)} // 👈 ADD THIS
  />
))}
        </TabsContent>
        <TabsContent value="downloads" className="mt-4 space-y-1">
          <button
            onClick={shuffleDownloads}
            className="mb-2 px-3 py-1 text-sm bg-surface-2 rounded-md"
          >
            🔀 Shuffle
          </button>
          {downloads.length === 0 && <p className="text-sm text-muted-foreground p-4 text-center">Downloaded songs play offline.</p>}
          {[...downloads]
  .sort((a, b) => a.song.name.localeCompare(b.song.name))
  .map((d) => (
            <div key={d.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-surface-2">
              <button onClick={() => {
                const songs = downloads.map(d => d.song);
                const index = songs.findIndex(s => s.id === d.song.id);
                playQueue(songs, index);
              }} className="flex flex-1 items-center gap-3 min-w-0">
                <div className="h-12 w-12 overflow-hidden rounded-md bg-surface-3">
                  <img src={bestImage(d.song.image)} alt="" className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <div className="truncate text-sm font-medium">{decodeHtml(d.song.name)}</div>
                  <div className="truncate text-xs text-muted-foreground">{artistsLine(d.song)} • {(d.size / 1024 / 1024).toFixed(1)} MB</div>
                </div>
              </button>
              <button onClick={() => remove(d.id)} className="p-2 text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

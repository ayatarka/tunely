import { Link } from "react-router-dom";
import { CheckCircle2, Download, Heart, Pause, Play } from "lucide-react";
import { artistsLine, bestImage, decodeHtml, type SaavnSong } from "@/lib/saavn";
import { usePlayer } from "@/store/player";
import { downloadForOffline } from "@/lib/downloads";
import { idb } from "@/lib/db";
import { useEffect, useState, type MouseEvent } from "react";
import { cn } from "@/lib/utils";

interface Props {
  song: SaavnSong;
  index?: number;
  queue?: SaavnSong[];
  showAlbum?: boolean;
  onPlay?: () => void;   // ✅ ADD THIS
}

export function SongRow({ song, index, queue, showAlbum, onPlay }: Props) {
  const current = usePlayer((s) => s.current);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const playQueue = usePlayer((s) => s.playQueue);
  const playSong = usePlayer((s) => s.playSong);
  const toggle = usePlayer((s) => s.toggle);
  const isCurrent = current?.id === song.id;
  const [liked, setLiked] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    idb.isLiked(song.id).then(setLiked);
    idb.hasDownload(song.id).then(setDownloaded);
  }, [song.id]);

  const handlePlay = () => {
  if (onPlay) {
    onPlay();
    return;
  }

  if (isCurrent) {
    toggle();
    return;
  }

  if (queue && index != null) playQueue(queue, index);
  else playSong(song);
};

  const handleDownload = async (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (downloaded || downloading) return;
    setDownloading(true);

    try {
      await downloadForOffline(song, () => {});
      setDownloaded(true);
    } catch (error) {
      console.error("Download failed", error);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      onClick={handlePlay}
      className={cn(
        "group flex items-center gap-3 rounded-lg p-2 transition-colors cursor-pointer hover:bg-surface-2 active:bg-surface-3",
        isCurrent && "bg-surface-2",
      )}
    >
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-surface-3">
        {bestImage(song.image) && (
          <img src={bestImage(song.image)} alt={decodeHtml(song.name)} className="h-full w-full object-cover" loading="lazy" />
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
          {isCurrent && isPlaying
            ? <Pause className="h-5 w-5 text-white" fill="white" />
            : <Play className="h-5 w-5 text-white" fill="white" />}
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className={cn("truncate text-sm font-medium", isCurrent && "text-primary")}>{decodeHtml(song.name)}</div>
        <div className="truncate text-xs text-muted-foreground">
          {artistsLine(song)}
          {showAlbum && song.album?.name ? ` • ${decodeHtml(song.album.name)}` : ""}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleDownload}
          className={cn(
            "p-2 text-muted-foreground hover:text-primary",
            downloaded && "text-primary",
          )}
          aria-label={downloaded ? "Downloaded" : downloading ? "Downloading" : "Download"}
        >
          {downloaded
            ? <CheckCircle2 className="h-4 w-4" />
            : <Download className="h-4 w-4" />}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); idb.toggleLike(song).then(setLiked); }}
          className="p-2 text-muted-foreground hover:text-primary"
          aria-label={liked ? "Unlike" : "Like"}
        >
          <Heart className="h-4 w-4" fill={liked ? "currentColor" : "none"} />
        </button>
      </div>
    </div>
  );
}

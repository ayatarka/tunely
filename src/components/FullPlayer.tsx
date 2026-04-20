import { useEffect, useState } from "react";
import {
  ChevronDown, Pause, Play, SkipBack, SkipForward, Shuffle, Repeat, Repeat1,
  Heart, Download, ListMusic, Mic2, Share2, MoreHorizontal,
} from "lucide-react";
import { usePlayer } from "@/store/player";
import { artistsLine, bestImage, decodeHtml, fmtTime, saavn } from "@/lib/saavn";
import { idb } from "@/lib/db";
import { downloadForOffline, saveToDevice } from "@/lib/downloads";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

export function FullPlayer() {
  const expanded = usePlayer((s) => s.expanded);
  const setExpanded = usePlayer((s) => s.setExpanded);
  const current = usePlayer((s) => s.current);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const toggle = usePlayer((s) => s.toggle);
  const next = usePlayer((s) => s.next);
  const prev = usePlayer((s) => s.prev);
  const seek = usePlayer((s) => s.seek);
  const position = usePlayer((s) => s.position);
  const duration = usePlayer((s) => s.duration);
  const shuffle = usePlayer((s) => s.shuffle);
  const repeat = usePlayer((s) => s.repeat);
  const toggleShuffle = usePlayer((s) => s.toggleShuffle);
  const cycleRepeat = usePlayer((s) => s.cycleRepeat);
  const queue = usePlayer((s) => s.queue);
  const idx = usePlayer((s) => s.index);
  const removeFromQueue = usePlayer((s) => s.removeFromQueue);

  const [liked, setLiked] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showLyrics, setShowLyrics] = useState(false);
  const [lyrics, setLyrics] = useState<string | null>(null);
  const [loadingLyrics, setLoadingLyrics] = useState(false);

  useEffect(() => {
    if (!current) return;
    idb.isLiked(current.id).then(setLiked);
    idb.hasDownload(current.id).then(setDownloaded);
    setShowLyrics(false);
    setLyrics(null);
  }, [current?.id]);

  useEffect(() => {
    if (!showLyrics || !current || lyrics) return;
    setLoadingLyrics(true);
    saavn.lyrics(current.id)
      .then((l) => setLyrics(l?.lyrics ?? "No lyrics available for this song."))
      .catch(() => setLyrics("Lyrics not available."))
      .finally(() => setLoadingLyrics(false));
  }, [showLyrics, current?.id]);

  if (!current) return null;
  const cover = bestImage(current.image);

  const handleDownload = async () => {
    setDownloading(true); setProgress(0);
    try {
      await downloadForOffline(current, setProgress);
      setDownloaded(true);
      toast.success("Saved for offline");
    } catch (e: any) {
      toast.error(e.message ?? "Download failed");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Sheet open={expanded} onOpenChange={setExpanded}>
      <SheetContent side="bottom" className="h-[100dvh] border-0 p-0 bg-background safe-bottom safe-top">
        <div
          className="relative h-full w-full overflow-y-auto"
          style={{
            background: cover
              ? `linear-gradient(180deg, hsl(var(--background)) 0%, hsl(0 0% 4%) 100%)`
              : undefined,
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4">
            <button onClick={() => setExpanded(false)} aria-label="Collapse">
              <ChevronDown className="h-6 w-6" />
            </button>
            <div className="text-center text-xs uppercase tracking-wider text-muted-foreground">
              Now playing
            </div>
            <button aria-label="More"><MoreHorizontal className="h-6 w-6" /></button>
          </div>

          {/* Cover or Lyrics */}
          <div className="px-6">
            {showLyrics ? (
              <div className="min-h-[55vh] whitespace-pre-line rounded-2xl bg-surface-2 p-5 text-base leading-7">
                {loadingLyrics ? "Loading lyrics…" : lyrics}
              </div>
            ) : (
              <div className="aspect-square w-full overflow-hidden rounded-2xl bg-surface-2 shadow-card">
                {cover && <img src={cover} alt="" className="h-full w-full object-cover" />}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex items-start justify-between gap-3 px-6 pt-6">
            <div className="min-w-0 flex-1">
              <Link
                to={current.album?.id ? `/album/${current.album.id}` : "#"}
                onClick={() => setExpanded(false)}
                className="block truncate text-2xl font-bold hover:underline"
              >
                {decodeHtml(current.name)}
              </Link>
              <Link
                to={current.artists?.primary?.[0]?.id ? `/artist/${current.artists.primary[0].id}` : "#"}
                onClick={() => setExpanded(false)}
                className="truncate text-sm text-muted-foreground hover:text-foreground block"
              >
                {artistsLine(current)}
              </Link>
            </div>
            <button
              onClick={() => idb.toggleLike(current).then(setLiked)}
              className={cn("p-2", liked ? "text-primary" : "text-muted-foreground")}
              aria-label="Like"
            >
              <Heart className="h-7 w-7" fill={liked ? "currentColor" : "none"} />
            </button>
          </div>

          {/* Seekbar */}
          <div className="px-6 pt-6">
            <Slider
              value={[position]}
              max={duration || 1}
              step={1}
              onValueChange={(v) => seek(v[0])}
            />
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>{fmtTime(position)}</span>
              <span>{fmtTime(duration)}</span>
            </div>
          </div>

          {/* Transport */}
          <div className="flex items-center justify-between px-8 pt-4">
            <button onClick={toggleShuffle} className={cn(shuffle ? "text-primary" : "text-muted-foreground")} aria-label="Shuffle">
              <Shuffle className="h-5 w-5" />
            </button>
            <button onClick={prev} aria-label="Previous"><SkipBack className="h-8 w-8" fill="currentColor" /></button>
            <button
              onClick={toggle}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-foreground text-background"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="h-7 w-7" fill="currentColor" /> : <Play className="h-7 w-7 ml-1" fill="currentColor" />}
            </button>
            <button onClick={next} aria-label="Next"><SkipForward className="h-8 w-8" fill="currentColor" /></button>
            <button onClick={cycleRepeat} className={cn(repeat !== "off" ? "text-primary" : "text-muted-foreground")} aria-label="Repeat">
              {repeat === "one" ? <Repeat1 className="h-5 w-5" /> : <Repeat className="h-5 w-5" />}
            </button>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-4 gap-2 px-6 pt-6 pb-10">
            <ActionBtn
              icon={Download}
              label={downloaded ? "Saved" : downloading ? `${Math.round(progress * 100)}%` : "Offline"}
              active={downloaded}
              onClick={handleDownload}
              disabled={downloading || downloaded}
            />
            <ActionBtn icon={Share2} label="Save file" onClick={() => saveToDevice(current).catch((e) => toast.error(e.message))} />
            <ActionBtn icon={Mic2} label="Lyrics" active={showLyrics} onClick={() => setShowLyrics((v) => !v)} />
            <QueueButton queue={queue} index={idx} onRemove={removeFromQueue} onCloseFull={() => setExpanded(false)} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ActionBtn({ icon: Icon, label, onClick, active, disabled }: { icon: any; label: string; onClick?: () => void; active?: boolean; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex flex-col items-center gap-1 rounded-xl bg-surface-2 p-3 text-xs transition-colors",
        active ? "text-primary" : "text-foreground",
        disabled && "opacity-60",
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="truncate">{label}</span>
    </button>
  );
}

function QueueButton({ queue, index, onRemove, onCloseFull }: { queue: any[]; index: number; onRemove: (i: number) => void; onCloseFull: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="flex flex-col items-center gap-1 rounded-xl bg-surface-2 p-3 text-xs">
          <ListMusic className="h-5 w-5" />
          Queue
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[80dvh] bg-background border-border">
        <h3 className="mb-3 text-lg font-bold">Up next</h3>
        <div className="space-y-1 overflow-y-auto pb-10">
          {queue.map((s, i) => (
            <div key={`${s.id}-${i}`} className={cn("flex items-center gap-3 p-2 rounded-md", i === index && "bg-surface-2")}>
              <div className="h-10 w-10 overflow-hidden rounded bg-surface-3">
                <img src={bestImage(s.image)} alt="" className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm">{decodeHtml(s.name)}</div>
                <div className="truncate text-xs text-muted-foreground">{artistsLine(s)}</div>
              </div>
              {i !== index && (
                <button onClick={() => onRemove(i)} className="text-muted-foreground text-xs px-2">Remove</button>
              )}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

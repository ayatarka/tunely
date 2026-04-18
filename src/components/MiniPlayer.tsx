import { Pause, Play, SkipForward } from "lucide-react";
import { usePlayer } from "@/store/player";
import { artistsLine, bestImage, decodeHtml } from "@/lib/saavn";

export function MiniPlayer() {
  const current = usePlayer((s) => s.current);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const toggle = usePlayer((s) => s.toggle);
  const next = usePlayer((s) => s.next);
  const setExpanded = usePlayer((s) => s.setExpanded);
  const position = usePlayer((s) => s.position);
  const duration = usePlayer((s) => s.duration);

  if (!current) return null;
  const pct = duration ? (position / duration) * 100 : 0;

  return (
    <div className="sticky bottom-0 z-20 mx-2 mb-1 overflow-hidden rounded-lg bg-surface-2 shadow-player">
      <div
        onClick={() => setExpanded(true)}
        className="flex items-center gap-3 p-2 cursor-pointer"
      >
        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-md bg-surface-3">
          {bestImage(current.image) && (
            <img src={bestImage(current.image)} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{decodeHtml(current.name)}</div>
          <div className="truncate text-xs text-muted-foreground">{artistsLine(current)}</div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); toggle(); }}
          className="p-2"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause className="h-6 w-6" fill="currentColor" /> : <Play className="h-6 w-6" fill="currentColor" />}
        </button>
        <button onClick={(e) => { e.stopPropagation(); next(); }} className="p-2" aria-label="Next">
          <SkipForward className="h-5 w-5" />
        </button>
      </div>
      <div className="h-0.5 w-full bg-surface-3">
        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

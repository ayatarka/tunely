import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { idb } from "@/lib/db";
import { artistsLine, bestImage, decodeHtml, type SaavnSong } from "@/lib/saavn";
import { usePlayer } from "@/store/player";

const QUICK_PICKS = ["Harry Styles", "Rihanna", "The Weeknd", "Taylor Swift", "Drake", "Billie Eilish"];

export default function Home() {
  const [recent, setRecent] = useState<SaavnSong[]>([]);
  const playSong = usePlayer((s) => s.playSong);

  useEffect(() => {
    idb.listRecent(10).then((r) => setRecent(r.map((x) => x.song)));
  }, []);

  return (
    <div className="space-y-6 p-4 pb-4">
      <header className="pt-2">
        <h1 className="text-2xl font-bold">Good evening</h1>
        <p className="text-sm text-muted-foreground">What do you want to listen to?</p>
      </header>

      <section>
        <h2 className="mb-3 text-lg font-bold">Quick picks</h2>
        <div className="grid grid-cols-2 gap-2">
          {QUICK_PICKS.map((q) => (
            <Link
              key={q}
              to={`/search?q=${encodeURIComponent(q)}`}
              className="flex items-center gap-3 overflow-hidden rounded-md bg-surface-2 pr-3 transition-colors hover:bg-surface-3"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center bg-gradient-primary text-xl font-bold text-primary-foreground">
                {q[0]}
              </div>
              <div className="truncate text-sm font-medium">{q}</div>
            </Link>
          ))}
        </div>
      </section>

      {recent.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold">Recently played</h2>
          <div className="grid grid-cols-2 gap-3">
            {recent.slice(0, 6).map((song) => (
              <button
                key={song.id}
                onClick={() => playSong(song)}
                className="text-left"
              >
                <div className="aspect-square overflow-hidden rounded-lg bg-surface-2">
                  {bestImage(song.image) && (
                    <img src={bestImage(song.image)} alt="" className="h-full w-full object-cover" loading="lazy" />
                  )}
                </div>
                <div className="mt-2 truncate text-sm font-medium">{decodeHtml(song.name)}</div>
                <div className="truncate text-xs text-muted-foreground">{artistsLine(song)}</div>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl bg-gradient-card p-5">
        <h2 className="text-lg font-bold">💡 Add to Home Screen</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          On iPhone: Safari → Share → "Add to Home Screen". On Android: Chrome menu → "Install app". Then it works like a real app.
        </p>
      </section>
    </div>
  );
}

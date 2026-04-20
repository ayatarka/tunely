import { Link } from "react-router-dom";
import { bestImage, decodeHtml, type SaavnAlbum } from "@/lib/saavn";

export function AlbumCard({ album }: { album: SaavnAlbum }) {
  return (
    <Link
      to={`/album/${album.id}`}
      onClick={() => {
        const history = JSON.parse(localStorage.getItem("search_history") || "[]");
        const updated = [
          {
            id: album.id,
            name: decodeHtml(album.name),
            image: bestImage(album.image),
            type: "album",
          },
          ...history.filter((x: any) => x.id !== album.id),
        ].slice(0, 10);
        localStorage.setItem("search_history", JSON.stringify(updated));
      }}
      className="group block"
    >
      <div className="aspect-square overflow-hidden rounded-lg bg-surface-2 shadow-card">
        {bestImage(album.image) && (
          <img
            src={bestImage(album.image)}
            alt={decodeHtml(album.name)}
            className="h-full w-full object-cover transition-transform group-active:scale-95"
            loading="lazy"
          />
        )}
      </div>
      <div className="mt-2 truncate text-sm font-medium">{decodeHtml(album.name)}</div>
      {album.year && <div className="truncate text-xs text-muted-foreground">{album.year}</div>}
    </Link>
  );
}
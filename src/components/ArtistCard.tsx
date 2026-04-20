import { Link } from "react-router-dom";
import { bestImage, decodeHtml, type SaavnArtist } from "@/lib/saavn";

export function ArtistCard({ artist }: { artist: SaavnArtist }) {
  return (
    <Link
      to={`/artist/${artist.id}`}
      onClick={() => {
        const history = JSON.parse(localStorage.getItem("search_history") || "[]");

        const updated = [
          {
            id: artist.id,
            name: artist.name,
            image: bestImage(artist.image),
            type: "artist",
          },
          ...history.filter((x: any) => x.id !== artist.id),
        ].slice(0, 10);

        localStorage.setItem("search_history", JSON.stringify(updated));
      }}
      className="group block"
    >
      <div className="aspect-square overflow-hidden rounded-full bg-surface-2 shadow-card">
        {bestImage(artist.image) && (
          <img
            src={bestImage(artist.image)}
            alt={decodeHtml(artist.name)}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        )}
      </div>

      <div className="mt-2 truncate text-center text-sm font-medium">
        {decodeHtml(artist.name)}
      </div>

      <div className="truncate text-center text-xs text-muted-foreground">
        Artist
      </div>
    </Link>
  );
}
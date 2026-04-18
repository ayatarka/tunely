import { NavLink } from "react-router-dom";
import { Home, Search, Library } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const items = [
    { to: "/", icon: Home, label: "Home" },
    { to: "/search", icon: Search, label: "Search" },
    { to: "/library", icon: Library, label: "Library" },
  ];
  return (
    <nav className="sticky bottom-0 z-30 grid grid-cols-3 border-t border-border bg-player-bg/95 backdrop-blur safe-bottom">
      {items.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center gap-1 py-2 text-xs transition-colors",
              isActive ? "text-foreground" : "text-muted-foreground",
            )
          }
        >
          <Icon className="h-5 w-5" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

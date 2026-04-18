import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { MiniPlayer } from "@/components/MiniPlayer";
import { FullPlayer } from "@/components/FullPlayer";
import { usePlayer } from "@/store/player";

export function AppShell() {
  const init = usePlayer((s) => s.init);
  useEffect(() => { init(); }, [init]);

  return (
    <div className="flex h-[100dvh] flex-col bg-background">
      <main className="flex-1 overflow-y-auto safe-top">
        <Outlet />
      </main>
      <MiniPlayer />
      <BottomNav />
      <FullPlayer />
    </div>
  );
}

import { Moon, Sun, Monitor, Palette } from "lucide-react";
import { useTheme } from "./theme-provider";

export function ThemeToggle() {
  const { theme, setTheme, design, setDesign } = useTheme();
  
  const isDark = 
    theme === "dark" || 
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  return (
    <div className="flex items-center gap-1.5 rounded-md border border-border bg-panel-2 p-1">
      <button
        onClick={() => setDesign(design === "classic" ? "modern" : "classic")}
        className="flex h-7 w-7 items-center justify-center rounded transition-colors hover:bg-accent hover:text-foreground text-muted-foreground"
        title={`Switch to ${design === "classic" ? "modern" : "classic"} design`}
      >
        {design === "classic" ? <Monitor className="h-4 w-4" /> : <Palette className="h-4 w-4" />}
        <span className="sr-only">Toggle design mode</span>
      </button>
      
      <div className="h-4 w-[1px] bg-border" />
      
      <button
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className="flex h-7 w-7 items-center justify-center rounded transition-colors hover:bg-accent hover:text-foreground text-muted-foreground"
        title={`Switch to ${isDark ? "light" : "dark"} mode`}
      >
        {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        <span className="sr-only">Toggle dark mode</span>
      </button>
    </div>
  );
}

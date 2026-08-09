import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";
type DesignMode = "classic" | "modern";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  defaultDesign?: DesignMode;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  design: DesignMode;
  setDesign: (design: DesignMode) => void;
};

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
  design: "modern",
  setDesign: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "dark",
  defaultDesign = "modern",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (typeof localStorage !== "undefined" ? localStorage.getItem(storageKey) as Theme : null) || defaultTheme
  );
  
  const [design, setDesign] = useState<DesignMode>(
    () => (typeof localStorage !== "undefined" ? localStorage.getItem(`${storageKey}-design`) as DesignMode : null) || defaultDesign
  );

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      root.classList.add(systemTheme);
      return;
    }
    root.classList.add(theme);
  }, [theme]);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme);
      setTheme(theme);
    },
    design,
    setDesign: (design: DesignMode) => {
      localStorage.setItem(`${storageKey}-design`, design);
      setDesign(design);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");
  return context;
};

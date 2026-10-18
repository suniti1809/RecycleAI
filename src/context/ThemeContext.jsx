import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const THEMES = [
  {
    id: 'slate-dimmed',
    name: 'Slate Dimmed (Balanced)',
    mode: 'dimmed',
    accent: '#10B981',
    bg: '#1A2232',
    surface: '#222C3E',
    text: '#F1F5F9',
    emoji: '🌓',
    desc: 'Soothing slate canvas, radiant emerald accents — na jyada dark, na jyada light'
  },
  {
    id: 'clean-light',
    name: 'Clean Eco Light',
    mode: 'light',
    accent: '#059669',
    bg: '#F8FAFC',
    surface: '#FFFFFF',
    text: '#0F172A',
    emoji: '☀️',
    desc: 'Crisp white surfaces, modern cool grey canvas, vivid green accents'
  },
  {
    id: 'deep-obsidian',
    name: 'Deep Obsidian Dark',
    mode: 'dark',
    accent: '#10B981',
    bg: '#0B0F17',
    surface: '#111827',
    text: '#F9FAFB',
    emoji: '🌙',
    desc: 'Deep cosmic dark, high-contrast neon mint & emerald glow'
  }
];

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    // Default to slate-dimmed (balanced)
    const saved = localStorage.getItem('recycle_ai_theme');
    if (saved && ['slate-dimmed', 'clean-light', 'deep-obsidian'].includes(saved)) {
      return saved;
    }
    return 'slate-dimmed';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('recycle_ai_theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}


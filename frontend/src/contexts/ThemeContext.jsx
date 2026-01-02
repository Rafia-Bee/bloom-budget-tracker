/**
 * ThemeContext - Manages dark/light theme state
 *
 * Provides theme toggle functionality with localStorage persistence.
 * Applies 'dark' class to document root for Tailwind dark mode.
 */

import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(() => {
        const saved = localStorage.getItem('bloom-theme');
        return saved || 'light';
    });

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('dark', 'light');
        if (theme === 'dark') {
            root.classList.add('dark');
        }
        localStorage.setItem('bloom-theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
    };

    return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return context;
}

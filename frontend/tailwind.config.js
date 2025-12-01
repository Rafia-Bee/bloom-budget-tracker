/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                // Light mode colors
                "bloom-pink": "#FFB3C6",
                "bloom-light": "#FFE5EC",
                "bloom-mint": "#C6F6D5",
                "bloom-peach": "#FED7D7",
                "bloom-lavender": "#E9D8FD",

                // Dark mode base system
                "dark-base": "#19171A",
                "dark-surface": "#221F24",
                "dark-elevated": "#2B272F",
                "dark-border": "#3C3841",
                "dark-muted": "#A39CA9",

                // Dark mode primary colors
                "dark-pink": "#FF8EA9",
                "dark-pink-hover": "#FF6C8C",
                "dark-pink-surface": "#35202A",

                // Dark mode supporting colors
                "dark-mint": "#74D8BE",
                "dark-peach": "#FFB284",
                "dark-lavender": "#A7A4F3",
                "dark-yellow": "#F2D892",

                // Dark mode status colors
                "dark-success": "#7BD9C5",
                "dark-warning": "#FFC085",
                "dark-danger": "#FF7A88",
                "dark-info": "#7FB6FF",

                // Dark mode typography
                "dark-text": "#F2EDF5",
                "dark-text-secondary": "#C7C1CC",
                "dark-text-tertiary": "#938D99",

                // Dark mode overlays
                "dark-overlay": "rgba(0,0,0,0.55)",
                "dark-glass": "rgba(255,255,255,0.08)",
                "dark-pink-glow": "rgba(255,142,169,0.15)",
            },
        },
    },
    plugins: [],
};

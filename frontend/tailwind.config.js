/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                "bloom-pink": "#FFB3C6",
                "bloom-light": "#FFE5EC",
                "bloom-mint": "#C6F6D5",
                "bloom-peach": "#FED7D7",
                "bloom-lavender": "#E9D8FD",
            },
        },
    },
    plugins: [],
};

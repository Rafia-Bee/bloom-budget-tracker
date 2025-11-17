import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: "autoUpdate",
            devOptions: {
                enabled: false, // Disable PWA in development to prevent caching issues
            },
            includeAssets: ["icon-192.png", "icon-512.png"],
            manifest: {
                name: "Bloom - Budget Tracker",
                short_name: "Bloom",
                description: "Financial Habits That Grow With You",
                theme_color: "#ec4899",
                background_color: "#ffffff",
                display: "standalone",
                icons: [
                    {
                        src: "/icon-192.png",
                        sizes: "192x192",
                        type: "image/png",
                    },
                    {
                        src: "/icon-512.png",
                        sizes: "512x512",
                        type: "image/png",
                    },
                ],
            },
            workbox: {
                globPatterns: ["**/*.{js,css,html,ico,png,svg,json}"],
                runtimeCaching: [
                    {
                        urlPattern:
                            /^https:\/\/bloom-backend-b44r\.onrender\.com\/.*$/,
                        handler: "NetworkFirst",
                        options: {
                            cacheName: "api-cache",
                            expiration: {
                                maxEntries: 100,
                                maxAgeSeconds: 60 * 60 * 24, // 24 hours
                            },
                            cacheableResponse: {
                                statuses: [0, 200],
                            },
                        },
                    },
                ],
            },
        }),
    ],
    server: {
        port: 3000,
        headers: {
            "Cache-Control": "no-store", // Prevent browser caching in development
        },
        proxy: {
            "/api": {
                target: "http://localhost:5000",
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, ""),
            },
        },
    },
});

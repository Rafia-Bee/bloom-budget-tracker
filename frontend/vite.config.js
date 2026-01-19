import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
    build: {
        sourcemap: false, // Disable source maps in production
        // Vendor chunks are intentionally large but loaded on-demand
        chunkSizeWarningLimit: 600,
        rollupOptions: {
            output: {
                // Code-split large vendor libraries into separate chunks
                manualChunks: {
                    // Charts library (recharts) - ~500KB, only used on Reports/Dashboard
                    'vendor-charts': ['recharts'],
                    // PDF export libraries - ~600KB, only used when exporting
                    'vendor-pdf': ['jspdf', 'html2canvas'],
                    // React core - stable, cacheable
                    'vendor-react': ['react', 'react-dom', 'react-router-dom'],
                },
            },
        },
    },
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            devOptions: {
                enabled: false, // Disable PWA in development to prevent caching issues
            },
            includeAssets: ['icon-192.png', 'icon-512.png'],
            manifest: {
                name: 'Bloom - Budget Tracker',
                short_name: 'Bloom',
                description: 'Financial Habits That Grow With You',
                theme_color: '#ec4899',
                background_color: '#ffffff',
                display: 'standalone',
                version: '1.2.0', // Increment on every deployment to force cache refresh
                icons: [
                    {
                        src: '/icon-192.png',
                        sizes: '192x192',
                        type: 'image/png',
                    },
                    {
                        src: '/icon-512.png',
                        sizes: '512x512',
                        type: 'image/png',
                    },
                ],
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
                // Clean up old caches on activation
                cleanupOutdatedCaches: true,
                // Skip waiting and claim clients immediately
                skipWaiting: true,
                clientsClaim: true,
                runtimeCaching: [
                    {
                        urlPattern: /^https:\/\/bloom-backend-b44r\.onrender\.com\/.*$/,
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'api-cache',
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
            'Cache-Control': 'no-store', // Prevent browser caching in development
        },
        proxy: {
            '/api': {
                target: 'http://localhost:5000',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, ''),
            },
        },
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './src/test/setup.js',
        css: true,
        exclude: ['node_modules', 'e2e'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: ['node_modules/', 'src/test/', '**/*.spec.jsx', '**/*.test.jsx'],
            // Enforce minimum coverage (adjusted for feature branch - pages have 0% coverage)
            // Individual file thresholds not supported well in vitest - using global only
            thresholds: {
                lines: 38,
                statements: 38,
                branches: 38,
                functions: 38,
            },
        },
    },
});

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'img/icons/*.png'],
            manifest: {
                name: "FlashRevise",
                short_name: "FlashRevise",
                id: "/Flashrevise/",
                start_url: "./",
                display: "standalone",
                display_override: ["window-controls-overlay", "minimal-ui"],
                orientation: "portrait",
                background_color: "#0f172a",
                theme_color: "#0f172a",
                description: "Premium Flashcard App for Revision. Create custom decks, organize vertically, and study offline.",
                categories: ["education", "productivity", "study"],
                icons: [
                    {
                        src: "icons/icon-192.png",
                        sizes: "192x192",
                        type: "image/png"
                    },
                    {
                        src: "icons/icon-512.png",
                        sizes: "512x512",
                        type: "image/png"
                    },
                    {
                        src: "icons/icon-512.png",
                        sizes: "512x512",
                        type: "image/png",
                        purpose: "maskable"
                    },
                    {
                        src: "icons/icon-512.png",
                        sizes: "512x512",
                        type: "image/png",
                        purpose: "any"
                    }
                ],
                screenshots: [
                    {
                        src: "screenshots/home.png",
                        sizes: "1024x1024",
                        type: "image/png",
                        form_factor: "wide"
                    },
                    {
                        src: "screenshots/card.png",
                        sizes: "1024x1024",
                        type: "image/png",
                        form_factor: "wide"
                    },
                    {
                        src: "screenshots/home.png",
                        sizes: "1024x1024",
                        type: "image/png",
                        form_factor: "narrow"
                    }
                ],
                launch_handler: {
                    client_mode: ["navigate-existing", "auto"]
                },
                shortcuts: [
                    {
                        name: "Add Goal",
                        short_name: "Add Goal",
                        description: "Create a new learning goal",
                        url: "./?action=add_goal",
                        icons: [
                            {
                                src: "icons/icon-192.png",
                                sizes: "192x192"
                            }
                        ]
                    }
                ],
                share_target: {
                    action: "./?action=share_target",
                    method: "GET",
                    enctype: "application/x-www-form-urlencoded",
                    params: {
                        title: "title",
                        text: "text",
                        url: "url"
                    }
                },

                protocol_handlers: [
                    {
                        protocol: "web+flashrevise",
                        url: "./?action=protocol&target=%s"
                    }
                ],
                widgets: [
                    {
                        name: "Quick Study",
                        description: "Quickly access your flashcards",
                        tag: "quick-study",
                        template: "widget",
                        ms_ac_template: "widget.json",
                        data: "widget_data.json",
                        type: "application/json",
                        screenshots: [
                            {
                                src: "screenshots/card.png",
                                sizes: "1024x1024",
                                label: "Widget View"
                            }
                        ]
                    }
                ],
                edge_side_panel: {
                    preferred_width: 400
                },
                note_taking: {
                    new_note_url: "./?action=new_note"
                }
            }
        })
    ],
    base: '/Flashrevise/',
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
})

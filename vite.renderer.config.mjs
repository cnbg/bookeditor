import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import { pluginExposeRenderer } from './vite.base.config.mjs'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config
export default defineConfig((env) => {
    const {root, mode, forgeConfigSelf} = env
    const name = forgeConfigSelf.name ?? ''

    /** @type {import('vite').UserConfig} */
    return {
        root,
        mode,
        base: './',
        build: {
            outDir: `.vite/renderer/${name}`,
            target: 'esnext',
            chunkSizeWarningLimit: 10000
        },
        plugins: [
            pluginExposeRenderer(name),
            vue({
                template: {
                    compilerOptions: {
                        isCustomElement: (tag) => ['model-viewer'].includes(tag),
                    },
                },
            }),
        ],
        resolve: {
            preserveSymlinks: true,
            alias: {
                '@': fileURLToPath(new URL('./src', import.meta.url)),
            },
        },
        clearScreen: false,
    }
})

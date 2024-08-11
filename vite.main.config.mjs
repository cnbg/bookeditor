import {defineConfig, mergeConfig} from 'vite'
import {external, getBuildConfig, getBuildDefine, pluginHotRestart,} from './vite.base.config.mjs'

// https://vitejs.dev/config
export default defineConfig((env) => {
    /** @type {import('vite').ConfigEnv<'build'>} */
    const forgeEnv = env
    const {forgeConfigSelf} = forgeEnv
    const define = getBuildDefine(forgeEnv)
    const config = {
        build: {
            lib: {
                entry: forgeConfigSelf.entry,
                fileName: () => '[name].js',
                formats: ['cjs'],
            },
            rollupOptions: {
                external,
            },
            target: 'esnext',
        },
        plugins: [pluginHotRestart('restart')],
        define,
        resolve: {
            // Load the Node.js entry.
            mainFields: ['module', 'jsnext:main', 'jsnext'],
        },
        server: {
            port: 5174
        },
    }

    return mergeConfig(getBuildConfig(forgeEnv), config)
})

import { defineConfig } from 'vite'
import postcssNested from 'postcss-nested'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'

export default defineConfig({
  plugins: [cssInjectedByJsPlugin()],
  build: {
    outDir: 'dist',
    lib: {
      entry: 'src/index.ts',
      name: 'ThreeStoryControls',
      formats: ['es', 'umd'],
      fileName: (format) => {
        if (format === 'es') return 'three-story-controls.esm.min.js'
        return 'three-story-controls.min.js'
      },
    },
    rollupOptions: {
      external: ['three', 'gsap'],
      output: {
        globals: {
          three: 'THREE',
          gsap: 'gsap',
        },
      },
    },
    sourcemap: true,
    minify: 'terser',
  },
  css: {
    postcss: {
      plugins: [postcssNested()],
    },
  },
  resolve: {
    alias: {
      'three-story-controls': '/src/index.ts',
      '@kagawa0710/three-story-controls': '/src/index.ts',
    },
  },
  server: {
    port: 8080,
    host: true,
    open: '/examples/demos/freemove/index.html',
  },
})

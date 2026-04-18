import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: {
    resolve: ['@command-palette/core'],
  },
  clean: true,
  sourcemap: true,
  target: 'es2022',
  external: ['vue'],
  noExternal: ['@command-palette/core'],
})

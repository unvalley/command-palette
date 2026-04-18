import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: {
    resolve: ['@unvalley/cmdk-core'],
  },
  clean: true,
  sourcemap: true,
  target: 'es2022',
  external: ['vue'],
  noExternal: ['@unvalley/cmdk-core'],
})

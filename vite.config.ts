import { resolve } from 'path'
import { defineConfig } from 'vite'
import { configDefaults } from 'vitest/config'
import dts from 'vite-plugin-dts'

export default defineConfig({
  build: {
    sourcemap: true,
    lib: {
      name: 'definitelyNotJsonDB',
      fileName: 'definitely-not-jsondb',
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
    },
  },
  plugins: [dts()],
  test: {
    globals: true,
    exclude: [...configDefaults.exclude, 'build/**/*'],
  },
})

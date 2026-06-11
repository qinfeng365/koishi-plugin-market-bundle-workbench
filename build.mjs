import { build } from 'esbuild'
import { createRequire } from 'module'
import { existsSync, copyFileSync } from 'fs'

const require = createRequire(import.meta.url)
const pkg = require('./package.json')
const { build: buildClient } = require('@koishijs/client/lib')

const external = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {}),
  ...Object.keys(pkg.devDependencies || {}),
  'koishi',
  '@koishijs/loader',
]

await build({
  entryPoints: ['src/index.ts'],
  outfile: 'lib/index.js',
  bundle: true,
  sourcemap: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  external,
  logLevel: 'info',
})

await buildClient(process.cwd())

if (existsSync('dist/index.css')) {
  copyFileSync('dist/index.css', 'dist/style.css')
} else if (existsSync('dist/style.css')) {
  copyFileSync('dist/style.css', 'dist/index.css')
}

import { Buffer } from 'node:buffer'
import { readFile } from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'
import { defineConfig } from 'tsdown'

const PLUGIN_ID = 'dsh-more-details'
const CSS_PREFIX = '\0dsh-more-details-css:'
const EXTERNALS = ['@deepseek-ai/dsh-client-ui-primitives', 'react', 'react/jsx-runtime']
const ZOD_BUNDLE = {
  alwaysBundle: ['zod'],
  onlyBundle: ['zod'],
}

export default defineConfig([
  {
    name: `${PLUGIN_ID}/client`,
    entry: { client: 'src/client/index.ts' },
    outDir: 'lib',
    format: 'cjs',
    platform: 'browser',
    target: 'es2023',
    dts: false,
    sourcemap: false,
    minify: true,
    clean: false,
    deps: {
      neverBundle: EXTERNALS,
      ...ZOD_BUNDLE,
    },
    plugins: [{
      name: 'dsh-more-details-css-text',
      resolveId(source, importer) {
        if (!source.endsWith('.css') || importer === undefined) return null
        return CSS_PREFIX + Buffer.from(resolve(dirname(importer), source)).toString('base64url')
      },
      async load(id) {
        if (!id.startsWith(CSS_PREFIX)) return null
        const path = Buffer.from(id.slice(CSS_PREFIX.length), 'base64url').toString()
        this.addWatchFile(path)
        const source = await readFile(path, 'utf8')
        // 分发的未打包模块也引用这些 CSS；内联入口与静态资源保持同源。
        this.emitFile({ type: 'asset', fileName: relative(resolve('src'), path).replaceAll('\\', '/'), source })
        return `export default ${JSON.stringify(source)}`
      },
    }],
    outputOptions: {
      entryFileNames: 'client.js',
      banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(PLUGIN_ID)}, factory: (require) => {`,
      footer: 'return module.exports; } });',
      intro: 'var module = { exports: {} }; var exports = module.exports;',
    },
  },
  {
    name: `${PLUGIN_ID}/typert`,
    entry: { typert: 'src/typert.ts' },
    outDir: 'lib',
    format: 'esm',
    platform: 'neutral',
    target: 'es2023',
    dts: false,
    sourcemap: false,
    minify: true,
    clean: false,
    deps: ZOD_BUNDLE,
    outputOptions: { entryFileNames: 'typert.js' },
  },
])

import { execFileSync } from 'node:child_process'
import { access, readFile } from 'node:fs/promises'

const packageManifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
const packageName = packageManifest.name
if (typeof packageName !== 'string' || packageName.length === 0) {
  throw new Error('package.json must declare a package name')
}
const runtimeDependencies = [
  ...Object.keys(packageManifest.dependencies ?? {}),
  ...Object.keys(packageManifest.optionalDependencies ?? {}),
]
if (runtimeDependencies.length > 0) {
  throw new Error('DSH Store automatic review requires runtime code to be self-contained or peer-provided')
}

for (const path of [
  '../lib/index.js',
  '../lib/client.js',
  '../lib/client/index.d.ts',
  '../lib/remote.js',
  '../lib/typert.js',
]) {
  await access(new URL(path, import.meta.url))
}

const clientBundle = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8')
for (const themeContract of [
  '--side-chat-bg: var(--dsw-alias-bg-layer-2',
  '--side-chat-text: var(--dsw-alias-label-primary',
  '--side-chat-accent-text: var(--dsw-alias-label-primary-foreground',
]) {
  if (!clientBundle.includes(themeContract)) {
    throw new Error(`client bundle is missing theme contract: ${themeContract}`)
  }
}
if (clientBundle.includes('--dsw-alias-button-info,')) {
  throw new Error('client bundle references the unpublished --dsw-alias-button-info token')
}

await import(new URL('../lib/index.js', import.meta.url))
await import(new URL('../lib/remote.js', import.meta.url))
const typert = await import(new URL('../lib/typert.js', import.meta.url))
for (const invocation of typert.default.invocations) {
  const schemas = [
    ...invocation.parameters.map(parameter => parameter.codec.create()),
    invocation.result.create(),
  ]
  if (schemas.some(schema => schema?._zod?.version?.major !== 4)) {
    throw new Error(`${invocation.id} is not backed by Zod v4 schemas`)
  }
}

let handoff
globalThis.window = globalThis
globalThis.__ModuleLoader__ = { load(value) { handoff = value } }
try {
  await import(new URL(`../lib/client.js?verify=${Date.now()}`, import.meta.url))
  if (handoff?.id !== packageName || typeof handoff.factory !== 'function') {
    throw new Error(`client bundle did not register ${packageName} through __ModuleLoader__.load`)
  }
  const modules = new Map([
    ['@deepseek-ai/dsh-client-ui-primitives', { MarkdownText() {} }],
    ['react', await import('react')],
    ['react/jsx-runtime', await import('react/jsx-runtime')],
  ])
  const exports = handoff.factory((specifier) => {
    if (!modules.has(specifier)) throw new Error(`client bundle requested unexpected external ${specifier}`)
    return modules.get(specifier)
  })
  if (typeof exports?.apply !== 'function' || !Array.isArray(exports.inject)) {
    throw new Error('client bundle factory did not return the Cordis plugin surface')
  }
} finally {
  delete globalThis.__ModuleLoader__
  delete globalThis.window
}

const npmCommand = process.platform === 'win32'
  ? { file: process.env.ComSpec ?? 'cmd.exe', prefix: ['/d', '/s', '/c', 'npm'] }
  : { file: 'npm', prefix: [] }
const output = execFileSync(npmCommand.file, [
  ...npmCommand.prefix,
  'pack',
  '--dry-run',
  '--ignore-scripts',
  '--json',
], {
  cwd: new URL('..', import.meta.url),
  encoding: 'utf8',
})
const manifest = JSON.parse(output)[0]
if (manifest.name !== packageName) throw new Error(`packed package name ${String(manifest.name)} does not match ${packageName}`)
const files = new Set(manifest.files.map(entry => entry.path))
for (const required of [
  'package.json',
  'cordis.patch.yml',
  'lib/index.js',
  'lib/client.js',
  'lib/client/index.d.ts',
  'lib/client/panel/side-chat.css',
  'lib/client/parent-composer/webchat-reference.css',
  'lib/client/webchat/webchat.css',
  'lib/remote.js',
  'lib/typert.js',
  'README.md',
  'UPSTREAM.md',
  'LICENSE',
  'THIRD_PARTY_NOTICES.md',
]) {
  if (!files.has(required)) throw new Error(`packed package is missing ${required}`)
}
for (const entry of files) {
  if (entry.startsWith('src/') || entry.startsWith('test/') || entry.startsWith('docs/plans/')) {
    throw new Error(`packed package contains source-only file ${entry}`)
  }
}

// DSH Store bounded-source-v3 reviews the distributable package surface.
// These are scanner budgets, not a reason to remove plugin capabilities.
const sourceFile = /\.(?:[cm]?[jt]sx?|jsonl?|ya?ml|sh|bash|zsh|fish|py|rb|php|go|rs|java|kt|kts|swift|cs|c|cc|cpp|h|hpp|ps1|psm1|cmd|bat|html?|vue|svelte)$|(?:^|\/)(?:NOTICE|UPSTREAM_LICENSE)(?:\.[^/]*)?$/iu
const sourceFiles = manifest.files.filter(entry => sourceFile.test(entry.path))
const sourceBytes = sourceFiles.reduce((total, entry) => total + entry.size, 0)
const largestSourceFile = sourceFiles.reduce(
  (largest, entry) => entry.size > largest.size ? entry : largest,
  { path: '', size: 0 },
)
if (manifest.files.length > 1200) {
  throw new Error(`distributable package has ${String(manifest.files.length)} entries; DSH Store's current scan budget is 1200`)
}
if (sourceFiles.length === 0 || sourceFiles.length > 512) {
  throw new Error(`distributable source has ${String(sourceFiles.length)} files; DSH Store's current scan budget is 1 to 512`)
}
if (largestSourceFile.size > 4 * 1024 * 1024) {
  throw new Error(`${largestSourceFile.path} is ${String(largestSourceFile.size)} bytes; DSH Store's current scan budget is 4 MiB per source file`)
}
if (sourceBytes > 8 * 1024 * 1024) {
  throw new Error(`distributable source is ${String(sourceBytes)} bytes; DSH Store's current scan budget is 8 MiB total`)
}

// npm pack can hide a missing repository artifact by running this project's
// build first. CI must prove that the build left the committed lib/ tree clean.
if (process.env.CI === 'true') {
  const artifactStatus = execFileSync('git', [
    'status',
    '--porcelain=v1',
    '--untracked-files=all',
    '--',
    'lib',
  ], { cwd: new URL('..', import.meta.url), encoding: 'utf8' }).trim()
  if (artifactStatus.length > 0) {
    throw new Error(`committed runtime artifacts are missing or stale:\n${artifactStatus}`)
  }
}

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const identity = {
  name: 'RZRZ-Q',
  email: '206667890+RZRZ-Q@users.noreply.github.com',
  repo: 'RZRZ-Q/dsh-more-details',
  origin: 'https://github.com/RZRZ-Q/dsh-more-details.git',
}
const scriptRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const gitEnv = { ...process.env, GIT_NO_REPLACE_OBJECTS: '1' }
const checkedCommits = new Set()
const checkedTags = new Set()

function fail(message) {
  throw new Error(message)
}

function run(command, args, trim = true) {
  try {
    const output = execFileSync(command, args, {
      encoding: 'utf8', env: gitEnv, stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 32 * 1024 * 1024,
    })
    return trim ? output.trimEnd() : output
  } catch {
    // Do not echo command output: it can contain the identity being rejected.
    fail(`${command} ${args[0]} failed; no identity check was bypassed.`)
  }
}

const git = (...args) => run('git', args)

function checkScope() {
  if (realpathSync(git('rev-parse', '--show-toplevel')) !== realpathSync(scriptRoot)
    || JSON.parse(readFileSync(join(scriptRoot, 'package.json'), 'utf8')).name !== 'dsh-more-details'
    || git('remote', 'get-url', 'origin') !== identity.origin) {
    fail(`This guard only applies to the ${identity.repo} checkout with its canonical origin.`)
  }
}

function checkIdentity(value, role) {
  const match = value?.match(/^(.+) <([^<>]+)> -?\d+ [+-]\d{4}$/)
  if (!match || match[1] !== identity.name || match[2] !== identity.email) {
    fail(`${role} must be ${identity.name} <${identity.email}>. Rejected identity omitted.`)
  }
}

function checkEffectiveIdentity() {
  checkIdentity(git('var', 'GIT_AUTHOR_IDENT'), 'Effective author')
  checkIdentity(git('var', 'GIT_COMMITTER_IDENT'), 'Effective committer')
}

function readObject(oid, type) {
  const raw = run('git', ['cat-file', type, oid], false)
  const split = raw.indexOf('\n\n')
  if (split < 0) fail('Invalid Git object headers.')
  return { headers: raw.slice(0, split).split('\n'), message: raw.slice(split + 2) }
}

function header(headers, name) {
  return headers.find(line => line.startsWith(`${name} `))?.slice(name.length + 1)
}

function checkHistory(oid) {
  if (git('rev-parse', '--is-shallow-repository') === 'true') {
    fail('A complete clone is required to verify all reachable commit identities.')
  }
  for (const commit of git('rev-list', oid, '--').split('\n').filter(Boolean)) {
    if (checkedCommits.has(commit)) continue
    const { headers, message } = readObject(commit, 'commit')
    checkIdentity(header(headers, 'author'), `Author of ${commit}`)
    checkIdentity(header(headers, 'committer'), `Committer of ${commit}`)
    for (const line of message.split('\n')) {
      if (/^co-authored-by\s*:/i.test(line)
        && line.replace(/^co-authored-by\s*:\s*/i, '').trim() !== `${identity.name} <${identity.email}>`) {
        fail(`Co-author of ${commit} is outside the public identity allowlist.`)
      }
    }
    checkedCommits.add(commit)
  }
}

function checkObject(oid, requireTag = false) {
  let type = git('cat-file', '-t', oid)
  if (requireTag && type !== 'tag') fail('Public tags must be annotated so their tagger can be verified.')
  while (type === 'tag') {
    if (checkedTags.has(oid)) return
    const { headers } = readObject(oid, 'tag')
    checkIdentity(header(headers, 'tagger'), `Tagger of ${oid}`)
    checkedTags.add(oid)
    oid = header(headers, 'object')
    if (!oid) fail('Tag has no target object.')
    type = git('cat-file', '-t', oid)
  }
  if (type !== 'commit') fail('Public refs must ultimately point to a commit.')
  checkHistory(oid)
}

function checkAll() {
  checkEffectiveIdentity()
  const refs = git('for-each-ref', '--format=%(objectname) %(refname)', 'refs/heads', 'refs/tags')
  for (const line of refs.split('\n').filter(Boolean)) {
    const [oid, ref] = line.split(' ')
    checkObject(oid, ref.startsWith('refs/tags/'))
  }
  checkObject(git('rev-parse', '--verify', 'HEAD'))
}

function checkUpdates(mode) {
  for (const line of readFileSync(0, 'utf8').split('\n').filter(Boolean)) {
    const fields = line.trim().split(/\s+/)
    if (fields.length !== (mode === 'push' ? 4 : 3)) fail('Invalid Git hook input.')
    const [, oid, ref] = fields
    if (/^0+$/.test(oid)) continue
    // Git 2.54+ also reports symbolic updates (for example an unborn HEAD).
    // The corresponding object ref is checked separately when it is written.
    if (mode !== 'push' && oid.startsWith('ref:')) continue
    if (mode !== 'push' && ref !== 'HEAD' && !ref.startsWith('refs/heads/') && !ref.startsWith('refs/tags/')) continue
    checkObject(oid, ref.startsWith('refs/tags/'))
  }
}

function install() {
  checkEffectiveIdentity()
  // Read all local entries without treating a missing hooksPath as a Git error.
  const hooksPaths = git('config', '--local', '--list').split('\n')
    .filter(line => line.startsWith('core.hookspath=')).map(line => line.slice('core.hookspath='.length))
  if (hooksPaths.some(value => value !== '.githooks')) fail('An existing local hooksPath must be reviewed before installing this guard.')
  for (const name of ['pre-commit', 'reference-transaction', 'pre-push']) {
    if (!existsSync(join(scriptRoot, '.githooks', name))) fail(`Missing ${name} hook.`)
  }
  git('config', '--local', 'core.hooksPath', '.githooks')
  console.log('Installed identity hooks in this checkout only (core.hooksPath=.githooks).')
}

function checkPublishedTag(tag) {
  checkEffectiveIdentity()
  const ref = `refs/tags/${tag}`
  const oid = git('rev-parse', '--verify', ref)
  checkObject(oid, true)
  if (run('gh', ['api', 'user', '--jq', '.login']) !== identity.name) fail('GitHub CLI must authenticate as the public account.')
  const remote = git('ls-remote', '--refs', 'origin', ref).split('\n').filter(Boolean)
  if (remote.length !== 1 || remote[0] !== `${oid}\t${ref}`) {
    fail('The remote tag is missing or differs from the verified local tag. Push the verified tag first.')
  }
}

function npmCheck() {
  checkAll()
  const manifest = JSON.parse(readFileSync(join(scriptRoot, 'package.json'), 'utf8'))
  if (manifest.private === true || manifest.author?.name !== identity.name
    || manifest.author?.url !== `https://github.com/${identity.name}`
    || (manifest.author.email !== undefined && manifest.author.email !== identity.email)
    || manifest.publishConfig?.registry !== 'https://registry.npmjs.org'
    || manifest.publishConfig?.access !== 'public') {
    fail('npm package author, registry, and visibility must use the public project settings.')
  }
  if (git('status', '--porcelain', '--untracked-files=no') !== '') fail('Commit the reviewed package before npm publication.')
  const tag = `v${manifest.version}`
  checkPublishedTag(tag)
  if (git('rev-parse', `${tag}^{commit}`) !== git('rev-parse', 'HEAD')) fail('npm version tag must point to HEAD.')
  if (run('npm', ['whoami', '--registry=https://registry.npmjs.org']).toLowerCase() !== identity.name.toLowerCase()) {
    fail('npm must authenticate as the public rzrz-q account; rejected account omitted.')
  }
  console.log(`npm publication identity checks passed for ${manifest.name}@${manifest.version}.`)
}

function release(args) {
  const [tag, ...rest] = args
  if (!tag || tag.startsWith('-')) fail('Usage: release <tag> --title <title> --notes-file <file> [--draft] [--prerelease] [assets...]')
  git('check-ref-format', `refs/tags/${tag}`)
  const options = new Map()
  const assets = []
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i]
    if (arg === '--title' || arg === '--notes-file') {
      if (!rest[i + 1] || options.has(arg)) fail(`Provide exactly one value for ${arg}.`)
      options.set(arg, rest[++i])
    } else if (arg === '--draft' || arg === '--prerelease' || arg === '--check-only') {
      options.set(arg, true)
    } else if (arg.startsWith('-')) {
      fail('Unsupported release option; repository and tag verification cannot be overridden.')
    } else {
      assets.push(arg)
    }
  }
  if (!options.has('--title') || !options.has('--notes-file')) fail('Release title and notes file are required.')
  for (const path of [options.get('--notes-file'), ...assets]) {
    if (!existsSync(path)) fail('A release notes file or asset does not exist.')
  }
  checkPublishedTag(tag)
  if (options.delete('--check-only')) {
    console.log(`Release identity checks passed for ${identity.repo} ${tag}; no release was created.`)
    return
  }
  const ghArgs = ['release', 'create', tag, '--repo', identity.repo, '--verify-tag']
  for (const [key, value] of options) {
    ghArgs.push(key)
    if (value !== true) ghArgs.push(value)
  }
  ghArgs.push(...assets)
  console.log(run('gh', ghArgs))
}

try {
  const [mode, ...args] = process.argv.slice(2)
  if (mode === 'ref-transaction' && args[0] !== 'prepared') process.exit(0)
  checkScope()
  switch (mode) {
    case 'install': install(); break
    case 'commit': checkEffectiveIdentity(); break
    case 'ref-transaction': checkUpdates(mode); break
    case 'push': checkEffectiveIdentity(); checkUpdates(mode); break
    case 'check': checkAll(); console.log('Public identity checks passed.'); break
    case 'release': release(args); break
    case 'npm-check': npmCheck(); break
    default: fail('Expected install, commit, ref-transaction, push, check, release, or npm-check.')
  }
} catch (error) {
  console.error(`[public-identity] BLOCKED: ${error.message}`)
  process.exitCode = 1
}

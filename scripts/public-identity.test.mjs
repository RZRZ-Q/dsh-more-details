import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { after, test } from 'node:test'

const project = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const temporary = join(project, 'tmp')
mkdirSync(temporary, { recursive: true })
const scratch = mkdtempSync(join(temporary, 'identity-guard-tests-'))
const publicName = 'RZRZ-Q'
const publicEmail = '206667890+RZRZ-Q@users.noreply.github.com'
const publicRemote = 'https://github.com/RZRZ-Q/dsh-more-details.git'
const badName = 'Fixture Author'
const badEmail = 'fixture@example.invalid'
const template = join(scratch, 'empty-template')
mkdirSync(template)
const environment = { ...process.env }
for (const name of Object.keys(environment)) {
  if (name.startsWith('GIT_')) delete environment[name]
}
Object.assign(environment, {
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_SYSTEM: '/dev/null',
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_TEMPLATE_DIR: template,
})

after(() => rmSync(scratch, { recursive: true, force: true }))

function run(directory, command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: directory,
    env: { ...environment, ...options.env },
    input: options.input,
    encoding: 'utf8',
  })
}

function succeeds(result) {
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`)
  return result.stdout.trim()
}

function blocked(result) {
  assert.notEqual(result.status, 0, `Unexpected success: ${result.stdout}`)
  assert.equal(result.error, undefined, String(result.error))
  assert.match(result.stderr, /\[public-identity\] BLOCKED:/)
}

function git(directory, args, options) {
  return run(directory, 'git', args, options)
}

function guard(directory, args, options) {
  return run(directory, process.execPath, ['scripts/public-identity.mjs', ...args], options)
}

function fixture() {
  const directory = mkdtempSync(join(scratch, 'repo-'))
  succeeds(git(directory, ['init', '--quiet', '--initial-branch=main']))
  mkdirSync(join(directory, 'scripts'))
  mkdirSync(join(directory, '.githooks'))
  mkdirSync(join(directory, '.disabled-hooks'))
  copyFileSync(join(project, 'scripts/public-identity.mjs'), join(directory, 'scripts/public-identity.mjs'))
  for (const name of ['pre-commit', 'reference-transaction', 'pre-push']) {
    copyFileSync(join(project, '.githooks', name), join(directory, '.githooks', name))
  }
  writeFileSync(join(directory, 'package.json'), JSON.stringify({ name: 'dsh-more-details' }))
  succeeds(git(directory, ['remote', 'add', 'origin', publicRemote]))
  succeeds(git(directory, ['config', '--local', 'user.name', publicName]))
  succeeds(git(directory, ['config', '--local', 'user.email', publicEmail]))
  succeeds(guard(directory, ['install']))
  writeFileSync(join(directory, 'example.txt'), 'Public fixture\n')
  succeeds(git(directory, ['add', 'example.txt']))
  succeeds(git(directory, ['commit', '--quiet', '-m', 'Initial fixture']))
  return directory
}

function head(directory) {
  return succeeds(git(directory, ['rev-parse', 'HEAD']))
}

function hasRef(directory, name) {
  return git(directory, ['show-ref', '--verify', '--quiet', name]).status === 0
}

function badCommitObject(directory, options = {}) {
  const tree = succeeds(git(directory, ['rev-parse', 'HEAD^{tree}']))
  return succeeds(git(directory, ['commit-tree', tree, '-p', head(directory), '-m', 'Imported fixture'], {
    env: { GIT_AUTHOR_NAME: badName, GIT_AUTHOR_EMAIL: badEmail, ...options.env },
  }))
}

function receiver(directory) {
  const bare = mkdtempSync(join(scratch, 'receiver-'))
  succeeds(git(bare, ['init', '--bare', '--quiet']))
  succeeds(git(directory, ['remote', 'add', 'fixture', bare]))
  return bare
}

test('installation is repository-local and refuses an unrelated origin', () => {
  const directory = fixture()
  assert.equal(succeeds(git(directory, ['config', '--local', '--get', 'core.hooksPath'])), '.githooks')
  assert.equal(succeeds(git(directory, ['config', '--local', '--get', 'user.name'])), publicName)
  assert.equal(succeeds(git(directory, ['config', '--local', '--get', 'user.email'])), publicEmail)
  succeeds(git(directory, ['remote', 'set-url', 'origin', 'https://example.invalid/other/project.git']))
  succeeds(git(directory, ['config', '--local', '--unset', 'core.hooksPath']))
  blocked(guard(directory, ['install']))
  assert.notEqual(git(directory, ['config', '--local', '--get', 'core.hooksPath']).status, 0)
})

test('public commits, annotated tags, and a real push succeed', () => {
  const directory = fixture()
  succeeds(git(directory, ['commit', '--quiet', '--allow-empty', '-m', 'Public update']))
  succeeds(git(directory, ['tag', '-a', 'v1.0.0', '-m', 'Public release']))
  succeeds(guard(directory, ['check']))
  const bare = receiver(directory)
  succeeds(git(directory, ['push', 'fixture', 'main', 'refs/tags/v1.0.0']))
  assert.equal(succeeds(git(bare, ['rev-parse', 'refs/heads/main'])), head(directory))
  assert.equal(succeeds(git(bare, ['rev-parse', 'refs/tags/v1.0.0'])), succeeds(git(directory, ['rev-parse', 'refs/tags/v1.0.0'])))
})

test('explicit author and author environment overrides are blocked before moving HEAD', () => {
  const directory = fixture()
  const before = head(directory)
  blocked(git(directory, ['commit', '--allow-empty', '--author', `${badName} <${badEmail}>`, '-m', 'Wrong author']))
  assert.equal(head(directory), before)
  blocked(git(directory, ['commit', '--allow-empty', '-m', 'Wrong author environment'], {
    env: { GIT_AUTHOR_EMAIL: badEmail },
  }))
  assert.equal(head(directory), before)
})

test('committer name and email environment overrides are blocked', () => {
  const directory = fixture()
  const before = head(directory)
  for (const env of [{ GIT_COMMITTER_NAME: badName }, { GIT_COMMITTER_EMAIL: badEmail }]) {
    blocked(git(directory, ['commit', '--allow-empty', '-m', 'Wrong committer'], { env }))
    assert.equal(head(directory), before)
  }
})

test('no-verify cannot bypass the reference transaction guard', () => {
  const directory = fixture()
  const before = head(directory)
  blocked(git(directory, ['commit', '--no-verify', '--allow-empty', '--author', `${badName} <${badEmail}>`, '-m', 'Wrong author']))
  assert.equal(head(directory), before)
})

test('amend cannot retain an imported non-public author', () => {
  const directory = fixture()
  succeeds(git(directory, ['-c', 'core.hooksPath=.disabled-hooks', 'commit', '--allow-empty', '--author', `${badName} <${badEmail}>`, '-m', 'Imported author']))
  const before = head(directory)
  blocked(git(directory, ['commit', '--amend', '--allow-empty', '--no-edit']))
  assert.equal(head(directory), before)
})

test('cherry-pick cannot retain the source author through its fast path', () => {
  const directory = fixture()
  const before = head(directory)
  const imported = badCommitObject(directory)
  blocked(git(directory, ['cherry-pick', '--allow-empty', imported]))
  assert.equal(head(directory), before)
})

test('update-ref rejects an imported commit and does not create its branch', () => {
  const directory = fixture()
  const imported = badCommitObject(directory)
  blocked(git(directory, ['update-ref', 'refs/heads/imported', imported]))
  assert.equal(hasRef(directory, 'refs/heads/imported'), false)
})

test('a public tip cannot hide a non-public ancestor', () => {
  const directory = fixture()
  const imported = badCommitObject(directory)
  const tree = succeeds(git(directory, ['rev-parse', 'HEAD^{tree}']))
  const tip = succeeds(git(directory, ['commit-tree', tree, '-p', imported, '-m', 'Public tip']))
  blocked(git(directory, ['update-ref', 'refs/heads/imported', tip]))
  assert.equal(hasRef(directory, 'refs/heads/imported'), false)
})

test('non-public Co-authored-by trailers are rejected in actual commit objects', () => {
  const directory = fixture()
  const before = head(directory)
  blocked(git(directory, ['commit', '--no-verify', '--allow-empty', '-m', 'Coauthor fixture', '-m', `Co-authored-by: ${badName} <${badEmail}>`]))
  assert.equal(head(directory), before)
  succeeds(git(directory, ['commit', '--allow-empty', '-m', 'Public coauthor', '-m', `Co-authored-by: ${publicName} <${publicEmail}>`]))
})

test('annotated tagger overrides and lightweight tags are rejected without creating refs', () => {
  const directory = fixture()
  blocked(git(directory, ['tag', '-a', 'wrong-tagger', '-m', 'Wrong tagger'], {
    env: { GIT_COMMITTER_NAME: badName, GIT_COMMITTER_EMAIL: badEmail },
  }))
  assert.equal(hasRef(directory, 'refs/tags/wrong-tagger'), false)
  blocked(git(directory, ['tag', 'lightweight']))
  assert.equal(hasRef(directory, 'refs/tags/lightweight'), false)
})

test('nested annotated tags check the inner tagger as well as the outer tagger', () => {
  const directory = fixture()
  succeeds(git(directory, ['-c', 'core.hooksPath=.disabled-hooks', 'tag', '-a', 'inner', '-m', 'Inner fixture'], {
    env: { GIT_COMMITTER_NAME: badName, GIT_COMMITTER_EMAIL: badEmail },
  }))
  blocked(git(directory, ['tag', '-a', 'outer', 'inner', '-m', 'Outer fixture']))
  assert.equal(hasRef(directory, 'refs/tags/outer'), false)
})

test('annotated tags must ultimately refer to commits', () => {
  const directory = fixture()
  const tree = succeeds(git(directory, ['rev-parse', 'HEAD^{tree}']))
  blocked(git(directory, ['tag', '-a', 'tree-tag', tree, '-m', 'Tree fixture']))
  assert.equal(hasRef(directory, 'refs/tags/tree-tag'), false)
})

test('pre-push checks an explicitly pushed non-HEAD branch and all its ancestors', () => {
  const directory = fixture()
  const bare = receiver(directory)
  const imported = badCommitObject(directory)
  const tree = succeeds(git(directory, ['rev-parse', 'HEAD^{tree}']))
  const tip = succeeds(git(directory, ['commit-tree', tree, '-p', imported, '-m', 'Public tip']))
  succeeds(git(directory, ['-c', 'core.hooksPath=.disabled-hooks', 'update-ref', 'refs/heads/imported', tip]))
  blocked(git(directory, ['push', 'fixture', 'refs/heads/imported']))
  assert.equal(hasRef(bare, 'refs/heads/imported'), false)
  assert.notEqual(head(directory), tip)
})

test('pre-push checks annotated tags even when their commits are already public', () => {
  const directory = fixture()
  const bare = receiver(directory)
  succeeds(git(directory, ['push', 'fixture', 'main']))
  succeeds(git(directory, ['-c', 'core.hooksPath=.disabled-hooks', 'tag', '-a', 'bad-release', '-m', 'Fixture'], {
    env: { GIT_COMMITTER_EMAIL: badEmail },
  }))
  blocked(git(directory, ['push', 'fixture', 'refs/tags/bad-release']))
  assert.equal(hasRef(bare, 'refs/tags/bad-release'), false)
})

test('deletions with zero OIDs work locally and in pre-push', () => {
  const directory = fixture()
  const bare = receiver(directory)
  succeeds(git(directory, ['branch', 'temporary']))
  succeeds(git(directory, ['push', 'fixture', 'refs/heads/temporary']))
  succeeds(git(directory, ['push', 'fixture', ':refs/heads/temporary']))
  assert.equal(hasRef(bare, 'refs/heads/temporary'), false)
  succeeds(git(directory, ['branch', '-D', 'temporary']))
  assert.equal(hasRef(directory, 'refs/heads/temporary'), false)
})

test('fetch-only remote refs are not mistaken for local publication refs', () => {
  const directory = fixture()
  const imported = badCommitObject(directory)
  succeeds(git(directory, ['update-ref', 'refs/remotes/review/imported', imported]))
  assert.equal(hasRef(directory, 'refs/remotes/review/imported'), true)
  succeeds(guard(directory, ['check']))
})

test('symbolic HEAD updates allow switching existing and unborn branches', () => {
  const directory = fixture()
  const original = head(directory)
  succeeds(git(directory, ['switch', '-c', 'topic']))
  assert.equal(succeeds(git(directory, ['symbolic-ref', 'HEAD'])), 'refs/heads/topic')
  assert.equal(head(directory), original)
  succeeds(git(directory, ['switch', 'main']))
  assert.equal(head(directory), original)
  succeeds(git(directory, ['switch', '--orphan', 'fresh']))
  assert.equal(succeeds(git(directory, ['symbolic-ref', 'HEAD'])), 'refs/heads/fresh')
  assert.equal(hasRef(directory, 'refs/heads/fresh'), false)
  succeeds(git(directory, ['commit', '--quiet', '--allow-empty', '-m', 'Public root']))
  assert.equal(succeeds(git(directory, ['rev-list', '--count', 'HEAD'])), '1')
  succeeds(git(directory, ['switch', 'main']))
  assert.equal(head(directory), original)
})

test('mailmap and replace refs cannot mask raw author metadata', () => {
  const directory = fixture()
  const imported = badCommitObject(directory)
  writeFileSync(join(directory, '.mailmap'), `${publicName} <${publicEmail}> ${badName} <${badEmail}>\n`)
  succeeds(git(directory, ['-c', 'core.hooksPath=.disabled-hooks', 'update-ref', 'refs/heads/imported', imported]))
  succeeds(git(directory, ['replace', imported, head(directory)]))
  blocked(guard(directory, ['check']))
})

test('release with a bad tag never invokes the GitHub release command', () => {
  const directory = fixture()
  succeeds(git(directory, ['-c', 'core.hooksPath=.disabled-hooks', 'tag', '-a', 'bad-release', '-m', 'Fixture'], {
    env: { GIT_COMMITTER_EMAIL: badEmail },
  }))
  const bin = join(directory, 'fake-bin')
  mkdirSync(bin)
  const calls = join(directory, 'gh-calls.log')
  writeFileSync(join(bin, 'gh'), '#!/bin/sh\nprintf "%s\\n" "$*" >> "$GH_FIXTURE_LOG"\nprintf "RZRZ-Q\\n"\n', { mode: 0o755 })
  writeFileSync(join(directory, 'notes.md'), 'Public fixture release\n')
  blocked(guard(directory, ['release', 'bad-release', '--title', 'Fixture', '--notes-file', 'notes.md'], {
    env: { PATH: `${bin}:${environment.PATH}`, GH_FIXTURE_LOG: calls },
  }))
  let invocations = ''
  try { invocations = readFileSync(calls, 'utf8') } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  assert.equal(invocations.includes('release create'), false)
})

test('release rejects an effective identity override before calling GitHub', () => {
  const directory = fixture()
  succeeds(git(directory, ['tag', '-a', 'v1.0.0', '-m', 'Public release']))
  const bin = join(directory, 'fake-bin')
  mkdirSync(bin)
  const calls = join(directory, 'gh-calls.log')
  writeFileSync(join(bin, 'gh'), '#!/bin/sh\nprintf "%s\\n" "$*" >> "$GH_FIXTURE_LOG"\nprintf "RZRZ-Q\\n"\n', { mode: 0o755 })
  writeFileSync(join(directory, 'notes.md'), 'Public fixture release\n')
  blocked(guard(directory, ['release', 'v1.0.0', '--title', 'Fixture', '--notes-file', 'notes.md'], {
    env: { PATH: `${bin}:${environment.PATH}`, GH_FIXTURE_LOG: calls, GIT_COMMITTER_EMAIL: badEmail },
  }))
  assert.throws(() => readFileSync(calls), { code: 'ENOENT' })
})

test('release rejects a different GitHub account before querying the remote tag', () => {
  const directory = fixture()
  succeeds(git(directory, ['tag', '-a', 'v1.0.0', '-m', 'Public release']))
  const bin = join(directory, 'fake-bin')
  mkdirSync(bin)
  const calls = join(directory, 'gh-calls.log')
  writeFileSync(join(bin, 'gh'), '#!/bin/sh\nprintf "%s\\n" "$*" >> "$GH_FIXTURE_LOG"\nprintf "FixtureAccount\\n"\n', { mode: 0o755 })
  writeFileSync(join(directory, 'notes.md'), 'Public fixture release\n')
  blocked(guard(directory, ['release', 'v1.0.0', '--title', 'Fixture', '--notes-file', 'notes.md'], {
    env: { PATH: `${bin}:${environment.PATH}`, GH_FIXTURE_LOG: calls },
  }))
  assert.equal(readFileSync(calls, 'utf8').trim(), 'api user --jq .login')
})

test('npm publication checks the public account, committed package, and published version tag without publishing', () => {
  const directory = fixture()
  writeFileSync(join(directory, 'package.json'), JSON.stringify({
    name: 'dsh-more-details', version: '1.0.0',
    author: { name: publicName, url: `https://github.com/${publicName}` },
    publishConfig: { registry: 'https://registry.npmjs.org', access: 'public' },
  }))
  succeeds(git(directory, ['add', 'package.json']))
  succeeds(git(directory, ['commit', '--quiet', '-m', 'Public npm package']))
  succeeds(git(directory, ['tag', '-a', 'v1.0.0', '-m', 'Public release']))
  const bare = receiver(directory)
  succeeds(git(directory, ['push', 'fixture', 'refs/tags/v1.0.0']))
  const bin = join(directory, 'fake-bin')
  mkdirSync(bin)
  writeFileSync(join(bin, 'gh'), '#!/bin/sh\nprintf "RZRZ-Q\\n"\n', { mode: 0o755 })
  writeFileSync(join(bin, 'npm'), '#!/bin/sh\n[ "$1" = whoami ] || exit 77\nprintf "%s\\n" "$NPM_FIXTURE_USER"\n', { mode: 0o755 })
  const realGit = succeeds(run(directory, 'which', ['git']))
  writeFileSync(join(bin, 'git'), '#!/bin/sh\nif [ "$1" = ls-remote ] && [ "$3" = origin ]; then shift 3; exec "$GIT_FIXTURE_REAL" ls-remote --refs "$GIT_FIXTURE_BARE" "$@"; fi\nexec "$GIT_FIXTURE_REAL" "$@"\n', { mode: 0o755 })
  const env = { PATH: `${bin}:${environment.PATH}`, NPM_FIXTURE_USER: 'rzrz-q',
    GIT_FIXTURE_REAL: realGit, GIT_FIXTURE_BARE: bare }
  succeeds(guard(directory, ['npm-check'], { env }))
  const rejected = guard(directory, ['npm-check'], { env: { ...env, NPM_FIXTURE_USER: 'fixture-private' } })
  blocked(rejected)
  assert.equal(rejected.stderr.includes('fixture-private'), false)
  writeFileSync(join(directory, 'example.txt'), 'Uncommitted change\n')
  blocked(guard(directory, ['npm-check'], { env }))
  writeFileSync(join(directory, 'example.txt'), 'Public fixture\n')
  succeeds(git(directory, ['commit', '--allow-empty', '--quiet', '-m', 'After release']))
  blocked(guard(directory, ['npm-check'], { env }))
})

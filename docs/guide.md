# User and development guide

[Project overview](../README.md) · [Chinese guide](guide.zh.md)

## Supported environments

Current version: **0.3.18**, declaring **DSH 0.2.0-rc.2, 0.2.1-alpha.4, 0.2.1-rc.1, 0.2.1-rc.2, 0.2.1-rc.3, and 0.2.1-rc.5**. Web Chat needs the official Desktop browser guest. In an ordinary browser, the plugin hides New Chat and disables More details with an explanation. Add to chat, API side chat, saved-reference previews, and on-demand snapshot reading remain available; reopening the website inside the plugin is Desktop-only. Windows/Linux full feature acceptance is still unverified.

Validation is recorded by release rather than implied for every update:

| Plugin release | Verified scope |
| --- | --- |
| 0.3.18 | Exact rc.5 support with all five earlier hosts retained. Six-host installation/import checks and 349 tests passed. Isolated macOS rc.5 passed automatic sending, actual model reference reads, full restart recovery, signed-in history reopening, and follow-up. The existing official rc.5 installation retained sign-in, history, settings, sessions, and attachments. |
| 0.3.17 | 349 tests and isolated macOS rc.3 acceptance passed: sidebar New Chat / Continue chat, an unobstructed main send control, restoration of the same webpage and unsent draft without duplicate sending, reference capture, and history reopening. Installation preserved all 110 protected files. Automatic selection sending, main-model reference-tool reading, and full restart recovery were not rerun. |
| 0.3.16 | Five-version installation/imports, 345 tests, and isolated rc.3 Desktop automatic sending, reference reading, restart recovery, and follow-up passed. Real npm migration from tgz and Git preserved data; removing the old archive did not block installation. The npm-installed rc.3 Desktop read the saved snapshot before opening the website, then reopened the original discussion without signing in. |
| 0.3.14 | Compatibility declarations and development dependencies updated for DSH 0.2.1-rc.2 while retaining both older versions. All three dependency environments passed typechecking and 340 tests, with clean-profile installation and imports. The independent 0.2.1-rc.2 Desktop passed automatic sending, reference reading, and full restart/history/follow-up recovery. Older hosts passed final-package cold startup, historical-reference reading, and signed-in reopening; their complete workflows were not repeated. |
| 0.3.13 | 340 tests against each supported DSH version; native-market Git installation, Host loading, and process-restart checks in a fresh isolated alpha.4 profile. This distribution update adds the publisher-maintained index, complete CSS assets, and non-JIT Zod Mini validation without changing saved data or the wire contract. It did not repeat Desktop interaction or model-send acceptance. |
| 0.3.12 | Earlier macOS arm64 Desktop acceptance for language switching and recovery. |
| 0.3.11 | Earlier macOS arm64 Desktop acceptance for automatic sending, follow-up questions, and on-demand reading. |

See [version compatibility](open-source/compatibility.md), [validation records](open-source/validation.md), and [distribution and capabilities](open-source/distribution.md) for the exact environments, checks, and limits. These detailed records are currently maintained in Chinese.

## Installation and upgrades

### npm (recommended)

In **Plugins → Add plugin**, enter `dsh-more-details@0.3.18`. DSH installs the precompiled package from npm and checks host compatibility. Use the same profile when upgrading; changing the package source does not require removing plugin data.

For the Desktop CLI, use the **CLI bundled with your Desktop installation**. Fully quit the test/target DSH instance before a CLI installation, then reopen it. This macOS example assumes `~/Applications`; adjust the executable path for your installation:

```sh
"$HOME/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh" plugin --profile desktop add dsh-more-details@0.3.18
```

For browser-hosted DSH, use its own CLI and profile, for example `dsh plugin --profile web add dsh-more-details@0.3.18`. Do not use a separately installed CLI to manage the Desktop profile, or run bare `pnpm add` in an arbitrary directory. Future upgrades use the same command with the desired compatible version. If a registry mirror has not synchronized a newly released version, add `--registry=https://registry.npmjs.org` to that installation command; this does not change global registry settings.

### Discover

DSH 0.2.1-alpha.4, 0.2.1-rc.1, 0.2.1-rc.2, 0.2.1-rc.3, and 0.2.1-rc.5 support the author's native market index:

1. In **Plugins → Experimental plugins → More**, enable **Custom plugin market**.
2. In **Discover → Add index source**, add `https://raw.githubusercontent.com/RZRZ-Q/dsh-more-details/main/market/index.json`.
3. Select **More Details · Web Chat**, review the version/source, and install it.

New versions use an exact npm version; older entries retain their pinned Git commits. The index allows one source per version, so Git and npm are not duplicate entries for the same version. This is an author-maintained catalog, not a DeepSeek endorsement. DSH 0.2.0-rc.2 has no Discover; use npm through its installer/CLI or a release archive.

### Git and release archives

- **Git:** use the full public commit associated with the desired release: `git+https://github.com/RZRZ-Q/dsh-more-details.git#<full-commit>`. Enter it in **Add plugin** or pass it to the bundled `dsh plugin --profile desktop add` command. Built runtime files are committed.
- **Archive:** download `dsh-more-details-0.3.18.tgz` from the [release](https://github.com/RZRZ-Q/dsh-more-details/releases/tag/v0.3.18) and install via **Add plugin**. The source archive and `SHA256SUMS` are provided separately.

A local archive can remain a `file:` dependency of the profile. Keep the archive at its recorded path while that dependency exists; moving or deleting it can block other package operations in the same profile. Prefer npm for installations that should not depend on local archive storage.

### Migrate an existing tgz or Git installation

1. Back up the target profile and fully quit that DSH instance before CLI changes. Keep the same profile, plugin name, credentials, attachments, and browser data.
2. Install `dsh-more-details@0.3.18` through the matching DSH installer/CLI. This replaces the package source; do not uninstall the plugin and delete its data first.
3. Reopen DSH and check the version, custom prompt, history, existing references, and remembered website sign-in. Website sessions can expire independently.
4. Remove the old archive only after the profile's dependency for this plugin no longer points to it and another plugin/package operation succeeds.

If the old tgz is already missing and migration fails, restore that exact archive to the path named in the error first, then retry the source replacement. Do not delete the profile, credentials, conversations, or attachments to repair a package path.

After installation, disable a duplicate AHGGG plugin and fully quit/reopen DSH so both Host and Client load the new version.

## Use a web discussion

1. Click **New Chat** in the sidebar and sign in to the DeepSeek website inside the panel. This web login is separate from the account or provider configured for DSH's main model.
2. Select text in a completed main-conversation message, click **More details**, and wait for the web reply.
3. Edit the instruction through **Prompt** in the panel or **Settings → General settings → More details**. The bundled default prompt is in Chinese, meaning “Tell me more about this.” You can save your own instruction or restore the default. Upgrades preserve saved custom values; switching the interface language does not translate prompt text.
4. Use **New** for a blank web chat or **History** to reopen a discussion. Reopening history does not resend the previous question.
5. Collapse the panel to return to the main composer. **Continue chat** appears in the left sidebar and restores the same webpage without creating a chat or sending a message. **New Chat** remains a separate action. The collapsed panel no longer leaves a button over the bottom-right send control; a compact sidebar shows the actions as icons with tooltips.

Further selections from the same DSH conversation can continue its active web discussion. Switching the source conversation, starting a blank chat, or manually reopening history makes the next **More details** request start a separate discussion.

The selection menu has three distinct actions:

| Action | Destination |
| --- | --- |
| Add to chat | Adds the selected passage and an optional comment to the main draft. |
| More details | Sends the selection and its source context to a persistent DeepSeek web discussion. |
| Ask in side chat | Opens the original temporary discussion using a model configured in DSH, with model selection and follow-up questions. This is separate from the website flow. |

Drag the web panel's top-left corner, top edge, or left edge to resize it. It can also be expanded, restored, or collapsed. Resizing keeps the same page and does not resend messages. Panel dimensions and expanded state are remembered across restarts.

## Bring a discussion back to the main conversation

1. After the web reply finishes, check the target conversation shown beside **Add to**, then click **Add to DSH**.
2. A reference card appears in that conversation's draft without replacing its existing text. Add your question and send the draft yourself, for example: “Use the referenced discussion to explain this further, reading its text as needed.”
3. The card carries a preview. The main model can call the paginated `read_webchat_reference` tool to read the saved text when needed, including after a full restart and without opening the website.
4. Click a reference card in a draft or sent message to reopen the original web chat and continue asking questions.

Adding the same discussion again updates its unsent reference. Previously sent snapshots remain unchanged, even if you later continue the website conversation. Add the discussion again when you want to bring newer messages into DSH.

Adding a reference neither creates a public sharing link nor sends your main-conversation draft automatically.

## Data flow and storage

### Context sent to the website

Clicking **More details** sends the selected text, its source message, and some main-conversation history to DeepSeek as a visible user message. They are organized separately, with the selected text taking priority.

- Selected text: at most **16 KiB of UTF-8 text**.
- Source message: at most **40,000 JavaScript string code units**.
- Other history: at most **80,000 JavaScript string code units**, covering up to the **five most recent completed turns**, with up to **100 body messages per turn**.

Omitted content is marked explicitly. These budgets are not a promise about the website's input limit. System and developer messages, reasoning blocks, and attachment bytes are not copied automatically. Tool calls may appear as textual context.

### History and reference snapshots

DeepSeek stores web chats under your account. The plugin's local history indexes only visited URLs, titles, source sessions, and timestamps; it does not mirror your entire account history.

**Add to DSH** separately saves a text snapshot of the currently rendered branch through DSH's attachment storage. The snapshot is always marked `partial`: earlier messages that have not loaded, images, and other non-text content are not included. The card shows a preview; the reading tool provides all captured text through pagination.

`read_webchat_reference` reads only references you have submitted in the current DSH conversation. It does not need to open the website and does not include login credentials.

### Website sign-in

Login records are stored separately through DSH's credentials service: three required login fields plus an optional website language preference. The default store is a local file with mode `0600`, not macOS Keychain. The plugin does not export a complete cookie store or browser profile.

Wait until the panel shows **Web sign-in remembered** before quitting. A valid saved login can be restored after restarting DSH. Expired tokens or a new verification request may still require signing in again.

## FAQ

**Why is the website in a different language?**

Its language setting is separate from DSH. Choose your preferred language in the website's settings; the plugin remembers and restores it. The surrounding plugin controls follow DSH's language setting without changing the website language.

**What changes when I switch DSH's language?**

From 0.3.12, the launcher, panel buttons, history, prompt settings, accessibility labels, status messages, reference cards, and selection actions switch between Chinese and English immediately. Saved prompts, unsaved drafts, chat titles, and captured text remain unchanged. The bundled default prompt remains in Chinese; edit it through **Prompt** if you want a different instruction. External error details are shown in their original language.

**Will I need to sign in after every restart?**

A valid saved login can be restored once the panel has shown **Web sign-in remembered**. Website token expiry or a new verification request can still require you to sign in again. DSH's model-provider configuration does not sign you in to the website.

**What if sending is unconfirmed?**

Check the website first. The plugin confirms a send only after observing a new user message in the expected chat; it does not automatically repeat an uncertain submission.

**How does this relate to the old Codex feature?**

The earlier Codex **More details** and small Chat window are the main interaction reference: explore a passage in a separate discussion while keeping the main conversation available. This plugin implements that experience with DeepSeek web models and its own prompt/context assembly. It does not reuse Codex internals or promise identical answers.

## Development and contributions

Requires Node.js `^22.19.0 || >=24.0.0`. The pnpm version is specified in `package.json`.

```sh
pnpm install --frozen-lockfile
pnpm run check
mkdir -p dist
npm pack --ignore-scripts --pack-destination dist
```

The repository includes built `lib/` artifacts. npm publication is restricted by the repository identity guard and runs only from reviewed, committed source with a matching remote annotated tag. Consumer installation does not run the maintainer publication checks. GitHub Releases and the native market index remain distribution channels. Community DSH-Store submission status and capability disclosures are tracked in [distribution](open-source/distribution.md); submission is not store approval.

Issues and pull requests are welcome in English or Chinese. Use concise English titles for new commits in the form `type(scope): summary`, with an optional scope, for example `docs: add bilingual readmes`. A commit body may include Chinese explanations when useful. Keep published history intact. Update both READMEs and the relevant guide sections when features, installation steps, or compatibility change. Detailed validation and comparison documents are currently maintained in Chinese. New release notes use English with a Chinese version.

### Maintainer identity checks

The public maintainer checkout uses the identity allowlist in [AGENTS.md](../AGENTS.md). After configuring that identity locally, run:

```sh
npm run identity:install
npm run identity:check
npm run identity:test
```

Installation only sets this checkout's `core.hooksPath` to `.githooks`; it does not change global Git settings or other repositories. External contributors should retain their own attribution and should not install this maintainer-only guard. Plugin installation does not install Git hooks.

The hooks reject incorrect author/committer names and emails, co-author trailers, and tagger identities. They inspect the actual commit objects before a branch or tag update, including inherited authors from amend or cherry-pick, and scan all history reachable from every pushed ref. Public tags must be annotated; nested taggers are checked too. This checks identity metadata, not cryptographic signatures. A complete clone is required; mailmaps and replacement objects cannot substitute identities.

Publish through the guarded command after pushing the verified annotated tag:

```sh
npm run release:publish -- vX.Y.Z --title "vX.Y.Z" --notes-file docs/open-source/release-notes.md dist/plugin.tgz dist/source.tar.gz
```

The command verifies the GitHub account and the exact remote tag object before creating the Release with `--verify-tag`. It also accepts `--draft` and `--prerelease`; add `--check-only` to run the same checks without creating a Release. It will not create a missing tag. Local hooks can be disabled by an administrator, and direct GitHub CLI/API or website publishing bypasses this command; these are workflow checks, not server-side access controls. Maintainer automation must use the guarded command.

## Further documentation

- [Validation and self-test steps](open-source/validation.md) (Chinese): engineering checks, Desktop results by version, and unverified areas.
- [Version compatibility](open-source/compatibility.md) (Chinese): supported DSH versions, environments, and results.
- [Distribution and capabilities](open-source/distribution.md) (Chinese): packaging, market installation, and store submission status.
- [Related projects and feature comparison](open-source/comparison.md) (Chinese): fixed source revisions and evidence links.
- [Release notes](open-source/release-notes.md) (English and Chinese; earlier releases in Chinese).
- [Upstream adaptation scope](../UPSTREAM.md) (Chinese), [third-party notices](../THIRD_PARTY_NOTICES.md), and [MIT license](../LICENSE).

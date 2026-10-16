# More Details · DSH Web Chat

English | [简体中文](README.zh.md)

Select text in a DeepSeek Harness conversation and click **More details**. A DeepSeek web chat opens in the bottom-right corner and automatically sends your selection with its source context. When you are ready, **Add to DSH** brings the discussion back as a reference card that can reopen the original chat and let the main model read its saved text on demand.

Built on [AHGGG/dsh-side-chat](https://github.com/AHGGG/dsh-side-chat), using the real `chat.deepseek.com` website and official DSH plugin APIs. No client modification or macOS Accessibility permission is needed.

```text
Select text → More details → DeepSeek web chat → Reopen history / Follow up
                                      ↓ Add to DSH
Main conversation draft ← Reference card + snapshot of rendered messages
          ↓ You send the draft
The main model reads the snapshot on demand; the card reopens the web chat.
```

## Features

- **Independent web discussions.** The sidebar's New Chat action opens a blank web chat. More details sends the selection and its source context. An active discussion can continue for the same source; switching sources or manually reopening history makes the next selection start a separate discussion.
- **Editable default prompt.** The default is `告诉我更多相关信息` ("Tell me more about this"). Save your own instruction or restore the default. Upgrades preserve saved custom values. The selection, its source message, and other history are organized separately, with the selected text taking priority.
- **History and recovery.** Reopen chats visited through the plugin and continue the conversation. Remember web login, website language, panel dimensions, and expanded state across restarts.
- **Resizable panel.** Drag its top-left corner, top edge, or left edge; expand, restore, or collapse it. Resizing keeps the same web page and does not resend messages.
- **Bring discussions back to DSH.** Add a reference card to your draft without replacing existing text. You decide when to send it. Text snapshots use DSH's attachment storage; the main model reads them through the paginated `read_webchat_reference` tool, including after a full restart.
- **Bilingual plugin controls.** The launcher, panel actions, history, settings, status messages, reference cards, and selection actions follow DSH’s Chinese or English setting immediately. Switching languages keeps the same webpage, drafts, prompt text, and conversation content.

## Installation and use

Current version: **0.3.12**, supporting **DSH 0.2.0-rc.2 and 0.2.1-alpha.4**. Live language switching and restart recovery passed on isolated macOS arm64 builds from official source for both versions. An existing official rc.2 installation also passed an in-place upgrade to 0.3.12 with login, history, and settings preserved, without upgrading the client. Core sending and on-demand reading flows were validated in 0.3.11; this UI update did not repeat model sends or tool reads. See the [compatibility notes](docs/open-source/compatibility.md) and [validation record](docs/open-source/validation.md), both in Chinese. Windows and Linux have not been validated. The panel requires Desktop's browser guest; DSH running in an ordinary browser is outside the current support scope.

Download the installation package, source archive, and `SHA256SUMS` from the [v0.3.12 release](https://github.com/RZRZ-Q/dsh-more-details/releases/tag/v0.3.12). You can also [build from source](#development-and-validation).

1. Download `dsh-more-details-0.3.12.tgz` from the release, then install and enable it through DSH's **Plugins → Add plugin**. To upgrade, use the same Desktop profile and keep its existing data. Disable the original AHGGG plugin to avoid duplicate selection menus.
2. Fully quit and reopen DSH. Click **New Chat** (`新建 Chat`) in the sidebar and sign in to the DeepSeek website inside the panel. This login is separate from the account or provider configured for DSH's main model.
3. Select text in a completed main-conversation message, click **More details** (`更多详情`), and wait for the web reply. Edit the default instruction through **Prompt** (`提示词`) in the panel or **Settings → General settings → More details** (`更多详情`).
4. Use **New** (`新建`) for a blank chat and **History** (`历史`) to reopen an existing discussion. Reopening history does not resend the previous question.
5. After the web reply finishes, check the target conversation shown beside **Add to** (`添加到`), then click **Add to DSH** (`添加到 DSH`). Add your question alongside the reference card and send the draft, for example: "Use the referenced discussion to explain this further, reading its text as needed."
6. Click a reference card in a draft or sent message to reopen the original web chat. Adding the same discussion again updates its unsent reference; previously sent snapshots remain unchanged.

For CLI installation, use the **CLI bundled with Desktop**. This macOS example assumes the app is installed under `~/Applications`; adjust the path if needed:

```sh
"$HOME/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh" plugin --profile desktop add /absolute/path/dsh-more-details-0.3.12.tgz
```

Fully quit and reopen DSH after upgrading so the Host loads the new configuration and RPC interfaces. Reloading only the plugin can retain cached interfaces. Do not use a separately installed CLI to modify the Desktop profile.

## Data flow

Clicking More details sends the selected text, its source message, and some main-conversation history to the DeepSeek website as a visible user message. Selections are limited to 16 KiB of UTF-8 text. The source message and other history have separate limits of 40,000 and 80,000 JavaScript string code units. History includes at most the five most recent completed turns, with up to 100 body messages per turn. Omitted content is marked explicitly; these budgets are not a promise about the website's input limit. System and developer messages, reasoning blocks, and attachment bytes are not copied automatically. Tool calls may appear as textual context.

DeepSeek stores the web chats under your account. The plugin's history indexes only visited URLs, titles, source sessions, and timestamps; it does not mirror your entire account history. **Add to DSH** separately saves a text snapshot of the currently rendered branch, always marked `partial`. Earlier messages that have not loaded, images, and other non-text content are not included. A card shows a preview; the reading tool provides all captured text through pagination.

`read_webchat_reference` reads only references you have submitted in the current DSH conversation. It does not need to open the website and does not include login credentials. Adding a reference neither creates a public sharing link nor sends your draft automatically. Login records are stored separately through DSH's credentials service: three required login fields plus an optional language preference. The default store is a local file with mode `0600`, not macOS Keychain. The plugin does not export a complete cookie store or browser profile.

## FAQ

- **Why is the website in a different language?** Its language setting is separate from DSH. Choose your preferred language in the website's settings; the plugin remembers and restores it. The surrounding plugin controls follow DSH's language setting without changing the website language.
- **What changes when I switch DSH’s language?** From 0.3.12, the launcher, panel buttons, history, prompt settings, accessibility labels, status messages, and reference cards switch between Chinese and English immediately. Saved prompts, unsaved drafts, chat titles, and captured text remain unchanged. The default prompt stays `告诉我更多相关信息`; edit it if you want a different instruction. External error details are shown in their original language.
- **Will I need to sign in after every restart?** Wait until the panel shows “Web sign-in remembered” (`已记住网页登录`) before quitting. A valid saved login can be restored. Expired tokens or a new verification request may still require signing in again.
- **What if sending is unconfirmed?** Check the website first. The plugin confirms a send only after observing a new user message in the expected chat; it does not automatically repeat an uncertain submission.
- **Is this identical to the old Codex feature?** It recreates similar interaction, the default instruction, and source-context organization using DeepSeek's web models. It does not promise identical hidden context or generated answers.

## Development and validation

Requires Node.js `^22.19.0 || >=24.0.0`. The pnpm version is specified in `package.json`.

```sh
pnpm install --frozen-lockfile
pnpm run check
mkdir -p dist
npm pack --ignore-scripts --pack-destination dist
```

The repository includes built `lib/` artifacts. `private: true` in `package.json` prevents accidental npm publication; it does not prevent open-source distribution, local packaging, or DSH installation. Distribution currently uses GitHub source and package downloads. The plugin has not been submitted to npm or the DSH store.

Issues and pull requests are welcome in English or Chinese. Use concise English titles for new commits in the form `type(scope): summary`, with an optional scope, for example `docs: add bilingual readmes`. A commit body may include Chinese explanations when useful. Keep published history intact. Update both READMEs when features, installation steps, or compatibility change; detailed validation and comparison documents are currently maintained in Chinese. New release notes use English with a Chinese version.

Further documentation:

- [Validation and self-test steps](docs/open-source/validation.md) (Chinese): engineering checks, desktop results by version, and unverified areas.
- [Version compatibility](docs/open-source/compatibility.md) (Chinese): rc.2 and alpha.4 changes, environments, and results.
- [Related projects and feature comparison](docs/open-source/comparison.md) (Chinese): fixed source revisions and evidence links.
- [v0.3.12 release notes](docs/open-source/release-notes.md) (English and Chinese; earlier releases in Chinese).

## Attribution and license

Licensed under [MIT](LICENSE), retaining the upstream copyright. **AHGGG/dsh-side-chat** provides the foundation for selection actions, references, and temporary side chats. Web guest handling and input adaptation reference **Ckarefulon/dsh-deepseek-webchat**; text extraction references **FrostLeafKEE/dsh-chat-bridge**. Zod is included in the runtime bundle. See [UPSTREAM.md](UPSTREAM.md) for the adaptation scope (Chinese) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for fixed revisions and third-party licenses.

This is a community plugin, not an official DeepSeek or OpenAI product.

# User and development guide

[Project overview](../README.md) · [Chinese guide](guide.zh.md)

## Supported environments

Current version: **0.3.13**, supporting **DSH 0.2.0-rc.2 and 0.2.1-alpha.4**. The web panel requires Desktop's browser guest; browser-only DSH is outside the current support scope. Windows and Linux have not been validated.

Validation is recorded by release rather than implied for every update:

| Plugin release | Verified scope |
| --- | --- |
| 0.3.13 | 340 tests against each supported DSH version; native-market Git installation, Host loading, and process-restart checks in a fresh isolated alpha.4 profile. This distribution update adds the publisher-maintained index, complete CSS assets, and non-JIT Zod Mini validation without changing saved data or the wire contract. It did not repeat Desktop interaction or model-send acceptance. |
| 0.3.12 | Earlier macOS arm64 Desktop acceptance for language switching and recovery. |
| 0.3.11 | Earlier macOS arm64 Desktop acceptance for automatic sending, follow-up questions, and on-demand reading. |

See [version compatibility](open-source/compatibility.md), [validation records](open-source/validation.md), and [distribution and capabilities](open-source/distribution.md) for the exact environments, checks, and limits. These detailed records are currently maintained in Chinese.

## Installation and upgrades

### Release package

1. Download `dsh-more-details-0.3.13.tgz` from the [v0.3.13 release](https://github.com/RZRZ-Q/dsh-more-details/releases/tag/v0.3.13). The release also includes the source archive and `SHA256SUMS`.
2. Install and enable it through DSH's **Plugins → Add plugin**. To upgrade, use the same Desktop profile and keep its existing data.
3. Disable the original AHGGG plugin if it is installed, to avoid duplicate selection menus.
4. Fully quit and reopen DSH so the Host loads the new configuration and RPC interfaces. Reloading only the plugin can retain cached interfaces.

### Discover in DSH 0.2.1-alpha.4

1. In **Plugins → Experimental plugins → More**, enable **Custom plugin market**.
2. Open **Discover → Add index source** and paste:

   ```text
   https://raw.githubusercontent.com/RZRZ-Q/dsh-more-details/main/market/index.json
   ```

3. Select **More Details · Web Chat**, check the repository and pinned commit in the installation confirmation, and install it.
4. Disable any duplicate original plugin, then fully quit and reopen DSH.

The index is maintained by this plugin's author; it is not a DeepSeek-endorsed catalog. It points to immutable Git commits and does not require npm publication. DSH rc.2 does not have Discover; use the release package instead. The web panel still requires Desktop.

### Desktop CLI

Use the **CLI bundled with Desktop**. This macOS example assumes the app is installed under `~/Applications`; adjust the path if needed:

```sh
"$HOME/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh" plugin --profile desktop add /absolute/path/dsh-more-details-0.3.13.tgz
```

Fully quit and reopen DSH after installation or an upgrade. Do not use a separately installed CLI to modify the Desktop profile.

## Use a web discussion

1. Click **New Chat** in the sidebar and sign in to the DeepSeek website inside the panel. This web login is separate from the account or provider configured for DSH's main model.
2. Select text in a completed main-conversation message, click **More details**, and wait for the web reply.
3. Edit the instruction through **Prompt** in the panel or **Settings → General settings → More details**. The bundled default prompt is in Chinese, meaning “Tell me more about this.” You can save your own instruction or restore the default. Upgrades preserve saved custom values; switching the interface language does not translate prompt text.
4. Use **New** for a blank web chat or **History** to reopen a discussion. Reopening history does not resend the previous question.

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

The repository includes built `lib/` artifacts. `private: true` in `package.json` prevents accidental npm publication; it does not prevent open-source distribution, local packaging, or DSH installation. Distribution uses GitHub Releases and the native market index. The plugin is not published to npm. Community DSH-Store submission status and capability disclosures are tracked in [distribution](open-source/distribution.md); submission is not store approval.

Issues and pull requests are welcome in English or Chinese. Use concise English titles for new commits in the form `type(scope): summary`, with an optional scope, for example `docs: add bilingual readmes`. A commit body may include Chinese explanations when useful. Keep published history intact. Update both READMEs and the relevant guide sections when features, installation steps, or compatibility change. Detailed validation and comparison documents are currently maintained in Chinese. New release notes use English with a Chinese version.

## Further documentation

- [Validation and self-test steps](open-source/validation.md) (Chinese): engineering checks, Desktop results by version, and unverified areas.
- [Version compatibility](open-source/compatibility.md) (Chinese): rc.2 and alpha.4 changes, environments, and results.
- [Distribution and capabilities](open-source/distribution.md) (Chinese): packaging, market installation, and store submission status.
- [Related projects and feature comparison](open-source/comparison.md) (Chinese): fixed source revisions and evidence links.
- [v0.3.13 release notes](open-source/release-notes.md) (English and Chinese; earlier releases in Chinese).
- [Upstream adaptation scope](../UPSTREAM.md) (Chinese), [third-party notices](../THIRD_PARTY_NOTICES.md), and [MIT license](../LICENSE).

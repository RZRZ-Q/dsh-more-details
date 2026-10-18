# More Details · DSH Web Chat

English | [Simplified Chinese](README.zh.md)

**The classic Codex “More details” experience, brought to DeepSeek Harness.**

Select a passage, explore it in a bottom-right DeepSeek Web Chat, and return to your main conversation with a reference. Start fresh chats, reopen history, and keep asking questions without losing your place.

[Download v0.3.15](https://github.com/RZRZ-Q/dsh-more-details/releases/tag/v0.3.15) · [User guide](docs/guide.md) · [Release notes](docs/open-source/release-notes.md)

![A DeepSeek Web Chat discussion beside the original DSH conversation.](docs/assets/screenshots/webchat.jpg)

*Actual DSH interface on macOS: explore a passage in Web Chat while keeping the main conversation in view.*

<details>
<summary>See the flow: select a passage → discuss it → bring it back</summary>

Select text in a response and click **More details** to open a web discussion with the passage and its context sent automatically.

![Selected text and the More details action in DSH.](docs/assets/screenshots/selection.jpg)

Click **Add to DSH** to attach a reference to your main draft. Send it with a question so the model can read the saved discussion on demand.

![A web discussion attached to the main DSH conversation as a reference card.](docs/assets/screenshots/reference.jpg)

</details>

## Features

- **Explore a selection.** More details automatically sends the selected text and source context to the real DeepSeek website. Customize the instruction in **Prompt**.
- **Start or continue a chat.** Open a blank chat with **New Chat**, or use **History** to reopen a discussion and follow up.
- **Bring the discussion back.** **Add to DSH** places a reference card in your current main draft. Preview it, send it with your question, or click it to reopen the web chat.
- **Read saved text on demand.** The main model can retrieve the captured discussion through `read_webchat_reference`, including after a restart.
- **Keep your setup.** Restore a valid web login, website language, and panel size. Drag to resize, expand, or collapse; plugin controls follow DSH’s English or Chinese setting.
- **Use other selection actions.** **Add to chat** attaches a quote and comment. **Ask in side chat** opens a temporary discussion with your choice of DSH-configured model.

## Get started

Supports **DSH Desktop 0.2.0-rc.2, 0.2.1-alpha.4, 0.2.1-rc.1, and 0.2.1-rc.2**. Validated on macOS arm64; see the [version-specific results](docs/open-source/validation.md). Windows and Linux are unverified. The web panel requires Desktop.

1. Download **`dsh-more-details-0.3.15.tgz`** from the [release](https://github.com/RZRZ-Q/dsh-more-details/releases/tag/v0.3.15), then install it through **Plugins → Add plugin**. Disable the original AHGGG plugin if installed to avoid duplicate selection menus.
2. Fully quit and reopen DSH. Click **New Chat** and sign in inside the panel. This website login is separate from your DSH model configuration.
3. Select text in a completed message and click **More details**. Use **Prompt** to save your preferred instruction; the bundled default is in Chinese.
4. Continue in the panel, reopen a discussion from **History**, or choose **New** for a fresh chat.
5. Click **Add to DSH**, check the target conversation, and send the reference with your question. Click the card later to reopen the original chat.

For Discover installation, Desktop CLI commands, and upgrades, see the [installation guide](docs/guide.md#installation-and-upgrades).

## How your data is used

More details sends your selection and source context to DeepSeek. References save a snapshot of the currently rendered text, rather than the entire account history. You decide when to send the main draft; saved snapshots remain unchanged as the web chat continues. [Data and privacy details](docs/guide.md#data-flow-and-storage).

## Documentation

- [User guide and FAQ](docs/guide.md) · [Build and contribute](docs/guide.md#development-and-contributions)
- [Compatibility](docs/open-source/compatibility.md) · [Validation](docs/open-source/validation.md) · [Related projects](docs/open-source/comparison.md) — detailed records in Chinese

## Credits

The interaction is inspired by the earlier Codex desktop **More details** feature and its small Chat window. Built on [AHGGG/dsh-side-chat](https://github.com/AHGGG/dsh-side-chat), with web integration references from [Ckarefulon/dsh-deepseek-webchat](https://github.com/Ckarefulon/dsh-deepseek-webchat) and [FrostLeafKEE/dsh-chat-bridge](https://github.com/FrostLeafKEE/dsh-chat-bridge).

[MIT license](LICENSE), with upstream copyright retained. See [source attribution](UPSTREAM.md) and [third-party notices](THIRD_PARTY_NOTICES.md). This is a community plugin, unaffiliated with DeepSeek or OpenAI.

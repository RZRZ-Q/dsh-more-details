# Release notes / 发布说明

## v0.3.13 · Native market distribution

More Details can now be installed from a publisher-maintained index in DSH alpha.4's **Discover** tab. This release also makes the distributable source complete for community-store review without changing the Web Chat workflow, saved data, or RPC contract.

### Changes

- Added a bilingual native market index with immutable Git source pins. rc.2 remains supported through release-package installation.
- Included the three CSS assets referenced by intermediate client modules, alongside the existing inlined browser styles.
- Switched wire validation to official Zod Mini's non-JIT parser. Strict fields, integer bounds, selection limits, optional values, and credential-safe errors remain unchanged.
- Updated package checks to the community Store's current distributable-source budgets and documented browser scripts, login persistence, references, and retained model-provider access.

### Install

Use **Plugins → Add plugin** with `dsh-more-details-0.3.13.tgz`. On alpha.4, alternatively enable **Custom plugin market**, open **Discover → Add index source**, and add:

```text
https://raw.githubusercontent.com/RZRZ-Q/dsh-more-details/main/market/index.json
```

The index is maintained by the author, not an official DeepSeek catalog. Keep your existing profile when upgrading, then fully quit and reopen DSH. This release does not upgrade DSH itself.

Assets:

- `dsh-more-details-0.3.13.tgz` — installable plugin.
- `dsh-more-details-0.3.13-source.tar.gz` — public source and built runtime.
- `SHA256SUMS` — archive checksums.

### Validation and scope

- Typechecking and **31 files / 340 tests** passed against each supported DSH version: **0.2.0-rc.2** and **0.2.1-alpha.4**. Alpha.4 also passed peer, lint, build, and package checks.
- The native market's real HTTPS read, fixed-Git CLI installation, actual Host service activation, client/remote/typert entry loading, and process restart passed in a fresh isolated alpha.4 profile. No existing Desktop installation, login data, or desktop space was changed.
- Fixed-source community Store scanning completed with no missing CSS, dynamic-module/code-generation signal, budget finding, or security-rule finding. Login credential capability remains explicitly disclosed and requires maintainer review; this is not store admission or a security audit.
- This packaging release did not repeat Desktop UI, website sign-in, model sends, or `read_webchat_reference` calls. Earlier results remain in the [validation record](https://github.com/RZRZ-Q/dsh-more-details/blob/main/docs/open-source/validation.md). Windows and Linux remain unvalidated; the web panel requires DSH Desktop.

Credits remain with [AHGGG/dsh-side-chat](https://github.com/AHGGG/dsh-side-chat), [Ckarefulon/dsh-deepseek-webchat](https://github.com/Ckarefulon/dsh-deepseek-webchat), [FrostLeafKEE/dsh-chat-bridge](https://github.com/FrostLeafKEE/dsh-chat-bridge), and [Zod](https://github.com/colinhacks/zod). See [THIRD_PARTY_NOTICES](https://github.com/RZRZ-Q/dsh-more-details/blob/main/THIRD_PARTY_NOTICES.md) and [capability disclosures](https://github.com/RZRZ-Q/dsh-more-details/blob/main/docs/open-source/distribution.md).

<details>
<summary>简体中文</summary>

### v0.3.13 · 原生市场分发

新增作者维护的中英双语原生索引，alpha.4 用户可在「发现」中安装；rc.2 保留 Release 安装方式。每个市场版本固定到不可变 Git 提交，不需要发布 npm。

- 补齐中间客户端模块引用的三份 CSS，保留现有内联样式。
- 传输校验改用 Zod Mini 官方非 JIT 解析器，保留严格字段、整数边界、选文限制、可选值和凭据错误保护。
- 更新分发包检查，并明确披露官网脚本执行、网页登录持久化、引用读取和保留的模型渠道访问能力。
- 不改变 Web Chat 操作流程、保存数据或 RPC 契约，不升级 DSH 客户端。

安装 `dsh-more-details-0.3.13.tgz`；或在 alpha.4 中启用「自定义插件市场」，添加上方索引地址。升级沿用原 profile，随后完整退出重开 DSH。另附公开源码包和 `SHA256SUMS`。

两套受支持的依赖均通过 typecheck 和 **31 文件 / 340 项测试**；alpha.4 另通过 peer、lint、构建和包结构检查。全新的隔离 alpha.4 profile 通过真实 HTTPS 索引读取、固定 Git 安装、Host 服务与模块加载及进程冷重开。未操作现有 DSH、登录数据或桌面。

社区商店固定源码扫描完整，无缺失 CSS、动态加载/代码生成信号、预算超限或安全规则 findings。凭据能力仍需维护者审核，不代表已收录或完成独立安全审计。本轮未重复 Desktop UI、网页登录、模型发送或正文读取端到端验收；此前结果单独保留。Windows、Linux 尚未验收，网页小窗需要 Desktop。

参考项目、署名与许可保持不变，详见上方链接。

</details>

## v0.3.12 · Bilingual Web Chat UI

The Web Chat panel, prompt settings, and status messages now follow DSH’s Chinese or English language setting immediately. You can switch languages while keeping the same web chat, sign-in, history, and drafts.

### What changed

- Localized the sidebar launcher, panel actions, history, settings, accessibility labels, reference cards, and reference previews.
- Existing sign-in, loading, save, read-only, and pending-action notices update when the language changes. External error details keep their original text.
- Saved prompts, unsaved drafts, chat titles, and captured text remain unchanged. The default prompt is still `告诉我更多相关信息` (“Tell me more about this”); edit it to use your own instruction.
- The DeepSeek website keeps its own language setting. Switching DSH’s language does not recreate the browser guest, navigate, send messages, or write plugin history or settings.
- Retains support for **DSH 0.2.0-rc.2 and 0.2.1-alpha.4**, without changing the client, storage schema, or RPC protocol.

### Install or upgrade

Download the assets from the [v0.3.12 release](https://github.com/RZRZ-Q/dsh-more-details/releases/tag/v0.3.12):

- `dsh-more-details-0.3.12.tgz` — installable plugin package.
- `dsh-more-details-0.3.12-source.tar.gz` — public source and built runtime files.
- `SHA256SUMS` — checksums for both archives.

Add the `.tgz` through **Plugins → Add plugin** in DSH Desktop, then enable it. For an upgrade, keep the existing Desktop profile and data. Fully quit and reopen DSH after installation. If using the CLI, use the one bundled with that Desktop installation; see the [installation instructions](https://github.com/RZRZ-Q/dsh-more-details/blob/v0.3.12/README.md#installation-and-use).

The archives contain no personal conversations, credentials, browser data, local backups, or raw acceptance records. The DeepSeek website requires its own sign-in; an existing valid saved sign-in can be restored.

### Validation

The recorded 0.3.12 checks passed **31 files / 340 tests** and typechecking against each supported DSH version. The alpha.4 environment also passed peer checks, lint, build, and package verification.

On isolated macOS arm64 Desktop builds from official source, both versions passed live language switching, reopening an existing reference without signing in again, and full-restart recovery. Tests also covered keeping an unsaved Chinese prompt while switching to English, restoring a saved custom prompt, and translating an already-visible status message. On rc.2, English New Chat and Add to DSH controls were exercised, including the resulting reference card. An existing official rc.2 installation passed an in-place upgrade with sign-in, all five history entries, and original settings preserved; the client remained unchanged.

This UI update did not repeat model sends or actual `read_webchat_reference` calls; the complete sending, follow-up, and tool-reading results remain recorded under 0.3.11. Windows, Linux, other DSH versions, and browser-only DSH have not been validated. Detailed [validation](https://github.com/RZRZ-Q/dsh-more-details/blob/v0.3.12/docs/open-source/validation.md) and [compatibility notes](https://github.com/RZRZ-Q/dsh-more-details/blob/v0.3.12/docs/open-source/compatibility.md) are available in Chinese.

### Credits

Built on [AHGGG/dsh-side-chat](https://github.com/AHGGG/dsh-side-chat/tree/8d463ea7410bcb0b4e76a2d11d5b848d04fc0086), with browser integration references from [Ckarefulon/dsh-deepseek-webchat](https://github.com/Ckarefulon/dsh-deepseek-webchat/tree/7092694d182178145a595982df1fd95a497d2c73) and text extraction references from [FrostLeafKEE/dsh-chat-bridge](https://github.com/FrostLeafKEE/dsh-chat-bridge/tree/1904f282ac27b877a56c2503d7fd79c1a7bb58a8). The runtime includes [Zod](https://github.com/colinhacks/zod). Existing attribution and licenses are retained; see [UPSTREAM](https://github.com/RZRZ-Q/dsh-more-details/blob/v0.3.12/UPSTREAM.md) and [THIRD_PARTY_NOTICES](https://github.com/RZRZ-Q/dsh-more-details/blob/v0.3.12/THIRD_PARTY_NOTICES.md).

<details>
<summary>简体中文</summary>

### v0.3.12 · 中英双语界面

网页小窗、提示词设置与状态提示现在实时跟随 DSH 中英文设置。切换语言时，原网页聊天、登录态、历史和编辑草稿保留。

### 本次改动

- 补齐侧栏入口、小窗按钮、历史、设置、辅助功能标签、引用卡与引用预览的中英双语。
- 已显示的登录、加载、保存、只读和待办状态实时切换语言；外部错误诊断保留原文。
- 已保存 prompt、未保存草稿、聊天标题与正文快照保持原样。默认 prompt 仍为“告诉我更多相关信息”，需要其他指令时自行编辑。
- 官网语言继续由官网设置控制。切换 DSH 语言不重建 guest、不导航或发送消息，也不写入插件历史和设置。
- 继续支持 **DSH 0.2.0-rc.2 与 0.2.1-alpha.4**，不改动客户端、存储结构或 RPC 协议。

### 安装或升级

从 [v0.3.12 发布页](https://github.com/RZRZ-Q/dsh-more-details/releases/tag/v0.3.12)下载：

- `dsh-more-details-0.3.12.tgz`：可安装的插件包。
- `dsh-more-details-0.3.12-source.tar.gz`：公开源码与运行构建产物。
- `SHA256SUMS`：两个压缩包的校验值。

在 DSH Desktop 的 **插件 → 添加插件** 中选择 `.tgz` 并启用；升级时沿用原 Desktop profile，保留原数据。安装后完整退出并重开 DSH。若使用 CLI，请使用该 Desktop 自带的版本，详见[安装说明](https://github.com/RZRZ-Q/dsh-more-details/blob/v0.3.12/README.zh.md#安装和使用)。

附件不包含私人会话、凭据、浏览器数据、本地备份或原始验收记录。官网聊天需要单独登录；已有有效登录记录可以恢复。

### 验证范围

既有 0.3.12 验证中，两套受支持的真实 DSH 依赖均通过 typecheck 和 **31 文件 / 340 项测试**；alpha.4 环境另通过 peer、lint、构建与包结构检查。

两版 macOS arm64 独立官方源码构建环境均通过语言实时切换、旧引用免登录重开和完整重启恢复；另验证未保存中文 prompt 切英文保留、自定义 prompt 重启恢复，以及已显示状态提示的实时翻译。rc.2 实际使用英文新建聊天与添加到 DSH 控件，确认草稿引用卡呈现。现有官方 rc.2 安装版原地升级通过，登录、五条历史和原设置保留，客户端未变。

本轮界面更新未重复发送模型消息或调用真实 `read_webchat_reference`；自动发送、续聊与工具读取的完整实测保留在 0.3.11 记录中。Windows、Linux、其他 DSH 版本和纯浏览器宿主尚未验收。详情见[验收记录](https://github.com/RZRZ-Q/dsh-more-details/blob/v0.3.12/docs/open-source/validation.md)与[兼容说明](https://github.com/RZRZ-Q/dsh-more-details/blob/v0.3.12/docs/open-source/compatibility.md)。

### 参考与致谢

代码基础来自 [AHGGG/dsh-side-chat](https://github.com/AHGGG/dsh-side-chat/tree/8d463ea7410bcb0b4e76a2d11d5b848d04fc0086)，网页承载参考 [Ckarefulon/dsh-deepseek-webchat](https://github.com/Ckarefulon/dsh-deepseek-webchat/tree/7092694d182178145a595982df1fd95a497d2c73)，正文提取参考 [FrostLeafKEE/dsh-chat-bridge](https://github.com/FrostLeafKEE/dsh-chat-bridge/tree/1904f282ac27b877a56c2503d7fd79c1a7bb58a8)，运行包包含 [Zod](https://github.com/colinhacks/zod)。原署名与许可保留，见 [UPSTREAM](https://github.com/RZRZ-Q/dsh-more-details/blob/v0.3.12/UPSTREAM.md) 与 [THIRD_PARTY_NOTICES](https://github.com/RZRZ-Q/dsh-more-details/blob/v0.3.12/THIRD_PARTY_NOTICES.md)。

</details>

## v0.3.11 · rc.2 与 alpha.4 兼容更新

在 DSH 主会话划词后进入右下角的 DeepSeek 官网讨论，自动带入选文和背景；聊完可把带正文快照的引用卡加回主会话，按需读取并随时重开原网页。

### 本次版本

- 保留 DSH 0.2.0-rc.2 支持，加入 0.2.1-alpha.4 的宿主版本及 peer 兼容声明。
- 适配 alpha.4 移除 `mode` 的配置快照，恢复提示词编辑、恢复默认与窗口尺寸保存；保留 rc.2 的 Host 持久化要求和内存配置禁写逻辑。
- 更新依赖脚本保留已有兼容版本，干净安装检查分别核对两条版本线，避免混入其它预发布依赖。
- 两版均实测通过划词自动发送、引用回主会话、正文按需读取，以及完整退出后的免登录、尺寸、prompt、历史与引用恢复和续聊。默认 prompt 仍为“告诉我更多相关信息”，保留已有来源上下文组织方式。

### 参考与致谢

- [AHGGG/dsh-side-chat 1.0.2](https://github.com/AHGGG/dsh-side-chat/tree/8d463ea7410bcb0b4e76a2d11d5b848d04fc0086)：本项目的代码基础，提供划词菜单、临时侧聊、引用卡与快照能力。
- [Ckarefulon/dsh-deepseek-webchat 0.4.7](https://github.com/Ckarefulon/dsh-deepseek-webchat/tree/7092694d182178145a595982df1fd95a497d2c73)：网页 guest 承载、输入适配及登录恢复方法的参考。
- [FrostLeafKEE/dsh-chat-bridge 1.0.1](https://github.com/FrostLeafKEE/dsh-chat-bridge/tree/1904f282ac27b877a56c2503d7fd79c1a7bb58a8)：网页正文、角色、代码和公式提取的参考。
- [Zod](https://github.com/colinhacks/zod)：运行包使用 4.4.3 进行边界数据校验。

完整改造范围和许可见 [UPSTREAM](https://github.com/RZRZ-Q/dsh-more-details/blob/v0.3.11/UPSTREAM.md) 与 [THIRD_PARTY_NOTICES](https://github.com/RZRZ-Q/dsh-more-details/blob/v0.3.11/THIRD_PARTY_NOTICES.md)。更多相关工作及固定版本差异见 [功能对照](https://github.com/RZRZ-Q/dsh-more-details/blob/v0.3.11/docs/open-source/comparison.md)。

### 安装包

- `dsh-more-details-0.3.11.tgz`：在 DSH 插件管理中添加并启用。
- `dsh-more-details-0.3.11-source.tar.gz`：完整公开源码与构建产物，不含开发机器数据。
- `SHA256SUMS`：校验上面两个文件。

安装后完整退出重开 DSH。支持版本为 DSH 0.2.0-rc.2 与 0.2.1-alpha.4；实机验收使用独立的 macOS arm64 官方源码构建环境，alpha.4 未以官方安装包验收。Windows、Linux 及其它宿主版本未验收。网页聊天需要单独登录 DeepSeek 官网，已有有效网页登录可继续恢复。

### 验证

两套真实依赖树各通过 31 文件 / 326 项测试与 typecheck，peer、lint、构建、包结构、同一插件包的独立安装及公开入口导入通过。两版核心桌面流程均通过 CUA 实际操作验收，重启后未打开官网也能通过真实工具读取原引用快照；同一网页讨论免登录重开并收到追问回复。详情见 [版本兼容说明](https://github.com/RZRZ-Q/dsh-more-details/blob/v0.3.11/docs/open-source/compatibility.md) 与 [验收摘要](https://github.com/RZRZ-Q/dsh-more-details/blob/v0.3.11/docs/open-source/validation.md)。

本次仅发布插件改动，不分发独立验收用的 DSH 应用封装、浏览器数据、凭据或私人记录。网页快照仍只覆盖当前已渲染分支，标记为 `partial`；支持这两个固定版本不构成未来版本兼容承诺。

# Release notes / 发布说明

## v0.3.18 · Support DSH 0.2.1-rc.5

Adds exact **DSH 0.2.1-rc.5** support while retaining **0.2.0-rc.2, 0.2.1-alpha.4, 0.2.1-rc.1, 0.2.1-rc.2, and 0.2.1-rc.3**. This is a complete plugin package; no compatibility exemption is needed. Runtime code, RPC, and saved-data formats are unchanged from 0.3.17.

Install the attached `dsh-more-details-0.3.18.tgz` through **Plugins → Add plugin**, or install `dsh-more-details@0.3.18` from npm once it appears in the registry. When using the CLI, use the one bundled with your DSH Desktop, fully quit DSH first, and keep the same profile and data:

```sh
dsh plugin --profile desktop add dsh-more-details@0.3.18 --registry=https://registry.npmjs.org
```

**Verified:** 349 regression tests, 23 identity tests, type/peer/lint/build/package checks, and isolated installation/import checks across all six supported versions. An isolated macOS arm64 rc.5 Desktop passed selection-triggered automatic sending, actual model reference reading, full restart recovery, signed-in history reopening, and follow-up. The existing official rc.5 installation also retained sign-in, history, custom prompt, sessions, and attachments after upgrading.

Older hosts did not repeat full Desktop acceptance in this update. Windows/Linux full feature acceptance remains unverified. See [validation](https://github.com/RZRZ-Q/dsh-more-details/blob/v0.3.18/docs/open-source/validation.md) for scope.

Assets: the complete plugin `.tgz`, public source archive, and `SHA256SUMS`. Private conversations, credentials, backups, and raw acceptance logs are excluded.

<details>
<summary>简体中文</summary>

### v0.3.18 · 适配 DSH 0.2.1-rc.5

新增 **rc.5** 支持，保留此前五个版本。分发完整插件包，无需手动豁免；插件运行代码、RPC 和保存数据格式不变。

在「插件 → 添加插件」安装附件 `dsh-more-details-0.3.18.tgz`，或等 npm registry 出现新版后安装 `dsh-more-details@0.3.18`。CLI 安装使用 DSH 自带命令，先完整退出，沿用原 profile 和数据，安装后重开。

已通过 **349 项回归、23 项身份测试和六版隔离安装/导入检查**。独立 macOS rc.5 实测通过划词自动发送、主模型引用回读、完整重启恢复、免登录历史重开和续聊。现有官方 rc.5 升级也保留了登录态、历史、自定义提示词、会话与附件。

旧宿主未重复全套桌面验收，Windows/Linux 全功能仍未实机验收。安装包、公开源码包和校验值随 Release 提供，不含私人会话、凭据、备份或原始验收日志。

</details>

## v0.3.17 · Keep the send button clear

The collapsed Web Chat button could cover DSH's main send control. It now lives in the **left sidebar** as **Continue chat**, alongside the separate **New Chat** action. Continue chat restores the existing webpage and unsent draft without creating a conversation or sending again. The expanded panel keeps its bottom-right position.

Install or upgrade with **`dsh-more-details@0.3.17`** in **Plugins → Add plugin**, or use the CLI bundled with your DSH Desktop:

```sh
dsh plugin --profile desktop add dsh-more-details@0.3.17 --registry=https://registry.npmjs.org
```

Keep your existing profile and data; fully quit DSH before CLI installation and reopen afterward. This is a complete plugin package. Supported DSH versions remain **0.2.0-rc.2, 0.2.1-alpha.4, 0.2.1-rc.1, 0.2.1-rc.2, and 0.2.1-rc.3**. Host services, RPC, and saved-data formats are unchanged.

### Validation

- **349 tests in 32 files**, **23 identity-guard tests**, peer, type, lint, build, and package checks passed.
- Isolated macOS arm64 DSH 0.2.1-rc.3 upgraded from 0.3.16 with all **110 protected files unchanged**; all **147 installed package files** matched the tested archive.
- Manual collapse, Add to DSH, collapse from History, and a half-width window restored the same URL, original question/reply pair, and unsent web draft without duplicate sends. New Chat and history reopening also passed.
- The main send control remained clear in normal and half-width windows. Clicking it sent a multiline draft with a web reference and received the expected reply.

Bilingual labels and compact sidebar icons are covered by automated tests; real UI acceptance used Chinese. Selection-triggered automatic sending, main-model `read_webchat_reference`, and full restart recovery were not rerun for this patch. Existing DSH installations and desktop spaces were untouched. See [validation](https://github.com/RZRZ-Q/dsh-more-details/blob/v0.3.17/docs/open-source/validation.md) for scope and prior results.

### Assets

- `dsh-more-details-0.3.17.tgz` — complete installable plugin.
- `dsh-more-details-0.3.17-source.tar.gz` — public source and built runtime.
- `SHA256SUMS` — archive checksums.

<details>
<summary>简体中文</summary>

### v0.3.17 · 避免 Chat 按钮遮挡发送键

收起后的 Chat 悬浮按钮可能挡住 DSH 主输入框的发送键。本版将恢复入口移到**左侧栏“继续聊天”**，并保留独立的**“新建 Chat”**。继续聊天恢复原网页和未发送草稿，不新建、不重复发送；展开后仍是右下角小窗。

通过 **插件 → 添加插件** 安装 **`dsh-more-details@0.3.17`**，或使用上方 CLI 命令。沿用现有 profile 和数据，CLI 安装前完整退出，安装后重开。分发的是完整插件包，五版 DSH 兼容范围、Host、RPC 和保存数据格式不变。

工程检查通过 **32 文件 / 349 项测试**及 **23 项身份校验测试**。独立 macOS arm64 DSH rc.3 从 0.3.16 升级后，110 个受保护文件全部一致，147 个已安装包文件与验收包逐字节一致。手动收起、添加到 DSH 自动收起、历史页收起和半宽窗口均能恢复同一网页、原一问一答及未发送草稿，没有重复发送。常规与半宽窗口发送区域无遮挡；实际发送带引用的多行主草稿并收到预期回复。

中英文案和紧凑侧栏图标由自动回归覆盖，实机为中文。本轮未重跑划词自动发送、主模型引用工具读取和完整重启恢复，既往结果仍分版本保留。未操作日常 DSH 或切换桌面。附件提供安装包、公开源码包和校验值，不含私人会话、凭据或备份。

</details>

## v0.3.16 · npm distribution, Web host controls, and DSH rc.3

Install or upgrade through **Plugins → Add plugin** with **`dsh-more-details@0.3.16`**, or use the matching DSH CLI:

```sh
dsh plugin --profile desktop add dsh-more-details@0.3.16 --registry=https://registry.npmjs.org
```

Use the CLI bundled with your Desktop installation, keep the same profile/data, and fully quit DSH before CLI installation. Reopen it afterward. This is a complete plugin package; no previous version or compatibility exemption is required. The plugin does not upgrade the DSH client.

### Changes

- **npm installation and upgrades:** precompiled registry package, bilingual tgz/Git migration instructions, and an exact npm source in the author-maintained market index. Git and Release archives remain available. No consumer `preinstall`, `install`, `postinstall`, or `prepare` hooks.
- **Honest Web host controls:** without the official Desktop browser bridge, hide New Chat, disable More details with a localized explanation, and omit website reopening from reference cards. Keep Add to chat, API side chat, reference previews, and Host snapshot reading. This does not add browser-only website automation.
- **DSH 0.2.1-rc.3 support:** add its exact compatibility metadata and development dependencies, while retaining 0.2.0-rc.2, 0.2.1-alpha.4, 0.2.1-rc.1, and 0.2.1-rc.2.
- **Publication identity checks:** verify the public maintainer, committed source, and matching annotated remote tag before npm publication.

### Validation

- Type, peer, lint, build, and package checks; **345 tests in 32 files** and **23 identity-guard tests** passed. All five supported hosts passed isolated installation and public-entry imports.
- Isolated macOS arm64 rc.3 Desktop passed selection → automatic website sending with custom prompt/context → real reply → Add to DSH → actual main-model snapshot reading. Full restart, remembered sign-in, reference/history reopening, follow-up, and prompt persistence passed.
- Published `0.3.16-rc.1` was used for real npm migration from 0.3.15 tgz and Git installations. Each rc.2 profile retained all 13 protected files. Removing the old tgz did not block another install; actual Host reads returned unchanged snapshots after process restarts.
- The independent rc.3 instance retained all 102 protected files during registry migration. After a cold start, the main model read the saved snapshot **before opening the website**; the reference and history then reopened the original discussion without signing in. The stable release has the same 130 runtime files, byte for byte.
- Browser-hosted DSH passed bilingual disabled-state explanations, Add to chat, saved-reference preview, and a real API side-chat reply.

Existing user DSH installations and desktop spaces were untouched. Full desktop feature acceptance remains **macOS arm64**; Windows/Linux are not claimed as maintainer-validated. Five-version installation checks do not imply all five Desktop workflows were rerun. See the [validation record](https://github.com/RZRZ-Q/dsh-more-details/blob/v0.3.16/docs/open-source/validation.md) and [migration guide](https://github.com/RZRZ-Q/dsh-more-details/blob/v0.3.16/docs/guide.md#installation-and-upgrades).

### Assets

- `dsh-more-details-0.3.16.tgz` — complete installable plugin.
- `dsh-more-details-0.3.16-source.tar.gz` — public source and built runtime.
- `SHA256SUMS` — archive checksums.

Inspired by the earlier Codex More details experience. Built on AHGGG/dsh-side-chat, with references to dsh-deepseek-webchat and dsh-chat-bridge; upstream attribution and licenses remain in [THIRD_PARTY_NOTICES](https://github.com/RZRZ-Q/dsh-more-details/blob/v0.3.16/THIRD_PARTY_NOTICES.md).

<details>
<summary>简体中文</summary>

### v0.3.16 · npm 分发、Web 入口修复与 DSH rc.3 兼容

在 **插件 → 添加插件** 中安装 **`dsh-more-details@0.3.16`**，或使用对应 DSH 安装自带的 CLI 执行上方命令。升级沿用原 profile 和数据，CLI 安装前完整退出、安装后重开。这是完整插件包，无需先装旧版或手动兼容豁免，不升级 DSH 客户端。

- 新增 npm 预编译包与中英文迁移步骤；新市场条目使用精确 npm 版本，保留 Git 和 Release 安装包。没有消费端安装钩子。
- 普通浏览器缺少桌面能力时，提前隐藏「新建 Chat」、禁用「更多详情」并解释原因、移除引用的网页重开入口；保留添加到聊天、API 侧聊、引用预览与按需读取。本版没有新增纯浏览器网页自动化。
- 新增 DSH `0.2.1-rc.3`，保留四个旧版本；加入仅作用于本包的 npm 公开身份发布校验。

五版隔离安装导入、工程检查、**32 文件 / 345 项回归**与 **23 项身份校验回归**通过。独立 rc.3 桌面通过自定义提示词划词自动发送、网页回复、添加引用、主模型实际读取、完整重启恢复、免登录历史重开和续聊。

使用已发布的 `0.3.16-rc.1` 补验真实 tgz/Git → npm 迁移：两套 rc.2 profile 各 13 个受保护文件保持一致，移走旧 tgz 后安装仍成功，Host 新进程重开后读到相同快照。rc.3 安装期间 102 个受保护文件保持一致；冷启动后未打开官网就完成主模型实际快照读取，随后免登录重开原引用与历史。正式版与验收候选包的 130 个运行文件逐字节相同。普通 Web 的中英菜单、批注、预览和真实 API 侧聊回复也已通过。

未操作日常 DSH 或切换桌面。完整桌面功能仍以 macOS arm64 为维护者验收平台，Windows/Linux 未标为已验收；五版安装检查不等于五版全部重复桌面流程。安装包、公开源码包和校验值不包含私人会话、凭据或备份。

</details>

## v0.3.15 · Direct installation on DSH 0.2.1-rc.1

Adds **DSH 0.2.1-rc.1** to the supported versions while retaining **0.2.0-rc.2, 0.2.1-alpha.4, and 0.2.1-rc.2**. Installation on rc.1 no longer requires a local compatibility exemption.

### Install or upgrade

Download **`dsh-more-details-0.3.15.tgz`** and install it through **Plugins → Add plugin**, or use the publisher-maintained index in **Discover** on alpha.4, rc.1, or rc.2:

```text
https://raw.githubusercontent.com/RZRZ-Q/dsh-more-details/main/market/index.json
```

This is the **complete plugin**, suitable for a fresh installation or an upgrade. No previous plugin installation, patch-file merging, or `allow-version` command is required. The patch version number denotes the compatibility declaration fix. Keep your existing profile and data when upgrading, then fully quit and reopen DSH; the plugin does not upgrade the DSH client.

Release assets:

- `dsh-more-details-0.3.15.tgz` — complete installable plugin.
- `dsh-more-details-0.3.15-source.tar.gz` — public source and built runtime.
- `SHA256SUMS` — archive checksums.

### Validation and scope

- All four supported DSH versions passed installation, dependency-tree checks, and public-entry imports in fresh isolated profiles.
- The official rc.1 CLI accepted the package in a fresh profile without any compatibility exemption. Actual Host service loading and reopening in a new process passed.
- The existing rc.2 development environment passed typechecking, peer checks, lint, build, package checks, **31 files / 340 tests**, and **22/22 identity-guard tests**.
- Business source, built runtime, development dependencies, and lockfile are unchanged from 0.3.14. The rc.1 desktop results for automatic sending, reference reading, restart recovery, and follow-up are retained as prior acceptance evidence; this release did not repeat those GUI or model-call tests.

Existing DSH installations and desktop spaces were untouched. macOS arm64 remains the validated desktop platform; Windows and Linux are unverified. The native market entry pins an immutable public commit. See [validation](https://github.com/RZRZ-Q/dsh-more-details/blob/v0.3.15/docs/open-source/validation.md), [compatibility](https://github.com/RZRZ-Q/dsh-more-details/blob/v0.3.15/docs/open-source/compatibility.md), and [capabilities and credits](https://github.com/RZRZ-Q/dsh-more-details/blob/v0.3.15/docs/open-source/distribution.md).

<details>
<summary>简体中文</summary>

### v0.3.15 · DSH 0.2.1-rc.1 直接安装支持

正式加入 **DSH 0.2.1-rc.1**，保留 **0.2.0-rc.2、0.2.1-alpha.4 和 0.2.1-rc.2**。rc.1 用户不再需要手动兼容豁免。

下载 **`dsh-more-details-0.3.15.tgz`**，通过 **插件 → 添加插件** 安装；alpha.4、rc.1、rc.2 也可使用上方作者市场索引。它是**完整插件安装包**，可以全新安装或升级，不需要先装旧版、合并补丁或执行 `allow-version`。补丁版本号表示此次修正兼容声明，不表示分发物是增量补丁。升级沿用原 profile 和数据，然后完整退出重开 DSH；插件不会升级客户端。

四版全新隔离 profile 均通过安装、依赖树与入口导入；官方 rc.1 安装器在没有豁免文件的空白 profile 中直接接受安装，实际 Host 加载及新进程重开通过。现有 rc.2 开发环境通过类型、peer、lint、构建、包结构、**31 文件 / 340 项回归**及 **22/22 身份检查回归**。

业务源码、运行产物、开发依赖及锁文件与 0.3.14 一致；rc.1 自动发送、引用回读、重启恢复与续聊沿用此前真实桌面验收结果，本轮没有重跑 GUI 或模型调用。未操作现有 DSH 或切换桌面。附件另提供公开源码包和校验值，不包含私人会话、凭据、浏览器数据或备份。Windows、Linux 尚未验收；能力披露和参考项目见上方文档。

</details>

## v0.3.14 · DSH 0.2.1-rc.2 compatibility

Adds support for **DSH 0.2.1-rc.2** while retaining **0.2.0-rc.2** and **0.2.1-alpha.4**. This release updates compatibility declarations, development dependencies, and the market entry. Plugin business source and built runtime files are unchanged; the Web Chat workflow, saved data, and RPC contract stay the same.

### Install or upgrade

Install `dsh-more-details-0.3.14.tgz` through **Plugins → Add plugin**. On DSH 0.2.1-alpha.4 or 0.2.1-rc.2, you can also enable **Custom plugin market** under **Plugins → Experimental plugins → More**, then add this source in **Discover**:

```text
https://raw.githubusercontent.com/RZRZ-Q/dsh-more-details/main/market/index.json
```

Keep your existing Desktop profile and data, then fully quit and reopen DSH. This plugin update does not upgrade the DSH client.

Release assets:

- `dsh-more-details-0.3.14.tgz` — installable plugin.
- `dsh-more-details-0.3.14-source.tar.gz` — public source and built runtime.
- `SHA256SUMS` — archive checksums.

### Validation

- All three supported DSH dependency environments passed typechecking and **31 files / 340 tests**. The same package passed installation, dependency-tree checks, and public-entry imports in three clean profiles. Peer checks, lint, build, package verification, and **22/22 identity-guard tests** passed.
- The independent macOS arm64 **0.2.1-rc.2 Desktop** passed custom-prompt saving, selection-based automatic sending, a real website reply, Add to DSH with draft preservation, and actual `read_webchat_reference` reading.
- After a full quit and confirmed process termination, a cold restart restored the main conversation and reference card. Before opening the website, the main model read the same two-message snapshot, with matching reference ID/capture time, `partial`, and `nextCursor: null`. The card reopened the same chat without signing in; follow-up, blank New Chat, history reopening without resending, and saved-prompt recovery passed.
- Both older hosts passed final-package cold startup, actual historical-reference reading, and signed-in reopening. Their complete sending/follow-up flows were not repeated in this release.

The new Desktop test used the official 0.2.1-rc.2 payload in a Direct Electron 44.7.0 wrapper with separate application identity and data. Official `lib/` and `renderer/` files were unchanged; this is not a test of installing the unmodified official app shell. Existing DSH installations and desktop spaces were untouched. A dismissible website “Abnormal usage environment” notice appeared; normal dismissal allowed follow-up, without changing or bypassing website checks. Windows and Linux remain unvalidated. See the [versioned validation record](https://github.com/RZRZ-Q/dsh-more-details/blob/v0.3.14/docs/open-source/validation.md).

### Community store review

[DSH-Store submission #1445](https://github.com/AI-Scarlett/DSH-Store/issues/1445) remains open. Its previous fixed-source scan inspected 129/129 files with no findings; that is not a scan of this new revision. The declared credential capability still needs maintainer review. See the [capability disclosure](https://github.com/RZRZ-Q/dsh-more-details/blob/v0.3.14/docs/open-source/distribution.md). Credits and licenses are unchanged; see [THIRD_PARTY_NOTICES](https://github.com/RZRZ-Q/dsh-more-details/blob/v0.3.14/THIRD_PARTY_NOTICES.md).

<details>
<summary>简体中文</summary>

### v0.3.14 · DSH 0.2.1-rc.2 兼容更新

新增 **DSH 0.2.1-rc.2**，保留 **0.2.0-rc.2** 与 **0.2.1-alpha.4**。本次只更新兼容声明、开发依赖和市场条目；插件业务源码与运行构建产物未变，Web Chat 工作流、保存数据和 RPC 契约保持一致。

通过 **插件 → 添加插件** 安装 `dsh-more-details-0.3.14.tgz`；alpha.4 与新版 rc.2 也可使用上方作者市场索引。升级沿用原 profile 和数据，随后完整退出重开；不会升级 DSH 客户端。附件另提供公开源码包和 `SHA256SUMS`。

三套真实依赖均通过 typecheck 与 **31 文件 / 340 项测试**；同包三版全新 profile 安装、依赖树、入口导入，以及 peer、lint、构建、包结构和 **22/22 身份校验回归**全部通过。

新版独立 macOS arm64 Desktop 通过自定义 prompt、划词自动发送、真实回复、保留草稿添加引用及实际正文回读。完整退出并确认进程结束后，冷启动恢复主会话和引用卡；打开官网前仍读到相同引用 ID、采集时间和两条消息快照。点击卡免登录重开原聊天、追问、新建后历史重开且不重复发送、prompt 重启保留均通过。两版旧宿主本轮补验最终包冷启动、旧引用回读和免登录重开，没有重复全部发送与续聊流程。

新版使用官方 payload 与 Electron 44.7.0 的 Direct 独立测试封装，官方 `lib/`、`renderer/` 文件未改；不计作官方原始应用壳安装验收。未改动现有 DSH 或切换桌面。官网可关闭的“使用环境异常”提示正常关闭后可继续追问，未修改或规避检测。Windows、Linux 尚未验收。详见上方验收记录。

申请 #1445 仍待审核；此前 129/129 文件、零发现的扫描不代表新版扫描或商店收录。凭据能力仍需维护者专项审核，能力披露、参考项目与许可见上方链接。

</details>

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

# Distribution and capability review

English | [简体中文](#简体中文)

> 0.3.16-rc.1 uses npm next for registry migration acceptance. Stable publication and the new market entry follow that check; previous entries remain pinned to Git.

## Distribution channels

- The npm channel provides the precompiled `dsh-more-details` package. Use DSH’s own plugin installer/CLI; tgz/Git migration keeps the same package identity and data. [Installation and recovery steps](../guide.md#installation-and-upgrades).
- GitHub Releases provide the installable package, public source archive, and checksums.
- [`market/index.json`](../../market/index.json) is the author's native DSH market index. Add `https://raw.githubusercontent.com/RZRZ-Q/dsh-more-details/main/market/index.json` in DSH 0.2.1-alpha.4, 0.2.1-rc.1, or 0.2.1-rc.2's **Discover** tab. After registry verification, 0.3.16 will use one exact npm source; older entries retain immutable Git commits. A version cannot have duplicate entries for different sources. DSH 0.2.0-rc.2 users can use its installer/CLI or release packages.
- The repository uses the official community-discovery topic [`dsh-plugin`](https://github.com/topics/dsh-plugin).
- [DSH-Store](https://github.com/AI-Scarlett/DSH-Store) is an independent community store. Submission and static scanning do not imply admission, a security audit, or DeepSeek endorsement.

As checked on 2026-10-18, [submission #1445](https://github.com/AI-Scarlett/DSH-Store/issues/1445) remains open. Its previous fixed-source preflight scanned 129/129 files with no findings; credential capability still awaits explicit maintainer review. This is not catalog admission or a 0.3.14 scan result. The 0.3.14 compatibility acceptance passed; its release evidence will be added to the same issue for maintainer review.

## Capabilities for reviewers

| Capability | Purpose and boundary | Source |
| --- | --- | --- |
| DeepSeek website and browser guest | Open `https://chat.deepseek.com`, navigate chats, send the user-requested selection/context, and capture rendered text. The website makes its own network requests. The plugin does not proxy chats through a publisher server. | [`guest.ts`](../../src/client/webchat/guest.ts), [`deepseek-page.ts`](../../src/client/webchat/deepseek-page.ts), [`deepseek-capture.ts`](../../src/client/webchat/deepseek-capture.ts) |
| Guest JavaScript execution | `webview.executeJavaScript` runs packaged DOM/login helpers inside the DeepSeek guest. Arguments are JSON-encoded; guest helpers check the website origin and applicable chat identity. This browser capability remains present and is disclosed independently of the Store's scanner verdict. It is not a shell command or downloaded plugin code. | [`guest.ts`](../../src/client/webchat/guest.ts), [`login-page.ts`](../../src/client/webchat/login-page.ts) |
| Credentials | Remember/restore only the plugin's own `credentialKey('dsh-more-details', 'webchat')` record. The website fields are `userToken`, `__appKit_userInfo`, `deepseek-device-id:chat`, and an optional language preference. No complete cookie/profile export. Website sign-out clears the remembered record when observed. The default DSH credential store is a local file with mode `0600`, not macOS Keychain. | [`webchat-login-store.ts`](../../src/host/webchat-login-store.ts), [`login-page.ts`](../../src/client/webchat/login-page.ts) |
| Local persistence | Store plugin history and settings through the existing client/DSH mechanisms, and immutable text snapshots through DSH attachments. No arbitrary workspace-file editing or shell invocation. | [`controller.ts`](../../src/client/webchat/controller.ts), [`webchat-reference-store.ts`](../../src/host/webchat-reference-store.ts) |
| Main-conversation context and reading tool | Read source context when the user chooses More details. `read_webchat_reference` can read only references submitted by the user in the current DSH conversation. Adding a card preserves the draft and does not automatically send the main conversation. | [`parent-context.ts`](../../src/host/parent-context.ts), [`webchat-reference-tool.ts`](../../src/host/webchat-reference-tool.ts) |
| Retained side-chat API | The upstream-derived side-chat service can call the model selected through DSH's existing provider configuration; it does not create an Agent/session or execute tools. This is separate from the primary Web Chat flow. | [`read-only-chat-service.ts`](../../src/host/read-only-chat-service.ts) |

The package has no `preinstall`, `install`, `postinstall`, or `prepare` hook. `prepack` builds the distributable for maintainers; committed runtime files are available for Git installation. No runtime `dependencies` or `optionalDependencies` are installed by the plugin; host APIs are peer-provided and the Zod implementation is bundled with its license.

The 0.3.15 compatibility declaration covers exactly `0.2.0-rc.2`, `0.2.1-alpha.4`, `0.2.1-rc.1`, and `0.2.1-rc.2`. The complete 0.3.15 package installs on rc.1 without a local compatibility exemption. Desktop feature acceptance is limited to macOS arm64. Windows, Linux, other DSH versions, and browser-only Web Chat are not claimed as validated. See [compatibility](compatibility.md) and [validation](validation.md) for the distinction between release-specific checks and historical desktop results.

## 简体中文

> 0.3.16-rc.1 使用 npm next 验收 registry 迁移；通过后更新稳定版和新市场条目，旧条目继续固定到 Git。

### 分发渠道

- 计划新增的 npm 渠道提供预编译 `dsh-more-details` 包，通过 DSH 自带安装器/CLI 安装；tgz/Git 迁移保持同一插件标识及数据。详见[安装与恢复步骤](../guide.zh.md#安装与升级)。
- GitHub Release 提供安装包、公开源码包及校验值。
- [`market/index.json`](../../market/index.json) 是作者维护的 DSH 原生市场索引，DSH 0.2.1-alpha.4、0.2.1-rc.1 或 0.2.1-rc.2 用户可在「发现」中添加 `https://raw.githubusercontent.com/RZRZ-Q/dsh-more-details/main/market/index.json`。registry 验收完成后，0.3.16 将使用单一精确 npm 来源，旧条目保留不可变 Git 提交；同一版本不能重复声明不同来源；DSH 0.2.0-rc.2 可使用安装器/CLI 或 Release 安装包。
- 仓库使用官方推荐的社区发现 topic：[`dsh-plugin`](https://github.com/topics/dsh-plugin)。
- [DSH-Store](https://github.com/AI-Scarlett/DSH-Store) 是独立社区商店；提交或静态扫描不代表已收录、独立安全审计或 DeepSeek 官方认可。

截至 2026-10-18，[申请 #1445](https://github.com/AI-Scarlett/DSH-Store/issues/1445) 仍打开。此前固定源码预检已扫描 129/129 文件且无发现，凭据能力仍等待维护者明确审核；这不是商店收录，也不是 0.3.14 的扫描结果。0.3.14 兼容验收已通过，发布证据将在原申请补充，供维护者审核。

### 审核所需的能力说明

- **官网与网页脚本**：通过 Desktop browser guest 打开 DeepSeek 官网，按用户操作发送选文和上下文、导航聊天、提取已渲染文字。`webview.executeJavaScript` 在官网 guest 执行随包提供的 DOM/登录辅助代码；参数使用 JSON 编码，辅助代码检查 origin 及适用的聊天身份。这项能力实际存在，不因扫描器未提示而省略。网页自己发起网络请求，插件没有作者自建的聊天中转服务，也不执行 shell 或下载的插件代码。
- **登录凭据**：只操作本插件的 `dsh-more-details/webchat` 记录，保存 `userToken`、`__appKit_userInfo`、`deepseek-device-id:chat` 及可选官网语言偏好，不导出完整 Cookie 或浏览器资料。观察到官网退出登录时清除已记住的记录。默认 DSH 凭据服务使用权限 `0600` 的本地文件，不是 macOS Keychain。
- **本地持久化**：保存插件历史、设置及 DSH 附件中的不可变正文快照，不提供任意工作区文件编辑或 shell 执行。
- **主会话与读取工具**：用户点击更多详情时读取来源上下文；模型读取工具只读取当前会话中用户已提交的引用。添加引用保留草稿，不自动发送主会话。
- **保留的侧聊接口**：上游侧聊服务可通过 DSH 已配置的模型渠道发送模型请求，不新建 Agent/session、不执行工具；它与主要 Web Chat 流程分开。具体源码见上方表格。

插件没有 `preinstall`、`install`、`postinstall` 或 `prepare`；`prepack` 用于维护者构建分发包，Git 安装可使用已提交的运行产物。没有运行时 `dependencies` / `optionalDependencies`，宿主接口由 peer 提供，Zod 随包构建并保留许可。

0.3.15 精确声明兼容 `0.2.0-rc.2`、`0.2.1-alpha.4`、`0.2.1-rc.1` 与 `0.2.1-rc.2`；完整的 0.3.15 安装包在 rc.1 上无需本机兼容豁免。桌面功能验收范围为 macOS arm64，不将 Windows、Linux、其他版本或普通浏览器中的 Web Chat 标为已验收。逐版本结果见[兼容说明](compatibility.md)与[验收记录](validation.md)。

## Web host behavior / Web 宿主行为

Without the supported Desktop browser bridge, the client does not register the Web Chat panel or New Chat launcher. More details is disabled with a localized explanation; reference reopening is omitted while preview/serialization and Host on-demand reading remain. No iframe, cross-origin bypass, or manual-import fallback is added.

没有支持的 Desktop 浏览器桥接时，不注册网页小窗或「新建 Chat」，「更多详情」显示本地化禁用原因；引用移除重开入口，但保留预览、序列化和 Host 按需读取。本版不加入 iframe、跨域绕过或手动导入降级路径。

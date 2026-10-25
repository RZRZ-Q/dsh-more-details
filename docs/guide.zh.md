# 使用与开发指南

> **0.3.16-rc.1 为 npm 候选版。** Desktop rc.3 核心验收已通过，registry 迁移是剩余发布条件；通过前稳定版仍为 [0.3.15](https://github.com/RZRZ-Q/dsh-more-details/releases/tag/v0.3.15)。

[项目简介](../README.zh.md) · [English guide](guide.md)

## 支持环境

当前版本 **0.3.16-rc.1**，支持 **DSH 0.2.0-rc.2、0.2.1-alpha.4、0.2.1-rc.1、0.2.1-rc.2 和 0.2.1-rc.3**。网页讨论需要官方 Desktop browser guest。普通浏览器中隐藏「新建 Chat」，「更多详情」置灰并说明原因；添加到聊天、API 侧聊、已有引用预览和按需读取仍保留，插件内重开官网仅 Desktop 可用。Windows/Linux 全功能尚未完成验收。

各版本的验证范围分别记录，不将旧版验收结果视为每次更新都重新执行：

| 插件版本 | 已验证范围 |
| --- | --- |
| 0.3.14 | 更新 DSH 0.2.1-rc.2 的兼容声明和开发依赖，同时保留两版旧宿主支持。三套依赖均通过 typecheck 和 340 项测试，三版全新 profile 的安装与入口导入通过。独立新版 Desktop 通过自动发送、引用回读、完整重启及历史续聊；旧版本轮补验最终包冷启动、旧引用回读与免登录重开，未重复全部流程。 |
| 0.3.13 | 在两套支持的 DSH 依赖下各通过 340 项测试，并在全新隔离的 alpha.4 profile 通过原生市场 Git 安装、Host 加载和进程冷重开检查。本次分发更新新增作者索引、补齐 CSS 资产并改用非 JIT 的 Zod Mini 校验，不修改保存数据或传输契约；未重跑桌面交互和模型发送验收。 |
| 0.3.12 | 此前 macOS arm64 桌面验收包括语言切换与恢复。 |
| 0.3.11 | 此前 macOS arm64 桌面验收包括自动发送、续聊与按需读取。 |

具体环境、检查与限制见[版本兼容说明](open-source/compatibility.md)、[验收记录](open-source/validation.md)和[分发与能力说明](open-source/distribution.md)。

## 安装与升级

### npm（推荐）

在 **插件 → 添加插件** 中输入 `dsh-more-details@0.3.16-rc.1`。DSH 从 npm 安装预编译包并检查宿主兼容性。升级时继续使用原 profile，更换包来源不需要删除插件数据。

Desktop CLI 必须使用**对应桌面安装自带的 CLI**。通过 CLI 安装前完整退出目标 DSH 实例，安装后重开。下面的 macOS 示例假设应用位于 `~/Applications`，请按实际安装位置调整：

```sh
"$HOME/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh" plugin --profile desktop add dsh-more-details@0.3.16-rc.1
```

浏览器宿主使用自己的 CLI 和 profile，例如 `dsh plugin --profile web add dsh-more-details@0.3.16-rc.1`。不要使用另外安装的 CLI 管理 Desktop profile，也不要在任意目录直接执行 `pnpm add`。后续升级沿用同一命令，将版本号替换为需要的兼容版本。

### 发现市场

DSH 0.2.1-alpha.4、0.2.1-rc.1 和 0.2.1-rc.2 支持作者维护的原生市场索引：

1. 在 **插件 → 实验性插件 → 更多** 中启用 **自定义插件市场**。
2. 在 **发现 → 添加索引源** 中添加 `https://raw.githubusercontent.com/RZRZ-Q/dsh-more-details/main/market/index.json`。
3. 选择 **更多详情 · 网页讨论**，核对版本和来源后安装。

新版本使用精确 npm 版本，旧版本条目保留固定 Git commit。一个版本只能有一个市场来源，不会把 npm 和 Git 重复列为同一版本的两个条目。这是作者维护的索引，不代表 DeepSeek 官方背书。DSH 0.2.0-rc.2 没有「发现」，可通过安装器/CLI 使用 npm，或安装 Release 归档。

### Git 与 Release 安装包

- **Git**：使用目标 Release 对应的完整公开 commit：`git+https://github.com/RZRZ-Q/dsh-more-details.git#<full-commit>`。在「添加插件」中输入，或交给自带的 `dsh plugin --profile desktop add` 命令。仓库已提交构建运行产物。
- **归档**：从[发布页](https://github.com/RZRZ-Q/dsh-more-details/releases/tag/v0.3.16)下载 `dsh-more-details-0.3.16.tgz`，通过「添加插件」安装；源码包和 `SHA256SUMS` 单独提供。

本地归档可能作为 profile 的 `file:` 依赖保留。只要依赖仍指向该文件，就应保留它及其记录路径；移动或删除可能阻塞同一 profile 的其他包操作。希望摆脱本地归档依赖的安装优先使用 npm。

### 从已有 tgz 或 Git 安装迁移

1. 备份目标 profile；执行 CLI 更改前完整退出该 DSH 实例。保持同一 profile、插件名称、凭据、附件和浏览器数据。
2. 通过对应 DSH 安装器/CLI 安装 `dsh-more-details@0.3.16-rc.1`，替换包来源；不需要先卸载插件并删除其数据。
3. 重开 DSH，检查版本、自定义 prompt、历史、原引用及已记住的网页登录。官网会话本身仍可能独立到期。
4. 确认该插件的 profile 依赖不再指向旧归档，且另一项插件/包操作成功后，再删除旧归档。

如果旧 tgz 已丢失，导致迁移失败，先将同一版本归档恢复到报错中的准确路径，再更换来源。不要通过删除 profile、凭据、会话或附件来修复包路径。

安装后停用重复的 AHGGG 插件，并完整退出、重开 DSH，让 Host 和 Client 都加载新版本。

## 使用网页讨论

1. 点击侧栏 **新建 Chat**，在小窗内登录 DeepSeek 官网。网页登录与 DSH 主模型渠道的账号配置分开。
2. 在主会话一条已完成的消息中划词，点击 **更多详情**，等待网页回复。
3. 在小窗顶部 **提示词** 或 **设置 → 通用设置 → 更多详情** 修改指令。默认 prompt 为“告诉我更多相关信息”，可保存自定义内容或恢复默认；升级保留已保存的自定义值，切换界面语言不会翻译 prompt 文字。
4. 用顶部 **新建** 打开空白网页聊天，用 **历史** 重开讨论。重开历史不会再次发送旧问题。

同一 DSH 主会话中的后续划词可接续当前活动网页讨论；切换来源会话、新建空白聊天或手动重开历史后，下次 **更多详情** 另建讨论。

划词菜单中三个操作的去向不同：

| 操作 | 去向 |
| --- | --- |
| 添加到聊天 | 将选文与可选批注加入主会话草稿。 |
| 更多详情 | 将选文与来源背景发送到可保存的 DeepSeek 官网讨论。 |
| 在侧边对话中提问 | 使用 DSH 配置的模型打开原有临时侧聊，支持选择模型和继续追问，与网页讨论分开。 |

拖动网页小窗的左上角、上边或左边可调整尺寸，也可以放大、还原或收起。调整大小保留同一网页，不重复发送消息；小窗宽高和放大状态会在重启后恢复。

## 将讨论带回主会话

1. 网页回答结束后，确认顶部 **添加到：会话标题**，点击 **添加到 DSH**。
2. 目标会话草稿中会出现引用卡，已有文字保持不变。自行补充问题并发送，例如“请结合引用中的讨论继续解释，并按需读取正文”。
3. 引用卡携带预览；主模型需要正文时，通过 `read_webchat_reference` 工具分页读取已保存的文本。完整退出重开后仍可读取，无需打开官网。
4. 点击草稿或已发送消息中的引用卡，可重开原网页聊天并继续追问。

再次添加同一讨论会更新尚未发送的引用；已经发送的快照保持不变，不会因网页续聊而自动更新。需要将新消息带回 DSH 时，再次添加该讨论。

添加引用不会创建公开分享链接，也不会自动发送主会话草稿。

## 数据流与存储

### 发往官网的上下文

点击 **更多详情** 会将选中文字、所属消息和部分主会话历史作为可见用户消息发送到 DeepSeek 官网。三部分分别组织，优先解释选文。

- 选文：最多 **16 KiB UTF-8 文本**。
- 来源消息：最多 **40,000 个 JavaScript 字符单元**。
- 其他历史：最多 **80,000 个 JavaScript 字符单元**，覆盖最近最多 **五个已完成回合**，每回合最多 **一百条正文消息**。

超出部分明确标注省略。这些预算不是官网输入上限的承诺。系统消息、开发者消息、推理块、附件字节不会自动复制，工具调用可作为文字背景。

### 历史与引用快照

网页聊天由 DeepSeek 账号保存。插件本地历史只索引访问过的 URL、标题、来源会话和时间，并不镜像官网全部历史。

**添加到 DSH** 通过 DSH 附件存储，另外保存当前已渲染分支的文本快照。快照始终标记 `partial`：未加载的更早消息、图片和其他非文本内容不在正文中。引用卡展示预览；完整的已采集文本由读取工具分页提供。

`read_webchat_reference` 只读取当前 DSH 会话中用户已经提交的引用，不需要打开官网，不包含登录凭据。

### 网页登录

登录记录与正文分开，使用 DSH 凭据服务保存三个必要登录字段及可选的官网语言偏好。默认存储是权限为 `0600` 的本地文件，并非 macOS Keychain。插件不导出完整 Cookie 或浏览器资料。

请等小窗显示 **已记住网页登录** 后再退出。有效的已保存登录可在重启 DSH 后恢复；官网令牌失效或要求重新验证时，仍需再次登录。

## 常见问题

**小窗为什么是英文？**

官网语言独立于 DSH。请在官网设置中选择简体中文；插件会记住该偏好，重启后恢复。外围插件控件跟随 DSH 设置，不修改官网语言。

**切换 DSH 语言会改变什么？**

从 0.3.12 起，侧栏入口、小窗按钮、历史、提示词设置、辅助功能标签、状态提示、引用卡与划词菜单实时切换中英文。已保存 prompt、未保存草稿、聊天标题和正文快照保持原样。默认 prompt 仍为“告诉我更多相关信息”，需要其他语言的指令时可在 **提示词** 中自行编辑。外部错误的原始诊断也保留原文。

**是否每次都要登录？**

小窗显示 **已记住网页登录** 后，有效的已保存登录可恢复。官网令牌失效或要求重新验证时，仍需再次登录。DSH 的模型渠道配置不会替你登录官网。

**发送状态不明怎么办？**

先查看网页。插件仅在正确聊天中观察到新增用户消息后确认发送，不会自动重复提交不确定的请求。

**与旧 Codex 的功能是什么关系？**

旧版 Codex 的 **更多详情** 和 Chat 小窗是主要交互参考：保持主会话可用，围绕选文展开独立讨论。本插件使用 DeepSeek 网页模型和自己的 prompt、上下文组装实现这一体验，不复用 Codex 内部实现，也不承诺生成相同答案。

## 开发与贡献

需要 Node.js `^22.19.0 || >=24.0.0`，pnpm 版本见 `package.json`。

```sh
pnpm install --frozen-lockfile
pnpm run check
mkdir -p dist
npm pack --ignore-scripts --pack-destination dist
```

仓库保留 `lib/` 构建产物。npm 发布受本仓库身份检查保护，只允许从已审阅、已提交且有匹配远端 annotated tag 的源码执行；用户安装不会运行维护者发布检查。GitHub Release 与原生市场索引继续保留。社区 DSH-Store 的申请状态与能力披露见[分发说明](open-source/distribution.md)；提交申请不代表审核通过。

Issue 和 PR 可使用中文或英文。新 commit 标题统一使用简短英文，格式为 `type(scope): summary`，其中 scope 可省略，例如 `docs: add bilingual readmes`；需要时可在正文补充中文说明。保留已发布的提交历史。修改功能、安装方式或兼容范围时，请同步更新两份 README 和相应指南章节。详细验收与对比文档目前以中文维护；新的发布说明以英文为主，并提供中文版。

### 维护者身份检查

公开维护 checkout 使用 [AGENTS.md](../AGENTS.md) 中的身份允许值。按该文件配置仓库级身份后运行：

```sh
npm run identity:install
npm run identity:check
npm run identity:test
```

安装只将本 checkout 的 `core.hooksPath` 设为 `.githooks`，不改全局 Git 配置或其他仓库。外部贡献者应保留自己的署名，不要安装这个仅供维护者使用的钩子。安装插件不会安装 Git 钩子。

钩子会拒绝不符合允许值的 author / committer 名称与邮箱、共同作者记录和 tagger。分支或标签更新前检查实际提交对象，覆盖 amend、cherry-pick 继承的作者；推送前检查每个引用的全部可达历史。公开标签必须是 annotated tag，嵌套标签也逐层检查署名。这里核验身份元数据，不要求加密签名。必须使用完整克隆，`.mailmap` 和 replacement object 不能替换被检查的真实身份。

先推送已核验的 annotated tag，再通过受检查的命令发布：

```sh
npm run release:publish -- vX.Y.Z --title "vX.Y.Z" --notes-file docs/open-source/release-notes.md dist/plugin.tgz dist/source.tar.gz
```

入口核验 GitHub 账号及远端标签对象与本地完全一致后，才执行带 `--verify-tag` 的 Release 创建；也支持 `--draft`、`--prerelease`，加上 `--check-only` 可执行同样的核验而不创建 Release，不会自动创建缺失的标签。管理员仍能禁用本地钩子，直接使用 GitHub CLI/API 或网页发布也会绕过此入口，因此它是工作流检查，不是服务端访问控制。维护发布必须使用上述入口。

## 更多文档

- [验收范围与自行测试](open-source/validation.md)：工程检查、不同版本的实机记录及未验证部分。
- [版本兼容说明](open-source/compatibility.md)：受支持 DSH 版本的兼容改动、环境和验收结果。
- [分发与能力说明](open-source/distribution.md)：打包、市场安装与上架申请状态。
- [相关项目与功能差异](open-source/comparison.md)：固定源码版本和证据链接。
- [v0.3.14 中英双语发布说明](open-source/release-notes.md)，既往版本记录保留中文。
- [上游改造范围](../UPSTREAM.md)、[第三方许可](../THIRD_PARTY_NOTICES.md)和 [MIT 许可](../LICENSE)。

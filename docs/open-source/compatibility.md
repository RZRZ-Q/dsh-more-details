# DSH 版本兼容

更新：2026-10-16。当前版本 0.3.13 保留两条已支持版本线；本次安装验收与此前桌面验收分别记录。

## 0.3.13 分发更新

保持 `0.2.0-rc.2 || 0.2.1-alpha.4`。两版真实依赖各通过 typecheck 和 340 项测试；alpha.4 的独立全新 profile 通过原生市场读取、固定 Git 安装、Host 加载和进程冷重开。未改变 DSH 客户端、存储结构或 RPC 契约；未重复 Desktop UI 或模型发送验收。原生「发现」入口仅适用于 alpha.4，rc.2 继续使用 Release 安装包。详见[逐版本验收记录](validation.md#0313-原生市场与分发验收)。

## 0.3.12 双语界面验证

**0.3.12 同时支持 DSH 0.2.0-rc.2 与 0.2.1-alpha.4，两个版本均已通过独立 macOS arm64 Desktop 双语界面与重启恢复验收。** 自动发送、主模型读取引用和续聊的完整实测保留在下方 0.3.11 记录中。该版安装包、源码包与校验文件见 [v0.3.12 发布页](https://github.com/RZRZ-Q/dsh-more-details/releases/tag/v0.3.12)。

沿用两版已有的官方 `locale` 接口，在运行时订阅 DSH 语言设置。侧栏入口、小窗操作、历史、提示词设置、辅助功能标签、状态提示与引用卡实时切换中英文；语言切换不改变网页登录态、官网语言、历史、设置或正文内容，也不重建 guest 或触发发送。用户 prompt 与未保存草稿保持原文，外部错误诊断不翻译。

| 检查 | rc.2 | alpha.4 |
| --- | --- | --- |
| 当前源码 typecheck / 全量回归 | 真实 rc.2 依赖，31 文件 / 340 项通过 | alpha.4 依赖，31 文件 / 340 项通过 |
| peer、lint、构建与包结构 | 使用同一插件构建产物 | `pnpm run check`、包检查通过 |
| 独立 Direct Desktop 升级与语言切换 | 通过，中文 → English → 中文 | 同项通过 |
| 英文小窗、设置、历史、登录状态 | 通过 | 通过；未保存中文 prompt 跨语言保留，已显示的恢复默认提示实时翻译 |
| 原引用免登录重开 | 通过，同一 URL | 通过，同一 URL |
| 新建与添加到 DSH | 英文 New 打开空白聊天；实际插入引用，英文提示与草稿卡通过，未发送草稿 | 本轮复用旧引用重开，未重新插入引用 |
| 完整退出与冷启动 | 英文界面、原 prompt、免登录恢复通过 | 英文界面、自定义 prompt、免登录恢复通过 |

验收后两版恢复原中文界面，alpha.4 恢复原默认 prompt。安装阶段原配置、凭据、历史、会话与附件核对一致；本轮不重发模型消息或重新调用正文读取工具。详细数据保留范围见[验收记录](validation.md)。

现有官方 rc.2 安装版另已原地升级至 0.3.12，并通过完整退出重开后的免登录、旧引用重开、五条原历史及默认 prompt 保留验证。客户端版本与文件未变，安装阶段原配置、凭据、历史会话、附件和浏览器用户数据核对一致；现有界面保持中文，未切换桌面。

## 0.3.11 兼容基础

- `engines.dsh`、DSH peer 和插件兼容声明同时保留 `0.2.0-rc.2`、加入 `0.2.1-alpha.4`；不推定其它预发布版本或未来版本兼容。
- 开发依赖切到 alpha.4，并使用其官方 Cordis、Schemastery 版本；运行时继续由宿主提供这些依赖。
- alpha.4 的配置表单移除了 `mode`。插件接受新版快照，同时保留 rc.2 的 Host 持久化要求和 `memory` 禁写逻辑；两版都继续检查配置是否就绪及可写。修复范围为提示词编辑/恢复默认、窗口尺寸调整与保存。
- 更新依赖脚本保留已有兼容版本；干净安装检查为两个版本分别解析依赖，并核对没有混入另一条版本线。

官方依据：[alpha.4 发布说明](https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.2.1-alpha.4)、[新版配置表单类型](https://github.com/deepseek-ai/deepseek-harness/blob/86a402200d95fecef4529d969836f1fe13c6cb0d/packages/client/ui-settings/src/client/config-form-types.ts)、[兼容性判断](https://github.com/deepseek-ai/deepseek-harness/blob/86a402200d95fecef4529d969836f1fe13c6cb0d/packages/boot/app-boot/src/plugin-compatibility.ts)。

## 0.3.11 核心流程验证

| 检查 | rc.2 | alpha.4 |
| --- | --- | --- |
| 同一 0.3.11 包的独立安装、依赖树版本核对、公开入口导入 | 通过 | 通过 |
| 0.3.11 源码 typecheck / 全量回归 | 通过，31 文件 / 326 项测试 | 通过，31 文件 / 326 项测试 |
| 包结构、构建及 peer 检查 | 使用同一构建产物 | 通过 |
| 独立 Desktop 启动与主模型回复 | 通过 | 通过 |
| 新建 Web Chat、修改 prompt、中文划词菜单、自动发送与网页回复 | 通过 | 通过 |
| 实际拖拽、保存尺寸与重启恢复 | 通过，570 × 600 CSS 像素，未放大 | 通过，570 × 625 CSS 像素，未放大 |
| 添加到 DSH、保留草稿、主模型实际读取引用 | 通过，`read_webchat_reference` 读到两条消息 | 通过，`read_webchat_reference` 读到两条消息 |
| 完整退出后，不开网页再次读取原引用快照 | 通过 | 通过 |
| 完整退出后的免登录、引用卡重开、历史重开与续聊 | 通过，恢复同一网页聊天并收到追问回复 | 通过，恢复同一网页聊天并收到追问回复；Direct 封装再次冷启动亦通过 |
| 自定义 prompt 重启恢复与恢复默认 | 通过 | 通过 |

两版均使用同一插件运行产物完成上述流程；引用读取核对了实际工具结果，两条消息的快照均标记为 `partial`，`nextCursor: null`。新建空白聊天后通过历史回到同一 URL，原讨论和追问仍在，未重复自动发送。更早版本的结果单独保留在[验收摘要](validation.md)，不计作 0.3.11 的本次结果。`dshCompatibility.testedVersions` 不表示 Windows、Linux 或其他版本已完成桌面验收。

## 独立桌面环境

准备 0.3.11 验收环境时，alpha.4 的 GitHub Release 没有安装附件，[官方 macOS arm64 更新源](https://download.deepseek.com/dsh-desk/feeds/mac-arm64/nightly-mac.yml)仍指向 rc.2。因此当时使用固定提交的官方源码构建，0.3.12 沿用同一套独立环境，未修改 DSH 客户端源码：

| 目标 | 官方提交 | 源码完整性检查 | Electron |
| --- | --- | --- | --- |
| rc.2 | `639ed015397290b3745d163aafe02ffee4aa3f84` | 14,103 个原始文件内容未变 | 44.0.0 |
| alpha.4 | `86a402200d95fecef4529d969836f1fe13c6cb0d` | 16,211 个原始文件内容未变 | 44.7.0 |

两版官方 Host、Client 和 Desktop 构建均已通过。测试应用使用独立应用标识、`DSH_HOME` 和 Electron userData 目录，分别隔离 Host 数据、浏览器数据及单实例锁；不注册 `dsh://`，不覆盖现有安装。alpha.4 使用官方 rc.2 安装包附带的独立工具运行时，并搭配 alpha.4 自身的办公技能资源；这是一套官方源码构建测试环境，不是官方发布的 alpha.4 安装包。

两个独立环境均通过官方 Desktop CLI 安装同一插件包。rc.2 的测试 profile 使用独立 `cordis.patch.yml` 中的完整 webserver 配置，将监听地址设为 `127.0.0.1`、端口设为 `0`，解决与现有实例的 19387 端口冲突。这些调整仅作用于测试环境配置，未修改官方客户端源码。

## CUA 重启诊断与验收恢复

早期 shell 入口测试封装在完整退出后的冷启动出现 CUA `timeoutReached` / `noWindowsAvailable`。对照实际调用确认，先前成功操作的是已经运行的实例，不能据此认定相同封装的冷启动也成功。重启 CUA 服务、增加辅助功能启动参数等尝试未恢复操作。

将测试应用改为直接以 Electron 可执行文件作为入口，并保留同一官方构建、独立 profile 和浏览器数据后，两版冷启动的 CUA 界面读取与操作恢复。随后均通过正常退出、确认旧进程结束、再次冷启动的真实流程。alpha.4 的同一 Direct 封装连续两次冷启动均可访问，中间正常退出一次。这是测试封装层面的 A/B 复现结果，未证明 CUA 内部超时的精确原因。

恢复后使用 CUA 完成上表全部界面验收，不以启动日志或磁盘数据代替结果。测试过程中未执行桌面切换，也未改动现有 DSH 安装和数据。Direct 测试封装和原始诊断材料不随插件分发，用户安装插件无需部署这套验收环境。

依据：[官方开发启动器](https://github.com/deepseek-ai/deepseek-harness/blob/86a402200d95fecef4529d969836f1fe13c6cb0d/apps/desktop/scripts/dev.ts)、[开发应用生成器](https://github.com/deepseek-ai/deepseek-harness/blob/86a402200d95fecef4529d969836f1fe13c6cb0d/apps/desktop/scripts/development-app.ts)、[Desktop 主入口](https://github.com/deepseek-ai/deepseek-harness/blob/86a402200d95fecef4529d969836f1fe13c6cb0d/apps/desktop/src/main.ts)。

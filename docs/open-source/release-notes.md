# v0.3.11 · rc.2 与 alpha.4 兼容更新

在 DSH 主会话划词后进入右下角的 DeepSeek 官网讨论，自动带入选文和背景；聊完可把带正文快照的引用卡加回主会话，按需读取并随时重开原网页。

## 本次版本

- 保留 DSH 0.2.0-rc.2 支持，加入 0.2.1-alpha.4 的宿主版本及 peer 兼容声明。
- 适配 alpha.4 移除 `mode` 的配置快照，恢复提示词编辑、恢复默认与窗口尺寸保存；保留 rc.2 的 Host 持久化要求和内存配置禁写逻辑。
- 更新依赖脚本保留已有兼容版本，干净安装检查分别核对两条版本线，避免混入其它预发布依赖。
- 两版均实测通过划词自动发送、引用回主会话、正文按需读取，以及完整退出后的免登录、尺寸、prompt、历史与引用恢复和续聊。默认 prompt 仍为“告诉我更多相关信息”，保留已有来源上下文组织方式。

## 参考与致谢

- [AHGGG/dsh-side-chat 1.0.2](https://github.com/AHGGG/dsh-side-chat/tree/8d463ea7410bcb0b4e76a2d11d5b848d04fc0086)：本项目的代码基础，提供划词菜单、临时侧聊、引用卡与快照能力。
- [Ckarefulon/dsh-deepseek-webchat 0.4.7](https://github.com/Ckarefulon/dsh-deepseek-webchat/tree/7092694d182178145a595982df1fd95a497d2c73)：网页 guest 承载、输入适配及登录恢复方法的参考。
- [FrostLeafKEE/dsh-chat-bridge 1.0.1](https://github.com/FrostLeafKEE/dsh-chat-bridge/tree/1904f282ac27b877a56c2503d7fd79c1a7bb58a8)：网页正文、角色、代码和公式提取的参考。
- [Zod](https://github.com/colinhacks/zod)：运行包使用 4.4.3 进行边界数据校验。

完整改造范围和许可见 [UPSTREAM](https://github.com/RZRZ-Q/dsh-more-details/blob/v0.3.11/UPSTREAM.md) 与 [THIRD_PARTY_NOTICES](https://github.com/RZRZ-Q/dsh-more-details/blob/v0.3.11/THIRD_PARTY_NOTICES.md)。更多相关工作及固定版本差异见 [功能对照](https://github.com/RZRZ-Q/dsh-more-details/blob/v0.3.11/docs/open-source/comparison.md)。

## 安装包

- `dsh-more-details-0.3.11.tgz`：在 DSH 插件管理中添加并启用。
- `dsh-more-details-0.3.11-source.tar.gz`：完整公开源码与构建产物，不含开发机器数据。
- `SHA256SUMS`：校验上面两个文件。

安装后完整退出重开 DSH。支持版本为 DSH 0.2.0-rc.2 与 0.2.1-alpha.4；实机验收使用独立的 macOS arm64 官方源码构建环境，alpha.4 未以官方安装包验收。Windows、Linux 及其它宿主版本未验收。网页聊天需要单独登录 DeepSeek 官网，已有有效网页登录可继续恢复。

## 验证

两套真实依赖树各通过 31 文件 / 326 项测试与 typecheck，peer、lint、构建、包结构、同一插件包的独立安装及公开入口导入通过。两版核心桌面流程均通过 CUA 实际操作验收，重启后未打开官网也能通过真实工具读取原引用快照；同一网页讨论免登录重开并收到追问回复。详情见 [版本兼容说明](https://github.com/RZRZ-Q/dsh-more-details/blob/v0.3.11/docs/open-source/compatibility.md) 与 [验收摘要](https://github.com/RZRZ-Q/dsh-more-details/blob/v0.3.11/docs/open-source/validation.md)。

本次仅发布插件改动，不分发独立验收用的 DSH 应用封装、浏览器数据、凭据或私人记录。网页快照仍只覆盖当前已渲染分支，标记为 `partial`；支持这两个固定版本不构成未来版本兼容承诺。

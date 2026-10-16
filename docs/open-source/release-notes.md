# v0.3.10 · 更多详情 Web Chat

在 DSH 主会话划词后进入右下角的 DeepSeek 官网讨论，自动带入选文和背景；聊完可把带正文快照的引用卡加回主会话，按需读取并随时重开原网页。

## 本次版本

- 默认 prompt 调整为“告诉我更多相关信息”，保留用户已保存的自定义值。
- 分开组织选文、所属消息与其他历史，优先参考所属消息，避免重复加入同一来源。
- 保留最近最多五个已完成回合；对超长来源和历史采用独立预算，并明确标注省略。
- 沿用已完成的网页自动发送、历史与续聊、免登录恢复、尺寸/语言保存、引用卡和正文分页读取。

## 参考与致谢

- [AHGGG/dsh-side-chat 1.0.2](https://github.com/AHGGG/dsh-side-chat/tree/8d463ea7410bcb0b4e76a2d11d5b848d04fc0086)：本项目的代码基础，提供划词菜单、临时侧聊、引用卡与快照能力。
- [Ckarefulon/dsh-deepseek-webchat 0.4.7](https://github.com/Ckarefulon/dsh-deepseek-webchat/tree/7092694d182178145a595982df1fd95a497d2c73)：网页 guest 承载、输入适配及登录恢复方法的参考。
- [FrostLeafKEE/dsh-chat-bridge 1.0.1](https://github.com/FrostLeafKEE/dsh-chat-bridge/tree/1904f282ac27b877a56c2503d7fd79c1a7bb58a8)：网页正文、角色、代码和公式提取的参考。
- [Zod](https://github.com/colinhacks/zod)：运行包使用 4.4.3 进行边界数据校验。

完整改造范围和许可见 [UPSTREAM](https://github.com/RZRZ-Q/dsh-more-details/blob/v0.3.10/UPSTREAM.md) 与 [THIRD_PARTY_NOTICES](https://github.com/RZRZ-Q/dsh-more-details/blob/v0.3.10/THIRD_PARTY_NOTICES.md)。更多相关工作及逐项差异见 [功能对照](https://github.com/RZRZ-Q/dsh-more-details/blob/v0.3.10/docs/open-source/comparison.md)。

## 安装包

- `dsh-more-details-0.3.10.tgz`：在 DSH 插件管理中添加并启用。
- `dsh-more-details-0.3.10-source.tar.gz`：完整公开源码与构建产物，不含开发机器数据。
- `SHA256SUMS`：校验上面两个文件。

安装后完整退出重开 DSH。基线为官方 macOS arm64 DSH 0.2.0-rc.2；Windows/Linux 未验收。网页聊天需要单独登录 DeepSeek 官网。

## 验证

0.3.10 工程检查通过 31 文件 / 314 项测试，安装产物一致性与实际划词自动发送通过。历史恢复、续聊、引用回读和缩放持久化的实际验证版本及步骤见 [验收摘要](https://github.com/RZRZ-Q/dsh-more-details/blob/v0.3.10/docs/open-source/validation.md)。

公开分发补齐第三方许可和安装说明；没有因开源打包而改动插件运行代码。网页快照仍只覆盖当前已渲染分支，标记为 `partial`。

# 上游归属

本插件基于 [AHGGG/dsh-side-chat](https://github.com/AHGGG/dsh-side-chat) 1.0.2，固定提交 `8d463ea7410bcb0b4e76a2d11d5b848d04fc0086`。保留原 MIT 许可证与版权声明，详见 LICENSE。

改造范围：右下角 DeepSeek 网页 Chat、新建与划词自动发送、可编辑默认 prompt、分层来源上下文、历史地址索引与重开、网页登录和语言偏好恢复、窗口尺寸持久化，以及网页引用卡、正文附件快照与按需读取。包、服务、RPC、客户端与设置使用独立命名空间。上游的划词、引用和临时侧聊能力继续复用；引用卡和正文快照不是本项目首次提出的功能。

网页 guest 和页面适配参考 Ckarefulon/dsh-deepseek-webchat 0.4.7 与 FrostLeafKEE/dsh-chat-bridge 1.0.1；Zod 4.4.3 随运行产物打包。完整固定提交与 MIT 声明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。其他相关项目及功能差异见仓库中的 `docs/open-source/comparison.md`。

0.3.11 支持 DSH 0.2.0-rc.2 与 0.2.1-alpha.4，两个版本均在独立的官方源码构建环境完成 macOS arm64 核心流程验收，详见[版本兼容说明](docs/open-source/compatibility.md)。不要与原插件同时启用两套划词菜单。本项目为社区插件，不属于 DeepSeek 或 OpenAI 的官方产品；没有随包分发旧 Codex 客户端代码。

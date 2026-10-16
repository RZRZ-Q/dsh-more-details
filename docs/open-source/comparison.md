# 与相关 DSH 插件的功能对照

核查日期：**2026-10-15**。本项目对照版本：**dsh-more-details 0.3.10**。

## 项目定位

dsh-more-details 将“划词追问”放进 DSH 右下角的 DeepSeek 官网小窗：选中文字后点击“更多详情”，自动发送选文、来源背景和可修改的默认 prompt；讨论可以从历史重新打开，也能作为引用加入当前 DSH 主会话。

它基于 AHGGG/dsh-side-chat 的选区交互发展而来，并参考现有网页插件。划词、官网嵌入、自动发送、讨论回传和正文快照分别已有实现。本项目的工作是把它们组织成一个可继续使用的详情讨论流程，并补齐来源绑定、引用重开和按需读取。具体代码来源与许可见 [UPSTREAM.md](../../UPSTREAM.md) 和 [THIRD_PARTY_NOTICES.md](../../THIRD_PARTY_NOTICES.md)。

在下列固定版本与审阅范围内，尚未确认其他单个项目完整覆盖这一流程。这是有范围的功能比较，**不表示全网没有同类项目，也不作为“首创”结论**。

## 核查范围与读表方式

- 对 8 个项目读取了默认分支固定 SHA、版本、README、相关入口与数据流源码，并查询公开 issue / PR / release。
- 另外 6 个候选只核查固定版本 README，用来识别方向；不把文档描述当成完整源码或实机验收。
- 未安装、运行候选插件，未执行其脚本或进行账号登录；竞品“支持”表示文档与源码可确认的实现能力。
- “未见”表示本次检查未确认相应功能，不表示证明其不存在。“官网历史”也不等于“与来源关联的详情历史”。
- 本轮没有遍历所有 fork、未发布分支、市场目录或私有项目。项目后续更新可能改变结论。

## 固定版本

下表短 SHA 均链接到本轮审阅的完整提交，避免默认分支更新后证据漂移。

| 简称 / 项目 | package 版本 | 固定提交 | 许可 |
| --- | --- | --- | --- |
| AHGGG / dsh-side-chat | 1.0.2 | [8d463ea](https://github.com/AHGGG/dsh-side-chat/tree/8d463ea7410bcb0b4e76a2d11d5b848d04fc0086) | MIT |
| Ckarefulon / dsh-deepseek-webchat | 0.4.7 | [7092694](https://github.com/Ckarefulon/dsh-deepseek-webchat/tree/7092694d182178145a595982df1fd95a497d2c73) | MIT |
| FrostLeaf / dsh-chat-bridge | 1.0.1 | [1904f28](https://github.com/FrostLeafKEE/dsh-chat-bridge/tree/1904f282ac27b877a56c2503d7fd79c1a7bb58a8) | MIT |
| relay / dsh-deepseek-web-relay | 2.0.0 | [bebd12c](https://github.com/acdsh4869/dsh-deepseek-web-relay/tree/bebd12c9016bdb50fc9dd0ed139ae02222fe7aa7) | MIT |
| xmuwenxiang / dsh-web-chat | 0.2.0 | [835e501](https://github.com/xmuwenxiang/dsh-web-chat/tree/835e501ea40738de4f0bc3e63c406a9f416984cd) | Apache-2.0 |
| jaychang / dsh-webchat | 0.7.8 | [0d8c897](https://github.com/jaychang1989/dsh-webchat/tree/0d8c897ca4f4008ac3f6d96902e2dfb6ef87340b) | Apache-2.0 |
| 星星 / dsh-deepseek-chat | 0.1.22 | [8d06013](https://github.com/xingxingbk-git/dsh-deepseek-chat/tree/8d060139d531bbbc33377c5ac9393cb9095c8fb9) | 未找到许可文件或 package license |
| Lumos / dsh-deepseek-chat | 1.0.0 | [114b20e](https://github.com/Lumos0121/dsh-deepseek-chat/tree/114b20e61adc99c1558f0e1c6b17c80eaf962c97) | MIT |

许可列用于记录本轮发现，不表示所有项目代码都被本项目采用；没有明确许可的项目仅作为功能比较对象。

## 从主会话发起讨论

“默认 prompt”专指可保存、下次自动解释时继续使用的指令，不把一次性输入框或按钮悬停文案算作该功能。

| 项目 | 原位划词入口 | 讨论承载 | 自动发送 | 默认 prompt / 来源关系 |
| --- | --- | --- | --- | --- |
| **dsh-more-details** | 是 | 右下角官网小窗 | 选文、分层背景和 prompt 自动发送 | 可保存；活动详情按来源复用，也可显式新建 |
| AHGGG | 是 | DSH provider 直接模型调用 | 更多详情立即请求 | 解释 prompt 硬编码；一个临时侧聊 |
| Ckarefulon | 消息行选择器 | 官网侧栏 | 勾选消息后填入并发送 | 单次问题与固定说明；每 DSH Session 绑定一个官网聊天 |
| FrostLeaf | 未见工作会话划词 | 官网主区域 | 未见选文向网页自动发送 | 主要是官网聊天与工作区切换 |
| relay | 是，双向选文 | 独立 Chrome / Edge 官网窗口 | 正向只预填，不提交 | 传递前缀可配置；未见选文自动新建官网聊天 |
| xmuwenxiang | 未见 | 真实浏览器驱动官网，自建聊天 UI | 支持网页消息发送 | 未见选文背景解释入口或来源详情绑定 |
| jaychang | 未见 | 官网中央面板 | 未见主会话内容自动发送 | 主要是网页容器与登录恢复 |
| 星星 | 未见 | 官网 Chat / Harness 切换 | 未见选文背景自动发送 | 支持官网新建与历史导航，未见默认解释 prompt |
| Lumos | 未见 DSH 选文入口 | 官网右栏或外部浏览器 | 回传 DSH 时直接发送 | “自定义提示词”是悬停文案，非解释 prompt |

## 保存、重开与回到工作

| 项目 | 历史与重开 | 讨论返回 DSH | 正文存储与模型读取 | 浮层尺寸 |
| --- | --- | --- | --- | --- |
| **dsh-more-details** | 多条插件访问记录，可重开官网续聊 | 当前主会话草稿引用卡，点击可重开官网 | 附件保存快照；卡片预览；工具分页按需读取 | 拖拽、放大 / 还原，完整重启恢复 |
| AHGGG | 关闭 / 过期后不能重开临时讨论 | 已有讨论引用卡，保留主草稿 | 已有快照，全文随引用序列化给模型 | 固定响应式布局；未见拖拽持久化 |
| Ckarefulon | 每 DSH Session 保留一个绑定；官网自身另有历史 | README 明确无回流 | 绑定只保存 ID，无正文引用 | 宿主侧栏，未见独立浮层存储 |
| FrostLeaf | 官网已加载历史列表、本地档案管理 | 导入全新的工作会话 | 正文快照直接保存为新会话历史 | 主区域布局 |
| relay | 可使用独立浏览器官网历史 | 网页选文回传，或带历史分支到新 DSH 草稿 | 分支上下文有长度上限，未见引用按需读 | 独立浏览器窗口 |
| xmuwenxiang | 本地 transcript、网页历史恢复 | 原文或蒸馏后转入新 / 已有 Harness 会话 | 追加持久用户消息，未见引用按需读 | 自建面板 |
| jaychang | 官网历史，guest 隐藏保活 | 未见回传 | 未见正文引用存储 | 跟随中央面板 |
| 星星 | 官网标题搜索、重命名、置顶、分享、删除 | 未见引用回传 | README 明确没有备份聊天正文 | 主区域布局 |
| Lumos | 使用官网聊天，未见来源详情索引 | 正文与分享链接直接发到当前 DSH | 读取官网正文并创建公开分享链接，未见引用按需读 | 官网右栏 |

AHGGG 的“回主会话”和“快照”不是本项目首次增加的概念。本项目相对它增加的是：官网会话地址可重开、正文通过独立附件持久保存、引用只带预览，以及 `read_webchat_reference` 在主会话需要时分页读取。

FrostLeaf 的档案搜索、重命名、导出和手动导入，星星的官网历史管理，都比本项目的详情访问列表覆盖更广。AHGGG 还覆盖 DSH Web 与触屏选区；xmuwenxiang 提供原文 / 蒸馏转移和 Agent 工具接口。这些是不同的产品侧重，不应在对比中抹去。

## 关键源码证据

### AHGGG：选区与引用的基础

[使用与临时讨论边界](https://github.com/AHGGG/dsh-side-chat/blob/8d463ea7410bcb0b4e76a2d11d5b848d04fc0086/README.md#L59-L99)明确已有划词、立即解释和讨论引用；关闭、失联或过期后无法重开。
[固定 prompt](https://github.com/AHGGG/dsh-side-chat/blob/8d463ea7410bcb0b4e76a2d11d5b848d04fc0086/src/client/dsh/SideChatOverlay.tsx#L25)、[直接 LLM 调用](https://github.com/AHGGG/dsh-side-chat/blob/8d463ea7410bcb0b4e76a2d11d5b848d04fc0086/src/host/read-only-chat-service.ts#L189-L207)与[引用全文序列化](https://github.com/AHGGG/dsh-side-chat/blob/8d463ea7410bcb0b4e76a2d11d5b848d04fc0086/src/client/parent-composer/referenced-conversation.ts#L96-L106)说明了它与官网持久讨论的区别。

### Ckarefulon：官网发送与会话绑定

[功能表](https://github.com/Ckarefulon/dsh-deepseek-webchat/blob/7092694d182178145a595982df1fd95a497d2c73/README.md#L26-L37)列出官网、登录恢复、行选择、自动发送及无回流；[发送实现](https://github.com/Ckarefulon/dsh-deepseek-webchat/blob/7092694d182178145a595982df1fd95a497d2c73/src/client/index.js#L1557-L1573)包含填入、提交和回读。
[绑定存储](https://github.com/Ckarefulon/dsh-deepseek-webchat/blob/7092694d182178145a595982df1fd95a497d2c73/src/index.js#L610-L632)每个 DSH Session 保存一个官网聊天 ID。README 首段残留“自行发送”描述，本文按上述实现判断。

### FrostLeaf：网页历史转为工作会话

[功能与范围](https://github.com/FrostLeafKEE/dsh-chat-bridge/blob/1904f282ac27b877a56c2503d7fd79c1a7bb58a8/README.md#L23-L37)覆盖官网历史、本地档案及手动导入；[持久化路径](https://github.com/FrostLeafKEE/dsh-chat-bridge/blob/1904f282ac27b877a56c2503d7fd79c1a7bb58a8/src/host/history-service.ts#L187-L227)创建新工作会话并读回核验。
[范围说明](https://github.com/FrostLeafKEE/dsh-chat-bridge/blob/1904f282ac27b877a56c2503d7fd79c1a7bb58a8/README.md#L84-L98)明确采集当前渲染分支、标记 partial，跨重启登录复用尚在计划中。

### 其他源码审阅项目

- **relay**：[选文传递只预填](https://github.com/acdsh4869/dsh-deepseek-web-relay/blob/bebd12c9016bdb50fc9dd0ed139ae02222fe7aa7/client.js#L1247-L1279)；[网页分支回新 DSH 草稿与默认 5000 字符上限](https://github.com/acdsh4869/dsh-deepseek-web-relay/blob/bebd12c9016bdb50fc9dd0ed139ae02222fe7aa7/README.md#L103-L124)。
- **xmuwenxiang**：[原文 / 蒸馏转入新或已有会话](https://github.com/xmuwenxiang/dsh-web-chat/blob/835e501ea40738de4f0bc3e63c406a9f416984cd/src/transfer.ts#L475-L531)；[已有会话直接追加用户消息](https://github.com/xmuwenxiang/dsh-web-chat/blob/835e501ea40738de4f0bc3e63c406a9f416984cd/src/transfer.ts#L433-L460)。蒸馏可能额外调用配置的 LLM。
- **jaychang**：[登录保存恢复](https://github.com/jaychang1989/dsh-webchat/blob/0d8c897ca4f4008ac3f6d96902e2dfb6ef87340b/lib/client.js#L247-L283)；[中央面板位置跟随与隐藏保活](https://github.com/jaychang1989/dsh-webchat/blob/0d8c897ca4f4008ac3f6d96902e2dfb6ef87340b/lib/client.js#L531-L557)。
- **星星**：[官网历史管理](https://github.com/xingxingbk-git/dsh-deepseek-chat/blob/8d060139d531bbbc33377c5ac9393cb9095c8fb9/README.md#L9-L38)；[0.1.22 的语言设置命名空间修复](https://github.com/xingxingbk-git/dsh-deepseek-chat/blob/8d060139d531bbbc33377c5ac9393cb9095c8fb9/src/client.ts#L572-L582)；[正文与平台范围说明](https://github.com/xingxingbk-git/dsh-deepseek-chat/blob/8d060139d531bbbc33377c5ac9393cb9095c8fb9/README.md#L128-L143)。
- **Lumos**：[读取会创建公开分享链接](https://github.com/Lumos0121/dsh-deepseek-chat/blob/114b20e61adc99c1558f0e1c6b17c80eaf962c97/README.md#L30-L45)；[直接排队发送当前 DSH](https://github.com/Lumos0121/dsh-deepseek-chat/blob/114b20e61adc99c1558f0e1c6b17c80eaf962c97/lib/client.js#L1991-L2062)；[可配置项实际是悬停文案](https://github.com/Lumos0121/dsh-deepseek-chat/blob/114b20e61adc99c1558f0e1c6b17c80eaf962c97/lib/client.js#L146-L173)。

## 本轮更新与未合并能力

相对 2026-10-14 的核查，AHGGG、Ckarefulon、FrostLeaf、relay、xmuwenxiang、jaychang 的默认分支 SHA 未变。星星从 0.1.21 更新到 0.1.22，新增的是语言设置修复；Lumos 1.0.0 是本轮补入的强相关候选。

AHGGG 最新 Release 为 v1.0.2，FrostLeaf 为 v1.0.1，relay 为 v2.0.0，jaychang 为 v0.7.8，Lumos 为 v1.0.0；Ckarefulon、xmuwenxiang、星星未发现 GitHub Release。package 版本与 Release 状态分别记录，不把默认分支自动当成已发布安装包。

xmuwenxiang 的 [PR #4](https://github.com/xmuwenxiang/dsh-web-chat/pull/4)仍开放，head 为 `bd3e815b20af2956c153ffdba500c2f67d72b8bb`，涉及可见登录窗口、历史选择器与恢复重试；不计入已合并版本的能力。其他 7 仓本轮没有开放 PR。未将公开 issue 描述当成本轮已复现故障。

## 补充候选：仅 README 级核查

以下材料用于说明检索边界，未完成相关代码调用链核查，也未据此断言项目缺少某功能。

| 候选 / 固定 README | 文档描述的方向 |
| --- | --- |
| [rick5092137-web/dsh-selection-toolbar](https://github.com/rick5092137-web/dsh-selection-toolbar/blob/24e1817bc44954dcc22ec89a96c13dbd0098ab16/README.md#L46-L56) | 划词详情卡、复制选文并打开官网；另有原生分支侧聊预填 |
| [wanyexin1998/dsh-workbench](https://github.com/wanyexin1998/dsh-workbench/blob/0f65b52696be8208e26b29643b44a75ba679ab1d/README.md#L219-L229) | 选区 fork 到第二 Pane 并发送解释；该能力要求特定 Presentation protocol / Harness fork |
| [Guojing6/dsh-deepseek-chat](https://github.com/Guojing6/dsh-deepseek-chat/blob/90b96d35793e268e92e3830339d1fe49c6f761a0/README.md#L3-L11) | 点击侧栏标题切换官网视图 |
| [LittleCar30/dsh-deepseek-web](https://github.com/LittleCar30/dsh-deepseek-web/blob/d7e7301db3b578728b2767e256fdb766fc07e95e/README.md#L64-L82) | 独立真实浏览器作为任务与工具通道，半自动 / 自动发送 |
| [y-wi/dsh-deepseek-web](https://github.com/y-wi/dsh-deepseek-web/blob/d4983eb96042fa0dfc81435b544cfd359b756899/README.md#L90-L103) | Provider 集成、网页历史接续与派生到工作区 |
| [OldBeer1/dsh-deepseek-web](https://github.com/OldBeer1/dsh-deepseek-web/blob/781ec4cb908bf7e8fd51283d2c96c7cff9378340/README.md#L11-L21) | 自建会话列表与聊天 UI、网页服务调用 |

## 本项目的交付边界

dsh-more-details 当前提供的完整流程是：**主会话划词 → 官网小窗新建或复用当前来源讨论 → 自动发送 → 历史重开续聊 → 添加到当前主会话草稿 → 引用重开与正文按需读取**。0.3.10 另外将选文、所属消息和最近背景分层，默认 prompt 为“告诉我更多相关信息”，保留用户已保存的自定义值。

已做实机验证的平台是 **macOS / 官方 DSH 0.2.0-rc.2**；**Windows 未验收**，不因其他插件支持 Windows 就推断本项目已支持。本文也不宣称本项目覆盖 DSH Web、触屏或完整官网历史管理。

插件历史是访问记录，不是官网全部聊天同步。添加引用保存的是当时已采集的当前渲染正文，标记为 **partial**；不保证包含未渲染的长历史、其他分支或附件原文。按需读取访问已保存快照，不会自动抓取官网新增消息。

本项目的“添加到 DSH”保留主草稿，由用户决定发送；它不自动发布公开分享链接。官网页面、宿主接口或账号状态变化仍可能影响网页适配，固定版本比较不等于未来兼容承诺。

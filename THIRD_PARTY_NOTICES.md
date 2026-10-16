# 第三方来源与许可证

AHGGG/dsh-side-chat 的来源与 MIT 许可证见 [UPSTREAM.md](UPSTREAM.md) 和 [LICENSE](LICENSE)。

## Ckarefulon/dsh-deepseek-webchat

网页 guest 的租约承载和输入适配参考/改编自版本 0.4.7，固定提交 `7092694d182178145a595982df1fd95a497d2c73`：https://github.com/Ckarefulon/dsh-deepseek-webchat 。网页登录恢复参考其“同源写回存储后重新加载”的方法；本插件只保存三个必要登录字段及可选官网语言偏好，使用 DSH 官方凭据服务，不复制其全量 localStorage/Cookie 快照与独立 JSON 文件存储。浮层、来源绑定、历史列表和发送确认由本插件独立实现。

MIT License

Copyright (c) 2026 Ckarefulon

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## FrostLeafKEE/dsh-chat-bridge

网页消息 DOM 的角色、正文识别以及代码围栏和 TeX 提取参考固定提交 `1904f282ac27b877a56c2503d7fd79c1a7bb58a8` 的 `src/adapters/deepseek-page-reader.ts`：https://github.com/FrostLeafKEE/dsh-chat-bridge 。引用快照采用 DSH 官方附件存储；模型按需读取与主会话引用卡由本插件实现。

MIT License

Copyright (c) 2026 dsh-chat-bridge contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Zod

构建配置将 [Zod](https://github.com/colinhacks/zod) 4.4.3 打包进 `lib/client.js` 和 `lib/typert.js`，用于边界数据校验。以下声明来自锁定版本发布包中的 `LICENSE`；宿主提供的 DSH / React peer 依赖不随本插件打包。

MIT License

Copyright (c) 2025 Colin McDonnell

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

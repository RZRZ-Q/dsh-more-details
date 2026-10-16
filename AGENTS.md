# AGENTS.md

## 公开仓库身份

本规则适用于代理代维护者在本仓库创建的提交、标签、推送和 GitHub Release。

| 项目 | 唯一允许值 |
| --- | --- |
| 公开仓库 | `RZRZ-Q/dsh-more-details` |
| GitHub 操作账号 | `RZRZ-Q` |
| Git author / committer / tagger 名称 | `RZRZ-Q` |
| Git author / committer / tagger 邮箱 | `206667890+RZRZ-Q@users.noreply.github.com` |
| `origin` 地址 | `https://github.com/RZRZ-Q/dsh-more-details.git` |

只使用上述公开身份。不得把其他私人账号、邮箱、账号关联说明或私人仓库地址写入公开文件、提交信息、Git 元数据、发布说明及发布附件，包括本规则文件。保留上游版权和许可证；本规则不授权冒用或改写外部贡献者身份。

## 自动拦截

- 维护者首次使用本公开仓库 checkout 时，按下文配置仓库级身份，再运行 `npm run identity:install`。安装器只写当前仓库的 `core.hooksPath=.githooks`；不得改为全局配置，也不得在其他仓库安装。
- `pre-commit` 检查有效 author / committer；`reference-transaction` 在分支、HEAD 或标签引用更新前检查实际对象和全部可达提交，覆盖 `--author`、amend、cherry-pick 及标签署名；`pre-push` 检查每个拟推送引用及其全部可达历史。名称、邮箱与 `Co-authored-by` 必须符合上表。
- 提交、推送和发布前运行 `npm run identity:check`；校验读取原始 Git 对象，不接受 `.mailmap` 或 replacement object 对身份的替换。浅克隆须先补全历史。
- 发布只能使用 `npm run release:publish -- <tag> --title <title> --notes-file <file> [assets...]`。入口核对有效身份、标签及全部可达提交、`gh` 账号，以及本地和远端标签对象一致性，随后才执行带 `--verify-tag` 的 Release 创建。
- 公开标签必须是 annotated tag，确保有可核验的 tagger；不要求额外配置 GPG / SSH 加密签名。
- 不得通过禁用钩子、`--no-verify`、直接调用 `gh release create` 或网页发布来绕过检查。本地钩子和发布入口不是 GitHub 服务端权限控制，管理员仍可绕开；不能把它们描述成无法绕过的安全边界。
- 改动校验器后运行 `npm run identity:test`，使用隔离的本地 Git 仓库验证拒绝行为，不向 GitHub 创建测试 Release。

## 每次提交前

1. 确认当前目录和 `origin` 都属于上述公开仓库；不得在私密开发仓套用本规则或修改全局 Git 配置。
2. 使用仓库级身份配置，不依赖电脑的全局默认值：

   ```sh
   git config --local user.name RZRZ-Q
   git config --local user.email 206667890+RZRZ-Q@users.noreply.github.com
   git config --local user.useConfigOnly true
   ```

3. 在实际执行提交的同一环境中运行以下检查，逐项与允许值比较：

   ```sh
   git remote get-url origin
   gh api user --jq .login
   git var GIT_AUTHOR_IDENT
   git var GIT_COMMITTER_IDENT
   ```

   `gh` 登录账号正确，不代表 Git 作者、提交者或邮箱正确。`git var` 的实际结果还可能受环境变量覆盖；`--author`、amend、cherry-pick 和历史导入也可能保留另一份作者信息，必须单独核对。

4. 检查暂存内容及拟用提交信息，确认没有私人身份信息、账号关联记录或本地备份。只暂存本次任务的文件。
5. 任一身份不匹配或无法核实时，停止提交并在本仓库范围内修正；不得继续提交后再补救。

## 每次推送、打标签和发布前

1. 重新核验上述身份及目标仓库。使用明确的 HTTPS 远端和公开账号凭据；不要沿用可能属于其他账号的默认 SSH 密钥。
2. 核对待推送的每个提交，不只检查当前配置或最新一条提交：

   ```sh
   git fetch origin main
   git log --format='%H %an <%ae> | %cn <%ce>' origin/main..HEAD
   ```

   首次发布或推送其他分支、标签时，检查所有将公开的可达提交。作者和提交者的名称、邮箱必须分别匹配允许值。不能用 `.mailmap` 或仅修改当前配置来掩盖不合规的历史元数据。

3. 检查待发布标签的目标提交及 annotated tag 的 tagger：

   ```sh
   git for-each-ref refs/tags --format='%(refname) %(objecttype) %(taggername) %(taggeremail)'
   ```

   标签署名同样只允许上述公开身份；必须使用 annotated tag（例如 `git tag -a <tag> -m <message>`），自动检查会拒绝没有 tagger 的轻量标签，并递归核验嵌套标签及其目标提交。不得将旧身份关联的提交或标签带入公开历史。

4. 检查 Release 正文、安装包、源码包、校验文件和市场索引。不得包含私人身份、本地 Git 备份、私人验收材料或指向旧身份记录的提交链接；源码归档的内嵌提交标识和市场索引也必须指向已核验的公开提交。
5. 任一检查不通过就停止推送或发布。修正尚未发布的本次内容后重新检查；发现已公开的身份问题时立即报告，不擅自删除仓库或重写已发布历史。

## 提交和发布后回读

- 提交完成后、推送之前，运行 `git log -1 --format='%H %an <%ae> | %cn <%ce>'`，核对实际写入的作者、提交者和邮箱。
- 推送后通过 GitHub API 回读新提交的 `author.login`、`committer.login` 及 `commit.author.email`、`commit.committer.email`，确认均匹配允许值。仅看到命令退出成功不足以证明身份正确。
- 发布后回读远端标签、Release 和市场索引的目标；涉及初次公开或历史调整时，同时核对 Contributors，明确区分已核实结果与缓存尚未刷新的状态。

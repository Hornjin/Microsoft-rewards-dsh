# Microsoft Rewards for DeepSeek Harness

把微软奖励（Microsoft Rewards）自动任务脚本打包成 **DeepSeek Harness (DSH) 插件**：脚本本体、控制接口、设置页与智能体工具全部内置，装上即用，不需要单独跑 Node 服务。

> **上游仓库**：[**TheNetsky/Microsoft-Rewards-Script**](https://github.com/TheNetsky/Microsoft-Rewards-Script)
> 本项目的自动化内核来自该仓库的 **v4 分支**，经 [chiihero/Microsoft-Rewards-Script](https://github.com/chiihero/Microsoft-Rewards-Script) 的 `V4-china` 分支做国内本地化（v4.3.5），再封装为 DSH 插件。
> 原始脚本版权归 TheNetsky 及各位贡献者所有，按 **GPL-3.0** 授权；本插件同样以 GPL-3.0 发布。

---

## 这是什么

上游脚本是一个独立的 Node 程序：读 `.env` 里的账号、`config.json` 里的行为配置，用 Patchright（补丁版 Chromium）登录并完成每日任务，另附一个 HTTP Control API 和 Web 面板。

本项目把它改造成 DSH 插件，做了三件事：

1. **内核原样内置** —— 上游 `dist/` 与依赖预编译后放在 `runtime/`，功能一项不减，插件以子进程方式驱动它（不再需要你手动 `npm install` 或开第二个服务）。
2. **桥接成 DSH 能力** —— 注册 13 个 `rewards_*` 智能体工具 + 17 条本地 bridge 路由，让对话和面板都能控制运行、账号、配置、计划、日志。
3. **补齐上游缺失的两块** —— 验证码（人机验证）接管、账号级手动登录开关。

## 功能

- **多账号自动任务**：每日搜索（移动端 / 桌面端 / 额外奖励）、每日活动集、更多促销、Punch 卡片、App 任务、每日签到、Read to Earn、搜索特权激活、可视化搜索。
- **浏览器自动化**：Patchright 驱动，移动端 / 桌面端两套 UA 与指纹，登录态与指纹持久化到 SQLite，下次免登录。
- **登录方式**：密码、TOTP 两步验证、无密码（Authenticator 推送）、恢复邮箱、手动交互登录。
- **人机验证（验证码）接管**：登录过程中一旦出现 Microsoft 的验证码 / 挑战页（HIP、Arkose、PerimeterX 等），立即暂停自动化，把浏览器窗口交给你手动完成；**你一通过就立刻继续**，不用重启。默认最多等 3 分钟，由 `captchaWait` 控制。
- **账号级手动登录开关**：按账号切换「手动登录 / 自动登录」。开启后该账号整段登录交给你——脚本只打开登录页并暂停，**一个字符都不输入**，检测到登录成功就继续自动化。默认最多等 10 分钟，由 `manualLoginWait` 控制。
- **代理**：每个账号可单独配置 HTTP / HTTPS / SOCKS4 / SOCKS5。
- **搜索词源**：china（百度 / 头条 / 抖音 / 微博 / 知乎）、本地 `search-queries.json`、Bing 联想词聚类、Google / Wikipedia / Reddit / HackerNews / RSS。
- **通知**：PushPlus、ServerChan、ClawBot、Discord、Telegram、ntfy，可按级别 / 关键词过滤。
- **调度**：5 段 cron 表达式，支持跳过正在运行的实例、排除指定账号。
- **诊断**：失败时抓取截图、页面 dump 与错误文本，可在面板里查看。
- **人类化**：安静时段、搜索目标比例、随机滚动与点击、任务间随机延迟。

### 相对上游的行为修正

跑完整每日任务时踩到的几个坑，已在上游代码里修掉（`docs/DETAIL.md` 有完整说明）：

| 问题 | 修正 |
| --- | --- |
| 桌面端会话从不落库，每次运行都要重新交互登录，失败即整段桌面阶段没有会话 | 桌面端无独立会话时用同一账号的移动端会话播种；**只借 cookie，指纹仍按桌面端重新生成** |
| 手动登录开关对移动端、桌面端无差别生效，一次运行要人工登录两次，第二次必然超时 | 手动登录前先探测状态，已是 `LOGGED_IN` 就直接 `finalizeLogin`，不再阻塞 |
| 桌面阶段失败会让 `Main()` 抛错，已赚积分在汇总里被记成 0 | 流程中断时用运行期余额快照回收已得积分，`ACCOUNT-END` 仍打印真实收益 |
| 现代 Rewards 门户的 flyout 不再返回 `MobileSearch` 计数器，移动端搜索被永久跳过 | 配额未知时照常搜索，改用**余额增量**计分，停止条件为「连续 5 次无增长或 20 次搜索」 |
| 签到推广常是 `hidden` / `give_eligible=false` 的旧推广，被判为运行失败 | 降级为警告并跳过——「今日无可签到额度」不等于失败 |

## 前置要求

只装三样，且都不在插件目录里：

| 依赖 | 版本 | 为什么 | 怎么确认 |
| --- | --- | --- | --- |
| **DeepSeek Harness** | ≥ `0.1.7-rc.1` | 插件宿主，提供 `tools` / `webServer` / `settings` 服务 | DSH 里能跑 `plugin_manager` 就行 |
| **Node.js** | **≥ 24**（必需，不是建议） | 脚本用了 `node:sqlite` 内建模块存 Cookie，Node 22 及以下直接 `Cannot find module 'node:sqlite'` | `node -v` |
| **Patchright Chromium** | revision **1228**（patchright 1.61.x 锁定） | 浏览器内核；不装会在 `chromium.launch()` 处失败 | 见下方「首次运行」 |

**不需要**装的东西：

- ❌ 不用 `npm install` —— 脚本内核与全部依赖（patchright、zod、fingerprint-generator 等）已预编译在 `runtime/` 里。
- ❌ 不用单独开 Node 服务 —— 上游的 Control API 已换成插件内的 17 条 bridge 路由。
- ❌ 不用装 Chrome / Edge —— 用的是 Patchright 自带的补丁版 Chromium（`browserChannel: "chromium"`）。
- ❌ 不用装 Python / 编译工具 —— 唯一的原生模块 `impit-win32-x64-msvc` 已随仓库附带。
- ⚠️ 手动登录 / 验证码接管需要**有图形界面**的 Windows 会话，纯无头服务器上只能自动登录。

> **Node 24 是硬性门槛。** 插件会按「插件配置 `nodePath` → `$DSH_NODE_EXECUTABLE` → `process.execPath` → `PATH` → `%ProgramFiles%\nodejs`」的顺序找一个真正的 `node.exe`，**不会**用 DSH 自带的 Electron 运行时（它的 `process.execPath` 是 `DeepSeek Harness.exe`，跑不了这个脚本）。所以哪怕 DSH 是安装版，也必须单独装 Node。

## 安装

插件通过 DSH 插件管理器安装（**不要**把目录直接丢进 `node_modules`）：

```bash
git clone https://github.com/Hornjin/Microsoft-rewards-dsh.git
```

然后在 DSH 里：

```
plugin_manager  action=install_bundle  target=<仓库绝对路径>
```

安装后入口 id 为 `include:microsoft-rewards`，工具前缀 `rewards_*`。

> `runtime/` 是预编译好的脚本内核（含依赖，约 111 MB / 6258 个文件），已随仓库提交，clone 后即可直接安装，无需 `npm install`。
>
> **仓库里没有任何账号数据**：`.env`、`config.json`、`sessions/`、`logs/`、`diagnostics/` 全在 `.gitignore` 里，模板文件用的是 `email@example.com` 之类的占位值。你的账号、密码、Cookie 只存在于本机数据目录。

### 首次运行：装 Chromium

```bash
# 推荐：直接用插件自带的那份 patchright，版本必然对得上
node "<插件目录>/runtime/node_modules/patchright/cli.js" install chromium

# 或者用 npx（要确保解析到 1.61.x）
npx patchright@1.61.1 install chromium
```

装完落在 `%LOCALAPPDATA%\ms-playwright\chromium-1228\`（约 415 MB）。校验一下：

```bash
node "<插件目录>/runtime/node_modules/patchright/cli.js" install --dry-run chromium
```

看到 `Install location: ...\chromium-1228` 就对了。

**版本必须匹配。** 上游锁的是 patchright 1.61.1 → Chromium **revision 1228**。如果机器上只有 `chromium-1217`、`chromium-1234` 之类的其他版本（别的 Playwright 项目装的），脚本启动浏览器时会报找不到可执行文件。这时候补一条上面的命令即可，多个版本可以共存，互不影响。

## 快速上手

```
rewards_accounts   action=add  index=1  email=you@outlook.com  password=***  geoLocale=CN  langCode=zh-CN
rewards_start
rewards_status
```

- 账号只写在数据目录的 `.env` 里（`ACCOUNT_<N>_*`），由面板 / 工具读写，不要手改到别处。
- 想手动登录：`rewards_accounts action=add ... manualLogin=true`，或在面板「账号」页点该账号的「登录」按钮。
- 想定时跑：`rewards_schedule action=set cron="30 8 * * *" enabled=true`。

## 智能体工具

| 工具 | 作用 |
| --- | --- |
| `rewards_status` | 运行状态、pid、账号数、计划、最近一次汇总，以及验证码 / 手动登录的等待状态 |
| `rewards_points` | 实时积分（本次获得、当前余额、账号明细） |
| `rewards_logs` | 解析后的日志，支持 `level` / `afterId` 翻页 |
| `rewards_errors` | 错误与警告，按账号归并 |
| `rewards_history` | 历史运行记录 |
| `rewards_accounts` | 账号列表 / 新增 / 删除（含手动登录开关） |
| `rewards_start` / `rewards_stop` / `rewards_restart` | 启动、停止、重启（可只跑某个账号或排除若干账号） |
| `rewards_config` | 读取 / 覆盖 / 深合并 / 与默认值比对 / 补齐缺失键 |
| `rewards_schedule` | 读取 / 设置 cron 计划 |
| `rewards_sessions` | 查看 / 删除已保存的登录态 |
| `rewards_diagnostics` | 列出失败诊断包 |

## 网页面板

插件在「设置 → 插件」里注册两处入口（行级与包级），面板分五个标签页：**状态 / 账号 / 配置 / 计划 / 日志**。

所有读写走本地 bridge（`POST /api/dsh-microsoft-rewards/*`），只接受 loopback 请求，并拒绝 `sec-fetch-site: cross-site`。

## 数据目录

默认 `C:\Users\<you>\.dsh\microsoft-rewards`（插件配置里可改 `dataDir`）。目录里放的就是上游脚本的运行时文件：

| 路径 | 内容 |
| --- | --- |
| `.env` | 账号（`ACCOUNT_<N>_*`） |
| `config.json` | 脚本配置，字段与原版 `config.example.json` 完全一致 |
| `config/schedule.json` | 定时计划 |
| `sessions/sessions.db` | 登录态与指纹（SQLite，分 `mobile` / `desktop` 两行） |
| `logs/` | 每日日志，按天滚动 |
| `diagnostics/` | 失败诊断包 |

脚本以该目录为 `cwd` 启动，所以它对 `package.json` / `.env` / `config.json` / `sessions/` / `logs/` 的定位与插件完全一致。

## 配置

插件自身只有几个开关：数据目录、node 路径、日志缓冲、历史条数、停止超时、是否启用调度。

**脚本行为全部在 `config.json` 里**，通过 `rewards_config` 或面板修改，改完在下次运行时生效。常用项：

| 键 | 说明 | 默认 |
| --- | --- | --- |
| `headless` | 是否无头运行。**手动登录 / 验证码接管需要 `false`** | `false` |
| `captchaWait` | 等待人工完成验证码的时长 | `"3min"` |
| `manualLoginWait` | 等待手动登录完成的时长 | `"10min"` |
| `globalTimeout` | Playwright 默认超时 | `"50sec"` |
| `prewarmDesktopLogin` | 是否在移动端阶段预热桌面会话 | `false` |
| `workers.doMobileSearch` / `doDesktopSearch` | 是否跑移动端 / 桌面端搜索 | `true` / `true` |
| `workers.doBonusSearches` | 是否跑额外奖励搜索 | `false` |
| `searchSettings.searchDelay` | 每次搜索间隔 | `6min`–`12min` |
| `searchSettings.queryEngines` | 搜索词源 | `["china","local"]` |
| `humanize.enabled` | 拟人化（安静时段、目标打折） | `false` |

## 排障

**移动端搜索被跳过，日志出现「移动端: 未提供」**
现代 Rewards 门户的 flyout 只返回 `PCSearch` / `ActivityAndQuiz` / `DailyPoint`，不再提供 `MobileSearch`。本项目已改为配额未知时按余额增量继续搜索（日志显示 `run (quota not provided, using balance delta)`）。如果你看到的是 `skip (quota not provided)`，说明跑的是未打补丁的旧内核。

**桌面阶段卡在「等待手动登录」**
开着手动登录开关时，桌面阶段本该复用移动端会话直接继续。若仍卡住，检查会话库里是否已有 `mobile` 行（`rewards_sessions`），以及 `headless` 是否为 `false`。

**`Login failed or aborted at state: EMAIL_VERIFICATION_INPUT`**
账号没有可用密码 / TOTP，登录需要交互。给该账号开启手动登录开关。

**日志中文在终端里是乱码**
日志文件（`logs/YYYY-MM-DD.log`）是 UTF-8，Windows 控制台默认 GBK 会显示成乱码；DSH 面板与 `rewards_logs` 解析正常。

## 已知限制

- 需要真实的 Node.js（≥ 24）与已下载的 Patchright Chromium；插件不会自动执行 `patchright install`。
- 面板与脚本不共享进程，看不到浏览器的实时画面，只能看到解析后的日志。
- 本分支只支持**新版（modern）Bing Rewards 面板**，旧版面板请用上游 v3 分支。

## 许可与声明

- 本项目及内置脚本内核均为 **GPL-3.0**（见 `runtime/LICENSE`）。
- 上游：[TheNetsky/Microsoft-Rewards-Script](https://github.com/TheNetsky/Microsoft-Rewards-Script)（v4 分支）；国内本地化分支：[chiihero/Microsoft-Rewards-Script](https://github.com/chiihero/Microsoft-Rewards-Script) `V4-china`。
- 自动化操作可能违反 Microsoft 服务条款，存在账号被限制的风险。仅供学习与个人研究使用，使用者自行承担全部后果。

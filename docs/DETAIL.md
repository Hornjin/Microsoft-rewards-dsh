# Microsoft Rewards 插件详解

本插件把 `Microsoft-Rewards-Script`（V4-china，v4.3.5）整体内置进 DSH：`runtime/` 是预编译好的脚本（`dist/` + `scripts/api/` + 依赖），插件负责启动它、解析它的输出、把状态暴露成工具与网页。

## 目录结构

```
microsoft-rewards-dsh/
├─ index.js          Host 入口：Config、13 个工具、17 条 bridge 路由、调度器
├─ client.js         网页端 React 面板（状态/账号/配置/计划/日志）
├─ cordis.patch.yml  bundle 声明（entry id = microsoft-rewards）
├─ lib/
│  ├─ paths.js       包目录、数据目录、各文件路径
│  ├─ harness.js     Harness 包解析（插件可能在 profile 之外）
│  ├─ runner.js      子进程管理 + node 可执行文件探测
│  ├─ runtime.js     数据目录播种、单账号/排除账号的环境重写、cron
│  ├─ store.js       .env / config.json / 计划 / 会话 / 校验
│  ├─ accounts.js    账号 + 历史统计
│  ├─ diagnostics.js 诊断包枚举与文件读取
│  └─ cron.js        5 段 cron 解析与下一次运行时间
├─ locale/           en.json / zh.json
├─ docs/DETAIL.md    本文件
└─ runtime/          预编译脚本（dist、scripts、node_modules、config.example.json、env.example、LICENSE）
```

## 运行模型

1. `apply(ctx, config)` 建立 `RewardsRuntime`：解析数据目录、播种缺失文件、构造 `BotRunner`。
2. `BotRunner` 复用脚本自带的 `scripts/api/processManager.js`，因此日志解析、运行状态机、`getPoints()` 的字段与原始 Control API 完全一致。
3. 启动时把数据目录下的 `.env` 读成对象传给子进程（而不是依赖 `process.env` 继承），并支持单账号运行（把 `ACCOUNT_<n>_*` 重写成 `ACCOUNT_1_*`、清空其余）与排除账号。
4. 子进程 `cwd` = 数据目录，`node` 用真实 Node 可执行文件（Harness 内 `process.execPath` 是 Electron，不能跑脚本），按 `DSH_NODE_EXECUTABLE` → `process.execPath` → `PATH` → 常见安装目录 的顺序探测。
5. `ctx.effect` 返回的清理函数会在插件卸载时停掉子进程并清空 cron。

## bridge 路由

全部为 `POST /api/dsh-microsoft-rewards/<route>`，JSON 进 JSON 出，仅接受 loopback（并拒绝 `sec-fetch-site: cross-site` 与外部 Origin）：

`describe` `status` `logs` `errors` `history` `accounts` `sessions` `diagnostics` `config` `schedule` `start` `stop` `restart` `save-schedule` `save-config` `save-accounts` `delete-session`

返回值统一为 `{ok:true,value}` 或 `{ok:false,code,message,errors?}`。

## 与原版 Control API 的差异

原版 `scripts/api/server.js` 是一个独立 HTTP 服务（默认 3010 端口，可选 token）。插件不另起端口，而是把这些端点搬进 Harness 的 webServer，并省掉了 token 机制——它只对本机 GUI 开放，鉴权由 Harness 本身负责。除此之外：

- 计划不再写 `/etc/cron.d`，改由插件内的 `CronTimer` 触发（跨平台，不需要 root）。
- 配置写入不再受 `API_ALLOW_CONFIG_WRITE` 开关限制，写入前一律走脚本自带的 `ConfigSchema` 校验。
- 会话删除、诊断读取、账号统计的行为与字段保持一致。

## 人机验证接管

原脚本完全没有验证码处理逻辑（`runtime/dist` 里 `captcha` 零命中），所以这部分是在 `runtime/dist/browser/auth/Login.js` 里新增的：

1. `detectCaptcha(page)`：先用一次 `page.evaluate` 在页面内同时探测 `captchaContainer` / `captchaFrame` / `captchaInput` / `captchaImage` 四组选择器（`getComputedStyle` + `getBoundingClientRect` 判可见，尺寸 > 8px），再回退扫描 `page.frames()` 里 url 命中 `hip|arkose|captcha|challenge|px-cdn|perimeterx` 的子帧。返回 `{kind, selector}` 或 `null`。
2. `detectCurrentState` 在账户锁定检查**之前**调用它，命中即返回 `CAPTCHA_CHALLENGE`；该状态被放在 `priorities` 首位，`handleState` 的首个分支处理它。
3. `waitForHumanVerification(page, account)` 记录 `warn` 日志后进入轮询：每 2 秒重新 `detectCurrentState`，**连续两次**不再是 `CAPTCHA_CHALLENGE` 才判定通过并立即返回 `true`（防止组件重绘造成误判）。每 30 秒打一条心跳日志。超时、页面被关闭都返回 `false`，登录随即失败。
4. 轮询用的是原生 `setTimeout`，刻意避开 `bot.utils.wait()`——后者会等待 humanize 的静默时段，可能让 3 分钟变成几小时。
5. 等待时长来自 `config.captchaWait`（默认 `3min`，新增到 `ConfigSchema` / `defaultConfig` / `ConfigEnvOverrides` 的 `CONFIG_CAPTCHA_WAIT` / `config.example.json`）。
6. 等待期间主循环不会触发「停滞 4 次就 reload」的逻辑（`login()` 里的条件已排除 `CAPTCHA_CHALLENGE`），否则会打断用户操作。
7. 日志标题为 `CAPTCHA`，`scripts/api/logParser.js` 会把它解析成运行状态里的 `captcha: {email, sinceTs, resolvedAt, timedOut}`，因此 `rewards_status`、网页面板（状态页横幅 + 折叠摘要）都能显示当前是在等待验证还是已恢复。

## 账号级手动登录

需求：账号配置界面要有个开关，开启后不再自动登录，而是打开登录页让用户自己完整登录一次，脚本只负责监视登录是否完成，完成后再接管自动化。

1. 开关存在账号环境变量里：`ACCOUNT_<n>_MANUAL_LOGIN`（`true`/`false`）。`runtime/dist/util/Load.js` 的 `loadAccounts()` 用 `envBool` 读出 `manualLogin`，`Validator.js` 的 `AccountSchema` 加 `manualLogin: z.boolean().optional()`（可选，旧 `.env` 不受影响）。
2. `Login.login()` 在 `disableFido()` 之后、进入 25 轮状态机之前检查 `account.manualLogin`：为真就直接进 `waitForManualLogin()`，**一个字符都不输入**，成功后再走原有的 `finalizeLogin()`（Bing 会话验证 → 奖励上下文 → 保存 cookie）。
3. `waitForManualLogin(page, account)` 每 2 秒 `detectCurrentState`，只要出现 `LOGGED_IN` 就立即返回（所以用户一登录完就恢复，不会空等）；`ACCOUNT_LOCKED`、页面关闭、超时都返回 `false`。日志标题 `MANUAL-LOGIN`，三种消息分别是开始等待、检测到完成、超时。
4. 等待时长来自 `config.manualLoginWait`（默认 `10min`，同样进了 `ConfigSchema` / `defaultConfig` / `ConfigEnvOverrides` 的 `CONFIG_MANUAL_LOGIN_WAIT` / `config.example.json`）。轮询同样用原生 `setTimeout`。
5. 插件侧：`rewards_accounts` 加 `manualLogin` 参数、列表里带 `[手动登录]` 标记；`lib/accounts.js` 的 `accountsSummary` 暴露 `manualLogin`；面板「账号」页表格多一列「登录」按钮用于一键切换，添加表单里也有「登录方式」按钮。
6. `save-accounts` 路由改成**合并语义**：只删掉从列表里移除的槽位，保留其余槽位的密码/TOTP 等敏感字段，避免面板只提交邮箱时把密码清空。
7. `scripts/api/logParser.js` 解析 `MANUAL-LOGIN` 三态到 `state.manualLogin`，`rewards_status` 与面板横幅显示「等待手动登录 / 已登录并恢复 / 超时」。

## 每日任务跑不完的四项修复

一轮真实运行暴露出「移动端搜完、桌面阶段超时、整轮记 0 分」的问题，根因与修复如下。

1. **桌面会话不落库**（`runtime/dist/browser/Browser.js` `createBrowser`）：桌面端没有自己的 `desktop` 会话时，改用同一账户的 `mobile` 会话播种（`session = { ...mobileSession, fingerprint: null }`，只借 cookie、指纹仍按桌面端重新生成，避免移动端指纹在桌面上下文穿帮）。这样桌面阶段不必每次重新交互登录，登录成功后 `closeBrowser` 会把 cookie 写回 `desktop` 行。日志：`桌面端无独立会话，使用移动端会话播种 | Cookie数=N`。
2. **手动登录开关不再重复阻塞**（`Login.login`）：`account.manualLogin` 为真时先 `detectCurrentState`，若已是 `LOGGED_IN`（会话已被播种/恢复）就直接 `finalizeLogin`，只有真的没登录才 `waitForManualLogin`。日志：`手动登录账户已存在有效会话（移动端/桌面端），跳过人工登录`。
3. **部分成果不被抹成 0**（`runtime/dist/index.js`）：`Main()` 抛错时不再让 `result` 为 `undefined`，改走 `buildPartialResult(flowError)`——用运行期的 `userData.initialPoints` / `currentPoints` 快照算出已赚积分，`[ACCOUNT-END]` 仍能打印真实收益。
4. **移动端配额未知时继续搜索**（`SearchProgress` / `SearchManager` / `BrowserSearch`）：现代 Rewards 门户的 flyout 只返回 `PCSearch` / `ActivityAndQuiz` / `DailyPoint`，**没有 `MobileSearch`**（已实测：`page.evaluate(fetch)` 在真实浏览器上下文里同样只有这三项，`channel` / UA / `isMobile` 等参数全部无效）。所以：
   - `SearchProgress.getSnapshot()` 一次取回 `{counters, availablePoints}`；`calculateMissing()` 额外返回 `mobileKnown` / `desktopKnown` / `edgeKnown`。
   - `SearchManager.getSearchPoints()` 在配额未知时仍返回 `doMobile: true`，日志输出 `run (quota not provided, using balance delta)`。
   - `PointsTracker` 新增 `balanceMode`：配额未知时按 `availablePoints` 的增量计分，停止条件换成「连续 5 次无增长或 20 次搜索」（`BALANCE_STAGNANT_LIMIT` / `BALANCE_MAX_SEARCHES`），`progress()` 显示 `earned=N (balance mode)`。
5. 顺带把 `DailyCheckIn` 的「签到未确认到账」从抛错降级为警告并返回 `false`：现代门户的签到推广常是 `hidden` / `give_eligible=false` 的旧推广，属于「今日无可签到额度」，不该让整轮账户被标记为失败。

## 数据目录播种

首次运行会写入：`package.json`（让脚本的 `getProjectRoot()` 认这个目录）、`config.json`（从 `config.example.json` 复制）、`.env`（带注释模板）、`config/schedule.json`、以及 `sessions/ logs/ diagnostics/` 三个空目录。已有文件不会被覆盖。

## 已知限制

- 需要真实的 Node.js（>=24）与已下载的 Patchright Chromium；插件不会自动 `patchright install`。
- 面板与脚本不共享进程，所以面板里看不到浏览器的实时画面，只能看到解析后的日志。
- 脚本的 GPL-3.0 传染性适用于 `runtime/`，本插件整体按 GPL-3.0 发布。

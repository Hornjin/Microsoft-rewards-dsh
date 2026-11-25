window.__ModuleLoader__.load({
  id: "microsoft-rewards-dsh",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;

    const react = require("react");

    const BRIDGE = "/api/dsh-microsoft-rewards";
    const NS = "microsoft-rewards";

    const h = react.createElement;

    async function post(route, body) {
      try {
        const response = await fetch(`${BRIDGE}/${route}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body ?? {}),
        });
        return await response.json();
      } catch (error) {
        return { ok: false, code: "network", message: error instanceof Error ? error.message : String(error) };
      }
    }

    /* ------------------------------------------------------------------ style */

    const CSS = [
      ".dsmr-card{font-family:-apple-system,\"SF Pro Text\",\"PingFang SC\",\"Segoe UI\",system-ui,sans-serif;border:1px solid rgba(0,0,0,.07);background:rgba(255,255,255,.72);backdrop-filter:blur(14px);border-radius:14px;overflow:hidden;color:inherit;box-shadow:0 1px 2px rgba(0,0,0,.04)}",
      "@media (prefers-color-scheme: dark){.dsmr-card{background:rgba(30,30,32,.7);border-color:rgba(255,255,255,.08)}}",
      ".dsmr-head{display:flex;align-items:center;gap:12px;padding:16px 20px}",
      ".dsmr-title{font-size:15px;font-weight:600;letter-spacing:-.01em}",
      ".dsmr-sub{font-size:12px;opacity:.6;margin-top:2px}",
      ".dsmr-dot{width:8px;height:8px;border-radius:50%;background:#b0b0b6;flex:none}",
      ".dsmr-dot.on{background:#30c46b;box-shadow:0 0 0 3px rgba(48,196,107,.18)}",
      ".dsmr-dot.busy{background:#f0a500;box-shadow:0 0 0 3px rgba(240,165,0,.18)}",
      ".dsmr-dot.err{background:#e5484d;box-shadow:0 0 0 3px rgba(229,72,77,.18)}",
      ".dsmr-tabs{display:flex;gap:4px;padding:0 12px;border-bottom:1px solid rgba(0,0,0,.06);overflow-x:auto}",
      "@media (prefers-color-scheme: dark){.dsmr-tabs{border-color:rgba(255,255,255,.08)}}",
      ".dsmr-tab{appearance:none;border:0;background:0 0;font:inherit;font-size:13px;padding:9px 12px;cursor:pointer;opacity:.62;border-bottom:2px solid transparent;white-space:nowrap;color:inherit}",
      ".dsmr-tab.active{opacity:1;border-bottom-color:currentColor;font-weight:600}",
      ".dsmr-body{padding:16px 20px;display:flex;flex-direction:column;gap:14px}",
      ".dsmr-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}",
      ".dsmr-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}",
      ".dsmr-stat{border:1px solid rgba(0,0,0,.06);border-radius:10px;padding:10px 12px}",
      "@media (prefers-color-scheme: dark){.dsmr-stat{border-color:rgba(255,255,255,.08)}}",
      ".dsmr-stat b{display:block;font-size:19px;font-weight:650;letter-spacing:-.02em}",
      ".dsmr-stat span{font-size:11px;opacity:.6;text-transform:uppercase;letter-spacing:.05em}",
      ".dsmr-btn{appearance:none;font:inherit;font-size:13px;padding:7px 14px;border-radius:8px;border:1px solid rgba(0,0,0,.12);background:rgba(255,255,255,.9);cursor:pointer;color:inherit;transition:background 140ms}",
      ".dsmr-btn:hover:not(:disabled){background:rgba(0,0,0,.04)}",
      ".dsmr-btn:disabled{opacity:.45;cursor:default}",
      ".dsmr-btn.primary{background:#2f6fed;border-color:#2f6fed;color:#fff}",
      ".dsmr-btn.primary:hover:not(:disabled){background:#2a63d4}",
      ".dsmr-btn.danger{color:#e5484d;border-color:rgba(229,72,77,.4)}",
      "@media (prefers-color-scheme: dark){.dsmr-btn{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.14)}.dsmr-btn:hover:not(:disabled){background:rgba(255,255,255,.14)}}",
      ".dsmr-field{display:flex;flex-direction:column;gap:5px;font-size:12px}",
      ".dsmr-field>label{opacity:.62;font-weight:500}",
      ".dsmr-input{font:inherit;font-size:13px;padding:7px 10px;border-radius:8px;border:1px solid rgba(0,0,0,.14);background:rgba(255,255,255,.9);color:inherit;width:100%;box-sizing:border-box}",
      "@media (prefers-color-scheme: dark){.dsmr-input{background:rgba(0,0,0,.28);border-color:rgba(255,255,255,.14)}}",
      ".dsmr-input:focus{outline:2px solid rgba(47,111,237,.4);outline-offset:0}",
      ".dsmr-code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11.5px;line-height:1.55;max-height:280px;overflow:auto;background:rgba(0,0,0,.035);border-radius:10px;padding:10px 12px;white-space:pre-wrap;word-break:break-word}",
      "@media (prefers-color-scheme: dark){.dsmr-code{background:rgba(0,0,0,.3)}}",
      ".dsmr-table{width:100%;border-collapse:collapse;font-size:12.5px}",
      ".dsmr-table th{text-align:left;font-weight:600;opacity:.55;padding:6px 8px;border-bottom:1px solid rgba(0,0,0,.08);font-size:11px;text-transform:uppercase;letter-spacing:.04em}",
      ".dsmr-table td{padding:7px 8px;border-bottom:1px solid rgba(0,0,0,.045);vertical-align:top}",
      "@media (prefers-color-scheme: dark){.dsmr-table th,.dsmr-table td{border-color:rgba(255,255,255,.08)}}",
      ".dsmr-note{font-size:12px;opacity:.6;line-height:1.5}",
      ".dsmr-bad{color:#e5484d}",
      ".dsmr-good{color:#2f9e5f}",
      ".dsmr-log{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11.5px;line-height:1.6;max-height:300px;overflow:auto}",
      ".dsmr-log div{white-space:pre-wrap;word-break:break-word}",
      ".dsmr-tag{font-size:10px;padding:1px 6px;border-radius:999px;border:1px solid currentColor;opacity:.75;text-transform:uppercase;letter-spacing:.04em}",
    ].join("");

    let styleInjected = false;
    function ensureStyle() {
      if (styleInjected || typeof document === "undefined") return;
      styleInjected = true;
      const node = document.createElement("style");
      node.setAttribute("data-plugin", "microsoft-rewards-dsh");
      node.textContent = CSS;
      document.head.appendChild(node);
    }

    /* ------------------------------------------------------------------ pieces */

    function Field(props) {
      return h(
        "div",
        { className: "dsmr-field" },
        h("label", null, props.label),
        props.children
      );
    }

    function Input(props) {
      return h("input", { className: "dsmr-input", ...props });
    }

    function Stat(props) {
      return h("div", { className: "dsmr-stat" }, h("b", null, props.value), h("span", null, props.label));
    }

    function statusDotClass(value) {
      if (!value) return "dsmr-dot";
      if (value.running) return "dsmr-dot busy";
      if (value.state === "error") return "dsmr-dot err";
      return "dsmr-dot";
    }

    /* -------------------------------------------------------------------- app */

    function RewardsCard(props) {
      ensureStyle();
      const pageMode = !!(props && props.page);
      const [tab, setTab] = react.useState("status");
      const [open, setOpen] = react.useState(pageMode);
      const [state, setState] = react.useState({ loading: true });
      const [busy, setBusy] = react.useState("");
      const [message, setMessage] = react.useState(null);
      const [configText, setConfigText] = react.useState("");
      const [cron, setCron] = react.useState("30 8 * * *");
      const [accountForm, setAccountForm] = react.useState({ index: "", email: "", password: "", totpSecret: "", geoLocale: "CN", langCode: "zh-CN", manualLogin: false });
      const [logs, setLogs] = react.useState([]);

      const load = react.useCallback(async () => {
        const result = await post("describe");
        if (result.ok) {
          setState({ loading: false, ...result.value });
          if (result.value.schedule?.cron) setCron(result.value.schedule.cron);
        } else {
          setState({ loading: false, error: result.message ?? "failed to load" });
        }
      }, []);

      react.useEffect(() => {
        if (!open) return;
        void load();
        const timer = setInterval(() => void load(), 5000);
        return () => clearInterval(timer);
      }, [open, load]);

      const run = react.useCallback(async (name, route, body, after) => {
        setBusy(name);
        setMessage(null);
        const result = await post(route, body);
        setBusy("");
        if (!result.ok) setMessage({ bad: true, text: result.message ?? `${name} failed` });
        else if (after) setMessage({ bad: false, text: after });
        await load();
        return result;
      }, [load]);

      const loadLogs = react.useCallback(async () => {
        const result = await post("logs", { limit: 120 });
        if (result.ok) setLogs(result.value.logs ?? []);
      }, []);

      react.useEffect(() => {
        if (open && tab === "logs") {
          void loadLogs();
          const timer = setInterval(() => void loadLogs(), 4000);
          return () => clearInterval(timer);
        }
        return undefined;
      }, [open, tab, loadLogs]);

      const status = state.status ?? {};
      const points = state.points ?? {};
      const schedule = state.schedule ?? {};
      const accounts = state.accounts ?? [];

      const summary = react.useMemo(() => {
        if (state.loading) return "loading…";
        if (state.error) return state.error;
        const label = status.state === "idle" ? "idle" : status.state;
        const captchaPending = status.run?.captcha && !status.run.captcha.resolvedAt;
        const bal = points.balance === undefined ? "" : ` · ${points.balance} pts`;
        return `${label}${captchaPending ? " · 等待人工验证" : ""}${bal} · ${accounts.length} account(s)`;
      }, [state, status, points, accounts]);

      if (!open) {
        return h(
          "div",
          { className: "dsmr-card" },
          h(
            "button",
            { className: "dsmr-head", onClick: () => setOpen(true), style: { width: "100%", background: 0, border: 0, cursor: "pointer", font: "inherit", color: "inherit", textAlign: "left" } },
            h("div", { className: statusDotClass(status) }),
            h(
              "div",
              null,
              h("div", { className: "dsmr-title" }, "Microsoft Rewards"),
              h("div", { className: "dsmr-sub" }, summary)
            )
          )
        );
      }

      const tabs = [
        ["status", "状态"],
        ["accounts", "账号"],
        ["config", "配置"],
        ["schedule", "计划"],
        ["logs", "日志"],
      ];

      const body = [];

      if (state.error) body.push(h("div", { className: "dsmr-note dsmr-bad" }, state.error));

      if (message) {
        body.push(h("div", { className: message.bad ? "dsmr-note dsmr-bad" : "dsmr-note dsmr-good" }, message.text));
      }

      if (tab === "status") {
        body.push(
          h(
            "div",
            { className: "dsmr-grid" },
            h(Stat, { label: "状态", value: status.state ?? "-" }),
            h(Stat, { label: "当前积分", value: points.balance ?? "-" }),
            h(Stat, { label: "本轮获得", value: points.collected ?? 0 }),
            h(Stat, { label: "账号", value: accounts.length })
          )
        );
        body.push(
          h(
            "div",
            { className: "dsmr-row" },
            h("button", { className: "dsmr-btn primary", disabled: !!busy || status.state !== "idle", onClick: () => run("start", "start", {}, "已启动运行") }, busy === "start" ? "启动中…" : "开始运行"),
            h("button", { className: "dsmr-btn", disabled: !!busy || status.state === "idle", onClick: () => run("stop", "stop", {}, "已请求停止") }, "停止"),
            h("button", { className: "dsmr-btn", disabled: !!busy || accounts.length === 0, onClick: () => run("restart", "restart", {}, "已重启") }, "重启"),
            h("button", { className: "dsmr-btn", disabled: !!busy, onClick: () => void load() }, "刷新")
          )
        );
        body.push(
          h(
            "div",
            { className: "dsmr-note" },
            `数据目录：${state.dataDir ?? "-"}`,
            h("br"),
            `脚本版本：${state.version ?? "-"} · 内置运行时：${state.runtimeDir ?? "-"}`
          )
        );
        const runAccounts = points.accounts ?? [];
        const captcha = status.run?.captcha;
        if (captcha && !captcha.resolvedAt) {
          body.push(
            h(
              "div",
              { className: "dsmr-note dsmr-bad" },
              `需要人工验证：自动化已暂停（账号 ${captcha.email ?? "-"}，自 ${captcha.sinceTs ?? "-"} 起）。请在浏览器窗口完成验证码，通过后会自动继续。`
            )
          );
        } else if (captcha && captcha.timedOut) {
          body.push(h("div", { className: "dsmr-note dsmr-bad" }, `人工验证等待超时（账号 ${captcha.email ?? "-"}）。`));
        } else if (captcha && captcha.resolvedAt) {
          body.push(h("div", { className: "dsmr-note dsmr-good" }, `人工验证已完成（账号 ${captcha.email ?? "-"}），自动化已恢复。`));
        }
        if (runAccounts.length > 0) {
          body.push(
            h(
              "table",
              { className: "dsmr-table" },
              h("thead", null, h("tr", null, h("th", null, "账号"), h("th", null, "获得"), h("th", null, "余额"))),
              h(
                "tbody",
                null,
                runAccounts.map((a, i) =>
                  h("tr", { key: i }, h("td", null, a.email ?? "-"), h("td", null, `+${a.collected ?? 0}`), h("td", null, a.balance ?? "-"))
                )
              )
            )
          );
        }
      }

      if (tab === "accounts") {
        if (accounts.length === 0) {
          body.push(h("div", { className: "dsmr-note" }, "尚未配置账号。在下方填写邮箱后点击“添加账号”。"));
        } else {
          body.push(
            h(
              "table",
              { className: "dsmr-table" },
              h("thead", null, h("tr", null, h("th", null, "槽位"), h("th", null, "邮箱"), h("th", null, "地区"), h("th", null, "登录"), h("th", null, "运行"), h("th", null, ""))),
              h(
                "tbody",
                null,
                accounts.map(a =>
                  h(
                    "tr",
                    { key: a.index },
                    h("td", null, `#${a.index}`),
                    h("td", null, a.email, a.hasTotp ? h("span", { className: "dsmr-tag", style: { marginLeft: 6 } }, "TOTP") : null),
                    h("td", null, a.geoLocale ?? "-"),
                    h(
                      "td",
                      null,
                      h(
                        "button",
                        {
                          className: `dsmr-btn${a.manualLogin ? " primary" : ""}`,
                          disabled: !!busy,
                          title: a.manualLogin
                            ? "已开启手动登录：运行时打开登录页后等你登录完成，再继续自动化"
                            : "自动化登录：由脚本自动输入邮箱与密码",
                          onClick: async () => {
                            const next = accounts.map(x => ({
                              index: x.index,
                              email: x.email,
                              geoLocale: x.geoLocale,
                              langCode: x.langCode,
                              manualLogin: x.index === a.index ? !a.manualLogin : !!x.manualLogin,
                            }));
                            await run(
                              "accounts",
                              "save-accounts",
                              { accounts: next },
                              a.manualLogin ? `已关闭 ACCOUNT_${a.index} 的手动登录` : `已开启 ACCOUNT_${a.index} 的手动登录`
                            );
                          },
                        },
                        a.manualLogin ? "手动登录" : "自动登录"
                      )
                    ),
                    h("td", null, a.runs ?? 0),
                    h(
                      "td",
                      null,
                      h(
                        "button",
                        {
                          className: "dsmr-btn danger",
                          disabled: !!busy,
                          onClick: async () => {
                            const next = accounts.filter(x => x.index !== a.index).map(x => ({ index: x.index, email: x.email }));
                            await run("accounts", "save-accounts", { accounts: next }, `已移除 ACCOUNT_${a.index}`);
                          },
                        },
                        "移除"
                      )
                    )
                  )
                )
              )
            )
          );
        }
        body.push(
          h(
            "div",
            { className: "dsmr-grid" },
            h(Field, { label: "槽位编号" }, h(Input, { value: accountForm.index, placeholder: "1", onChange: e => setAccountForm({ ...accountForm, index: e.target.value }) })),
            h(Field, { label: "邮箱" }, h(Input, { value: accountForm.email, placeholder: "you@example.com", onChange: e => setAccountForm({ ...accountForm, email: e.target.value }) })),
            h(Field, { label: "密码（可空）" }, h(Input, { type: "password", value: accountForm.password, onChange: e => setAccountForm({ ...accountForm, password: e.target.value }) })),
            h(Field, { label: "TOTP 密钥（可空）" }, h(Input, { value: accountForm.totpSecret, onChange: e => setAccountForm({ ...accountForm, totpSecret: e.target.value }) })),
            h(Field, { label: "地区 GEO_LOCALE" }, h(Input, { value: accountForm.geoLocale, onChange: e => setAccountForm({ ...accountForm, geoLocale: e.target.value }) })),
            h(Field, { label: "语言 LANG_CODE" }, h(Input, { value: accountForm.langCode, onChange: e => setAccountForm({ ...accountForm, langCode: e.target.value }) })),
            h(
              Field,
              { label: "登录方式" },
              h(
                "button",
                {
                  className: `dsmr-btn${accountForm.manualLogin ? " primary" : ""}`,
                  onClick: () => setAccountForm({ ...accountForm, manualLogin: !accountForm.manualLogin }),
                },
                accountForm.manualLogin ? "手动登录" : "自动登录"
              ),
              h(
                "div",
                { className: "dsmr-note", style: { marginTop: 4 } },
                accountForm.manualLogin
                  ? "运行时会打开登录页并暂停，等你完成登录（含验证码）后自动继续。"
                  : "由脚本自动输入邮箱与密码；遇到验证码仍会暂停等你处理。"
              )
            )
          )
        );
        body.push(
          h(
            "div",
            { className: "dsmr-row" },
            h(
              "button",
              {
                className: "dsmr-btn primary",
                disabled: !!busy || !accountForm.email,
                onClick: async () => {
                  const index = Number(accountForm.index) || accounts.length + 1;
                  const existing = accounts.find(x => x.index === index);
                  const next = accounts.map(x => ({ index: x.index, email: x.email })).filter(x => x.index !== index);
                  next.push({ ...accountForm, index });
                  next.sort((a, b) => a.index - b.index);
                  const result = await run("accounts", "save-accounts", { accounts: next }, `已保存 ACCOUNT_${index}`);
                  if (result.ok) setAccountForm({ index: "", email: "", password: "", totpSecret: "", geoLocale: "CN", langCode: "zh-CN", manualLogin: existing ? !!existing.manualLogin : false });
                },
              },
              "添加账号"
            ),
            h("div", { className: "dsmr-note" }, "注意：通过设置页保存会重写 .env 中的账号块；密码与 TOTP 仅保存在本机。")
          )
        );
      }

      if (tab === "config") {
        if (!configText && state.configPath) {
          void post("config").then(result => {
            if (result.ok) setConfigText(JSON.stringify(result.value.config, null, 2));
          });
        }
        body.push(
          h("div", { className: "dsmr-note" }, `配置文件：${state.configPath ?? "-"}（保存后下次运行生效）`)
        );
        body.push(
          h("textarea", {
            className: "dsmr-input",
            style: { minHeight: 260, fontFamily: "ui-monospace,Menlo,monospace", fontSize: 11.5, lineHeight: 1.55 },
            value: configText,
            spellCheck: false,
            onChange: e => setConfigText(e.target.value),
          })
        );
        body.push(
          h(
            "div",
            { className: "dsmr-row" },
            h(
              "button",
              {
                className: "dsmr-btn primary",
                disabled: !!busy,
                onClick: async () => {
                  let parsed;
                  try {
                    parsed = JSON.parse(configText);
                  } catch (error) {
                    setMessage({ bad: true, text: `JSON 解析失败：${error.message}` });
                    return;
                  }
                  await run("config", "save-config", { config: parsed }, "配置已保存");
                },
              },
              "保存配置"
            ),
            h("button", { className: "dsmr-btn", disabled: !!busy, onClick: () => void post("config").then(r => r.ok && setConfigText(JSON.stringify(r.value.config, null, 2))) }, "重新载入")
          )
        );
      }

      if (tab === "schedule") {
        body.push(
          h(
            "div",
            { className: "dsmr-grid" },
            h(Field, { label: "Cron 表达式（5 段，本地时间）" }, h(Input, { value: cron, onChange: e => setCron(e.target.value) })),
            h(Field, { label: "下次运行" }, h(Input, { value: schedule.nextRunAt ?? "未启用", readOnly: true })),
            h(Field, { label: "状态" }, h(Input, { value: schedule.enabled ? "已启用" : "已停用", readOnly: true }))
          )
        );
        body.push(
          h(
            "div",
            { className: "dsmr-row" },
            h(
              "button",
              {
                className: "dsmr-btn primary",
                disabled: !!busy,
                onClick: () => run("schedule", "save-schedule", { cron, enabled: true, skipIfRunning: true }, "定时已启用"),
              },
              "启用定时"
            ),
            h(
              "button",
              {
                className: "dsmr-btn",
                disabled: !!busy,
                onClick: () => run("schedule", "save-schedule", { cron: schedule.cron ?? cron, enabled: false }, "定时已停用"),
              },
              "停用定时"
            )
          )
        );
        if (schedule.error) body.push(h("div", { className: "dsmr-note dsmr-bad" }, schedule.error));
        body.push(h("div", { className: "dsmr-note" }, "示例：`30 8 * * *` 每天 08:30；`0 */6 * * *` 每 6 小时。周日可写 0 或 7。"));
      }

      if (tab === "logs") {
        body.push(
          h(
            "div",
            { className: "dsmr-row" },
            h("button", { className: "dsmr-btn", disabled: !!busy, onClick: () => void loadLogs() }, "刷新日志"),
            h("div", { className: "dsmr-note" }, `${logs.length} 条`)
          )
        );
        body.push(
          h(
            "div",
            { className: "dsmr-log" },
            logs.length === 0
              ? h("div", { className: "dsmr-note" }, "暂无日志。运行一次后这里会显示解析后的输出。")
              : logs.map(entry =>
                  h(
                    "div",
                    { key: entry.id },
                    `[${entry.level}]${entry.platform ? ` (${entry.platform})` : ""}${entry.title ? ` [${entry.title}]` : ""} ${entry.message}`
                  )
                )
          )
        );
      }

      return h(
        "div",
        { className: "dsmr-card" },
        h(
          "div",
          { className: "dsmr-head" },
          h("div", { className: statusDotClass(status) }),
          h(
            "div",
            { style: { flex: 1 } },
            h("div", { className: "dsmr-title" }, "Microsoft Rewards"),
            h("div", { className: "dsmr-sub" }, summary)
          ),
          pageMode ? null : h("button", { className: "dsmr-btn", onClick: () => setOpen(false) }, "收起")
        ),
        h(
          "div",
          { className: "dsmr-tabs" },
          tabs.map(([id, label]) => h("button", { key: id, className: tab === id ? "dsmr-tab active" : "dsmr-tab", onClick: () => setTab(id) }, label))
        ),
        h("div", { className: "dsmr-body" }, body)
      );
    }

    function summaryText() {
      return "Microsoft Rewards · 多账号自动任务";
    }

    /* ------------------------------------------------------------------ plugin */

    const inject = ["slots"];

    function apply(ctx) {
      ctx.slots.inject("plugins.row.config", () =>
        ctx.slots.register(
          { name: "plugins.row.config", key: `microsoft-rewards-dsh#microsoft-rewards` },
          slotProps => (slotProps && slotProps.view === "summary" ? summaryText() : h(RewardsCard, { page: true }))
        )
      );
      ctx.slots.inject("plugins.bundle.config", () =>
        ctx.slots.register(
          { name: "plugins.bundle.config", key: "microsoft-rewards-dsh" },
          slotProps => (slotProps && slotProps.view === "summary" ? summaryText() : h(RewardsCard, { page: true }))
        )
      );
    }

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  },
});

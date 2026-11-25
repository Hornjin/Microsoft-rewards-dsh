import fs from 'node:fs'
import path from 'node:path'

import ProcessManager from '../runtime/scripts/api/processManager.js'
import { RUNTIME_DIR, dataPaths } from './paths.js'

/** Parse a dotenv file into a plain object without touching `process.env`. */
export function readEnvFile(file) {
    if (!fs.existsSync(file)) return {}
    const out = {}
    const raw = fs.readFileSync(file, 'utf8')
    for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const eq = trimmed.indexOf('=')
        if (eq === -1) continue
        const key = trimmed.slice(0, eq).trim()
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue
        let value = trimmed.slice(eq + 1).trim()
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1)
        }
        out[key] = value
    }
    return out
}

export function writeEnvFile(file, values) {
    const lines = [
        '# Microsoft Rewards accounts, managed by the DeepSeek Harness plugin.',
        '# One numbered block per account; slots may be skipped (ACCOUNT_2 without ACCOUNT_1 is fine).',
        '# LANG_CODE is a BCP 47 tag (zh-CN, en). GEO_LOCALE is a two-letter code or "auto".',
        ''
    ]
    const indexes = [...new Set(Object.keys(values).map(k => /^ACCOUNT_(\d+)_/.exec(k)?.[1]).filter(Boolean))].sort(
        (a, b) => Number(a) - Number(b)
    )
    for (const index of indexes) {
        lines.push(`# Account ${index}`)
        const keys = Object.keys(values)
            .filter(k => k.startsWith(`ACCOUNT_${index}_`))
            .sort((a, b) => {
                const order = ['EMAIL', 'PASSWORD', 'TOTP_SECRET', 'RECOVERY_EMAIL', 'GEO_LOCALE', 'LANG_CODE', 'MANUAL_LOGIN']
                const rank = key => {
                    const suffix = key.slice(`ACCOUNT_${index}_`.length)
                    const at = order.indexOf(suffix)
                    return at === -1 ? order.length : at
                }
                return rank(a) - rank(b) || a.localeCompare(b)
            })
        for (const key of keys) {
            lines.push(`${key}=${values[key]}`)
        }
        lines.push('')
    }
    fs.mkdirSync(path.dirname(file), { recursive: true })
    const tmp = `${file}.${process.pid}.tmp`
    fs.writeFileSync(tmp, lines.join('\n'), { mode: 0o600 })
    fs.renameSync(tmp, file)
    try {
        fs.chmodSync(file, 0o600)
    } catch {}
    return file
}

/** Environment for one bot run: the stored `.env` plus optional per-run overrides. */
export function buildRunEnv(dataDir, overrides = {}) {
    const stored = readEnvFile(dataPaths.env(dataDir))
    const env = { ...stored }
    for (const [key, value] of Object.entries(overrides)) {
        if (value === undefined || value === null) continue
        env[key] = String(value)
    }
    return env
}

/** The bot entry point inside the vendored runtime. */
export function botEntry() {
    return path.join(RUNTIME_DIR, 'dist', 'index.js')
}

function isNodeBinary(file) {
    const base = path.basename(file).toLowerCase()
    return base === 'node' || base === 'node.exe'
}

/**
 * Find a real Node.js executable. Inside the harness `process.execPath` is the
 * Electron binary, which cannot run the bot as a plain script, so fall back to
 * PATH and the usual install locations.
 */
export function resolveNodePath(configured) {
    const candidates = []
    if (configured) candidates.push(configured)
    if (process.env.DSH_NODE_EXECUTABLE && isNodeBinary(process.env.DSH_NODE_EXECUTABLE)) {
        candidates.push(process.env.DSH_NODE_EXECUTABLE)
    }
    if (isNodeBinary(process.execPath)) candidates.push(process.execPath)
    for (const dir of String(process.env.PATH ?? '').split(path.delimiter)) {
        if (!dir) continue
        candidates.push(path.join(dir, 'node.exe'), path.join(dir, 'node'))
    }
    const programFiles = [process.env.ProgramFiles, process.env['ProgramFiles(x86)'], process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Programs')]
    for (const root of programFiles) {
        if (!root) continue
        candidates.push(path.join(root, 'nodejs', 'node.exe'), path.join(root, 'nodejs', 'node'))
    }
    for (const candidate of candidates) {
        try {
            if (fs.statSync(candidate).isFile()) return candidate
        } catch {}
    }
    return process.execPath
}

/**
 * Owns the single bot child process. Wraps the upstream ProcessManager so the
 * log parser, run state, and response shapes stay identical to the original
 * Control API.
 */
export class BotRunner {
    constructor({ dataDir, nodePath, logBufferSize = 2000, historySize = 20, stopTimeoutMs = 15000 }) {
        this.dataDir = dataDir
        this.nodePath = resolveNodePath(nodePath)
        this.manager = new ProcessManager({
            command: this.nodePath,
            args: [botEntry()],
            cwd: dataDir,
            stopTimeoutMs,
            logBufferSize,
            historySize,
            name: 'microsoft-rewards-script',
            version: '4.3.5'
        })
        this.manager.on('log', entry => this.emit('log', entry))
        this.manager.on('status', status => this.emit('status', status))
        this.manager.on('exit', exit => this.emit('exit', exit))
        this.listeners = new Map()
    }

    on(event, listener) {
        const set = this.listeners.get(event) ?? new Set()
        set.add(listener)
        this.listeners.set(event, set)
        return () => set.delete(listener)
    }

    emit(event, payload) {
        for (const listener of this.listeners.get(event) ?? []) {
            try {
                listener(payload)
            } catch {}
        }
    }

    get state() {
        return this.manager.state
    }

    get running() {
        return this.manager.state !== 'idle'
    }

    /** Start a run. `envOverrides` replaces the stored `.env` values for this run only. */
    start({ envOverrides = {}, args } = {}) {
        const env = buildRunEnv(this.dataDir, envOverrides)
        return this.manager.start({ args, env })
    }

    stop(options = {}) {
        return this.manager.stop(options)
    }

    restart(options = {}) {
        return this.manager.restart({ ...options, env: buildRunEnv(this.dataDir) })
    }

    note(level, message) {
        this.manager.note(level, message)
    }

    status() {
        return this.manager.getStatus()
    }

    points() {
        return this.manager.getPoints()
    }

    logs(options) {
        return this.manager.getLogs(options)
    }

    errors(options) {
        return this.manager.getErrors(options)
    }

    history() {
        return this.manager.getHistory()
    }
}

export default BotRunner

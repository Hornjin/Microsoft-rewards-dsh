import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

/** Root of this installed bundle (works from a linked checkout and from a packed copy). */
export const PACKAGE_DIR = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..')

/** The vendored, prebuilt Microsoft Rewards script that this plugin drives. */
export const RUNTIME_DIR = path.join(PACKAGE_DIR, 'runtime')

/** DSH home, honouring the environment the harness sets for its own processes. */
export function dshHome() {
    const fromEnv = process.env.DSH_HOME
    if (typeof fromEnv === 'string' && fromEnv.trim()) return path.resolve(fromEnv.trim())
    return path.join(os.homedir(), '.dsh')
}

/**
 * Where the bot keeps its mutable state (.env, config.json, sessions, logs, diagnostics).
 * Empty `dataDir` in the plugin config means `<DSH_HOME>/microsoft-rewards`.
 */
export function resolveDataDir(configured) {
    const raw = typeof configured === 'string' ? configured.trim() : ''
    if (!raw) return path.join(dshHome(), 'microsoft-rewards')
    if (raw === '~') return os.homedir()
    if (raw.startsWith('~/') || raw.startsWith('~\\')) return path.join(os.homedir(), raw.slice(2))
    return path.resolve(raw)
}

export function ensureDataDir(dataDir) {
    fs.mkdirSync(dataDir, { recursive: true })
    for (const sub of ['sessions', 'logs', 'diagnostics', 'config']) {
        fs.mkdirSync(path.join(dataDir, sub), { recursive: true })
    }
    return dataDir
}

export const dataPaths = {
    env: dir => path.join(dir, '.env'),
    config: dir => path.join(dir, 'config.json'),
    configExample: dir => path.join(dir, 'config.example.json'),
    schedule: dir => path.join(dir, 'config', 'schedule.json'),
    sessions: dir => path.join(dir, 'sessions'),
    sessionsDb: dir => path.join(dir, 'sessions', 'sessions.db'),
    logs: dir => path.join(dir, 'logs'),
    diagnostics: dir => path.join(dir, 'diagnostics')
}

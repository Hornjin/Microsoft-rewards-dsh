import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { loadAccounts } from '../runtime/scripts/api/accounts.js'
import { deepMerge, readConfig, writeConfigAtomic } from '../runtime/scripts/api/configEditor.js'
import { listStoredSessions, deleteStoredSessions } from '../runtime/scripts/api/sessionStore.js'
import { isValidCron } from '../runtime/scripts/api/scheduleStore.js'
import { RUNTIME_DIR, dataPaths } from './paths.js'
import { buildRunEnv, readEnvFile, writeEnvFile } from './runner.js'

const MASK = '***REDACTED***'
const SECRET_PATHS = [
    ['webhook', 'discord', 'url'],
    ['webhook', 'ntfy', 'url'],
    ['webhook', 'ntfy', 'token'],
    ['webhook', 'telegram', 'botToken'],
    ['webhook', 'telegram', 'chatId'],
    ['webhook', 'pushplus', 'token'],
    ['webhook', 'serverchan', 'sendKey'],
    ['searchSettings', 'chinaApi', 'appkey']
]

/** Same redaction the original Control API applies to `GET /config`. */
export function redactSecrets(config) {
    if (!config || typeof config !== 'object') return config
    const clone = structuredClone(config)
    for (const keys of SECRET_PATHS) {
        let cursor = clone
        for (let i = 0; i < keys.length - 1; i++) {
            cursor = cursor?.[keys[i]]
            if (!cursor || typeof cursor !== 'object') break
        }
        const leaf = keys[keys.length - 1]
        if (cursor && typeof cursor === 'object' && cursor[leaf]) cursor[leaf] = MASK
    }
    return clone
}

/** Validate against the bot's own zod schema, exactly like the original API. */
export async function validateConfig(cfg) {
    const validatorPath = path.join(RUNTIME_DIR, 'dist', 'util', 'Validator.js')
    try {
        const mod = await import(pathToFileURL(validatorPath).href)
        const m = mod.default && !mod.validateConfig ? mod.default : mod
        if (m.ConfigSchema && typeof m.ConfigSchema.parse === 'function') {
            const value = m.ConfigSchema.parse(cfg)
            return { ok: true, value: value ?? cfg, via: 'bot-ConfigSchema' }
        }
        if (typeof m.validateConfig === 'function') {
            return { ok: true, value: m.validateConfig(cfg) ?? cfg, via: 'bot-validateConfig' }
        }
        return { ok: false, errors: ['validator module exposes neither ConfigSchema nor validateConfig'], via: 'bot-validator-load' }
    } catch (error) {
        const issues = error?.issues
        const errors = Array.isArray(issues)
            ? issues.map(i => `${(i.path || []).join('.') || '(root)'}: ${i.message}`)
            : [error instanceof Error ? error.message : String(error)]
        return { ok: false, errors, via: 'bot-ConfigSchema' }
    }
}

/** The bot's own ConfigSync helpers, used for `config/diff` and `config/sync`. */
async function configSyncModule() {
    const modPath = path.join(RUNTIME_DIR, 'dist', 'util', 'ConfigSync.js')
    if (!fs.existsSync(modPath)) return null
    return import(pathToFileURL(modPath).href)
}

export function configPath(dataDir) {
    return dataPaths.config(dataDir)
}

export function readConfigFile(dataDir) {
    const file = configPath(dataDir)
    if (!fs.existsSync(file)) {
        const example = dataPaths.configExample(dataDir)
        if (fs.existsSync(example)) {
            return { path: file, data: JSON.parse(fs.readFileSync(example, 'utf8')), missing: true }
        }
        return { path: file, data: null, missing: true }
    }
    return { path: file, data: JSON.parse(fs.readFileSync(file, 'utf8')), missing: false }
}

export function writeConfigFile(dataDir, config) {
    const target = configPath(dataDir)
    const backup = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : null
    if (backup !== null) {
        try {
            fs.writeFileSync(`${target}.bak`, backup)
        } catch {}
    }
    fs.mkdirSync(path.dirname(target), { recursive: true })
    const tmp = `${target}.${process.pid}.tmp`
    fs.writeFileSync(tmp, JSON.stringify(config, null, 2))
    fs.renameSync(tmp, target)
    return target
}

export async function diffConfigFile(dataDir) {
    const mod = await configSyncModule()
    if (!mod) return { addedKeys: [], upToDate: true, unavailable: true }
    const { data } = readConfigFile(dataDir)
    const example = mod.readJson(dataPaths.configExample(dataDir))
    const addedKeys = mod.diffKeyPaths(data ?? {}, example)
    return { addedKeys, upToDate: addedKeys.length === 0 }
}

export async function syncConfigFile(dataDir) {
    const mod = await configSyncModule()
    if (!mod) return { addedKeys: [], patched: false, unavailable: true }
    const { data } = readConfigFile(dataDir)
    const example = mod.readJson(dataPaths.configExample(dataDir))
    const { merged, addedKeys } = mod.mergeMissingDefaults(data ?? {}, example)
    if (addedKeys.length > 0) writeConfigFile(dataDir, merged)
    return { addedKeys, patched: addedKeys.length > 0 }
}

export { deepMerge, readConfig, writeConfigAtomic }

/** Accounts parsed from the stored `.env` (never from the plugin's own process.env). */
export function accountsOf(dataDir) {
    return loadAccounts(buildRunEnv(dataDir))
}

export function readAccountEnv(dataDir) {
    return readEnvFile(dataPaths.env(dataDir))
}

export function writeAccountEnv(dataDir, values) {
    return writeEnvFile(dataPaths.env(dataDir), values)
}

export function sessionsOf(dataDir, config) {
    const sessionPath = typeof config?.sessionPath === 'string' && config.sessionPath.trim() ? config.sessionPath.trim() : 'sessions'
    return listStoredSessions(dataDir, sessionPath)
}

export function deleteSessions(dataDir, config, email) {
    const sessionPath = typeof config?.sessionPath === 'string' && config.sessionPath.trim() ? config.sessionPath.trim() : 'sessions'
    return deleteStoredSessions(dataDir, sessionPath, email)
}

export function scheduleFile(dataDir) {
    return dataPaths.schedule(dataDir)
}

const DEFAULT_SCHEDULE = {
    enabled: false,
    cron: null,
    skipIfRunning: true,
    excludedAccountIndexes: [],
    updatedAt: null
}

/** Same on-disk shape as the original `config/schedule.json`, minus the crontab write. */
export function readScheduleFile(dataDir) {
    const file = scheduleFile(dataDir)
    if (!fs.existsSync(file)) return { ...DEFAULT_SCHEDULE, source: 'default' }
    let saved
    try {
        saved = JSON.parse(fs.readFileSync(file, 'utf8'))
    } catch (error) {
        const err = new Error(`schedule.json is corrupt: ${error.message}`)
        err.code = 'CORRUPT_SCHEDULE'
        throw err
    }
    const enabled = saved.enabled === undefined ? false : saved.enabled
    const cron = saved.cron == null ? null : String(saved.cron)
    if (typeof enabled !== 'boolean') {
        const err = new Error('schedule.json has a non-boolean `enabled` value.')
        err.code = 'CORRUPT_SCHEDULE'
        throw err
    }
    if (cron !== null && !isValidCron(cron)) {
        const err = new Error('schedule.json has an invalid `cron` expression.')
        err.code = 'CORRUPT_SCHEDULE'
        throw err
    }
    return {
        enabled,
        cron,
        skipIfRunning: saved.skipIfRunning === undefined ? true : Boolean(saved.skipIfRunning),
        excludedAccountIndexes: Array.isArray(saved.excludedAccountIndexes)
            ? [...new Set(saved.excludedAccountIndexes.map(Number))].sort((a, b) => a - b)
            : [],
        updatedAt: saved.updatedAt ?? null,
        source: 'file'
    }
}

export function writeScheduleFile(dataDir, patch) {
    const current = readScheduleFile(dataDir)
    const next = { ...current }
    if ('cron' in patch) {
        if (typeof patch.cron !== 'string' || !isValidCron(patch.cron)) {
            throw Object.assign(new Error('Invalid cron expression (5 fields, e.g. "0 9 * * *").'), { code: 'BAD_REQUEST' })
        }
        next.cron = patch.cron.trim()
    }
    if ('enabled' in patch) {
        if (typeof patch.enabled !== 'boolean') {
            throw Object.assign(new Error('enabled must be a boolean.'), { code: 'BAD_REQUEST' })
        }
        next.enabled = patch.enabled
    }
    if ('skipIfRunning' in patch) {
        if (typeof patch.skipIfRunning !== 'boolean') {
            throw Object.assign(new Error('skipIfRunning must be a boolean.'), { code: 'BAD_REQUEST' })
        }
        next.skipIfRunning = patch.skipIfRunning
    }
    if ('excludedAccountIndexes' in patch) {
        if (!Array.isArray(patch.excludedAccountIndexes)) {
            throw Object.assign(new Error('excludedAccountIndexes must be an array.'), { code: 'BAD_REQUEST' })
        }
        const indexes = [...new Set(patch.excludedAccountIndexes.map(Number))]
        if (indexes.some(i => !Number.isSafeInteger(i) || i < 1)) {
            throw Object.assign(new Error('excludedAccountIndexes must contain only positive integers.'), { code: 'BAD_REQUEST' })
        }
        next.excludedAccountIndexes = indexes.sort((a, b) => a - b)
    }
    if (next.enabled && !next.cron) {
        throw Object.assign(new Error('Cannot enable the schedule without a cron expression.'), { code: 'BAD_REQUEST' })
    }

    next.updatedAt = new Date().toISOString()
    delete next.source

    const file = scheduleFile(dataDir)
    fs.mkdirSync(path.dirname(file), { recursive: true })
    const tmp = `${file}.${process.pid}.tmp`
    fs.writeFileSync(tmp, JSON.stringify(next, null, 2))
    fs.renameSync(tmp, file)
    return { ...next, source: 'file' }
}

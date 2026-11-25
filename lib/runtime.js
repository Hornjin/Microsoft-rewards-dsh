import fs from 'node:fs'
import path from 'node:path'

import { RUNTIME_DIR, dataPaths, ensureDataDir } from './paths.js'
import { CronTimer } from './cron.js'
import { BotRunner, readEnvFile } from './runner.js'
import { readConfigFile, readScheduleFile, writeScheduleFile } from './store.js'

const ENV_TEMPLATE = `# Microsoft Rewards accounts, managed by the DeepSeek Harness plugin.
# Add one numbered block per account. Slots may be skipped (ACCOUNT_2 without ACCOUNT_1 is fine).
#
# ACCOUNT_1_EMAIL=you@example.com
# ACCOUNT_1_PASSWORD=
# ACCOUNT_1_TOTP_SECRET=
# ACCOUNT_1_RECOVERY_EMAIL=
# ACCOUNT_1_GEO_LOCALE=CN
# ACCOUNT_1_LANG_CODE=zh-CN
#
# Optional per-account proxy:
# ACCOUNT_1_PROXY_URL=
# ACCOUNT_1_PROXY_PORT=
# ACCOUNT_1_PROXY_USERNAME=
# ACCOUNT_1_PROXY_PASSWORD=
# ACCOUNT_1_PROXY_HTTP=false
#
# Optional fingerprint persistence:
# ACCOUNT_1_SAVE_FINGERPRINT_MOBILE=true
# ACCOUNT_1_SAVE_FINGERPRINT_DESKTOP=true
`

/**
 * Seeds the bot's working directory so the vendored script finds everything it
 * expects (`package.json` pins `getProjectRoot()` to this directory).
 */
export function seedDataDir(dataDir) {
    ensureDataDir(dataDir)
    const created = []

    const pkg = path.join(dataDir, 'package.json')
    if (!fs.existsSync(pkg)) {
        const template = path.join(RUNTIME_DIR, 'data-package.json')
        fs.copyFileSync(template, pkg)
        created.push('package.json')
    }

    const example = dataPaths.configExample(dataDir)
    if (!fs.existsSync(example)) {
        const source = path.join(RUNTIME_DIR, 'config.example.json')
        if (fs.existsSync(source)) {
            fs.copyFileSync(source, example)
            created.push('config.example.json')
        }
    }

    const config = dataPaths.config(dataDir)
    if (!fs.existsSync(config) && fs.existsSync(example)) {
        fs.copyFileSync(example, config)
        created.push('config.json')
    }

    const env = dataPaths.env(dataDir)
    if (!fs.existsSync(env)) {
        fs.writeFileSync(env, ENV_TEMPLATE, { mode: 0o600 })
        created.push('.env')
    }

    const schedule = dataPaths.schedule(dataDir)
    if (!fs.existsSync(schedule)) {
        try {
            writeScheduleFile(dataDir, {})
            created.push('config/schedule.json')
        } catch {}
    }

    return created
}

/**
 * Owns everything that outlives a single tool call: the bot child process, the
 * cron timer, and the data directory the two of them operate on.
 */
export class RewardsRuntime {
    constructor(options) {
        this.options = { ...options }
        this.dataDir = options.dataDir
        this.seeded = seedDataDir(this.dataDir)
        this.runner = this.createRunner()
        this.cron = new CronTimer(() => this.fireSchedule())
        this.lastScheduleError = null
        this.applySchedule()
    }

    createRunner() {
        return new BotRunner({
            dataDir: this.dataDir,
            nodePath: this.options.nodePath,
            logBufferSize: this.options.logBufferSize,
            historySize: this.options.historySize,
            stopTimeoutMs: this.options.stopTimeoutMs
        })
    }

    /** Point the runtime at a different data directory, stopping any running bot first. */
    async relocate(dataDir) {
        if (dataDir === this.dataDir) return false
        await this.stop({ force: true }).catch(() => {})
        this.dataDir = dataDir
        this.seeded = seedDataDir(dataDir)
        this.runner = this.createRunner()
        this.applySchedule()
        return true
    }

    applySettings(options) {
        Object.assign(this.options, options)
    }

    get config() {
        try {
            return readConfigFile(this.dataDir).data ?? {}
        } catch {
            return {}
        }
    }

    /** Read the schedule file and arm/disarm the timer to match it. */
    applySchedule() {
        let schedule
        try {
            schedule = readScheduleFile(this.dataDir)
            this.lastScheduleError = null
        } catch (error) {
            this.lastScheduleError = error instanceof Error ? error.message : String(error)
            this.cron.clear()
            return { enabled: false, cron: null, error: this.lastScheduleError }
        }
        if (schedule.enabled && schedule.cron) this.cron.schedule(schedule.cron)
        else this.cron.clear()
        return schedule
    }

    /** Cron callback: honour `skipIfRunning`, then start a run with the stored `.env`. */
    fireSchedule() {
        let schedule
        try {
            schedule = readScheduleFile(this.dataDir)
        } catch (error) {
            this.lastScheduleError = error instanceof Error ? error.message : String(error)
            return
        }
        if (!schedule.enabled || !schedule.cron) return
        if (schedule.skipIfRunning && this.runner.running) {
            this.runner.note('warn', `Scheduled run skipped: a run is already in progress.`)
            return
        }
        try {
            this.start({ excludedAccountIndexes: schedule.excludedAccountIndexes })
            this.runner.note('info', `Scheduled run started by cron "${schedule.cron}".`)
        } catch (error) {
            this.runner.note('error', `Scheduled run failed to start: ${error instanceof Error ? error.message : String(error)}`)
        }
    }

    /**
     * Start a run. `accountIndex` narrows the run to one account slot;
     * `excludedAccountIndexes` removes slots from a full run.
     */
    start({ accountIndex, excludedAccountIndexes, args, envOverrides } = {}) {
        const env = { ...(envOverrides ?? {}) }
        const stored = readEnvFile(dataPaths.env(this.dataDir))

        if (accountIndex !== undefined && accountIndex !== null) {
            const index = Number(accountIndex)
            if (!Number.isSafeInteger(index) || index < 1) {
                throw Object.assign(new Error('`accountIndex` must be a positive integer.'), { code: 'BAD_REQUEST' })
            }
            const keys = Object.keys(stored).filter(key => key.startsWith(`ACCOUNT_${index}_`))
            if (keys.length === 0 || !stored[`ACCOUNT_${index}_EMAIL`]) {
                throw Object.assign(new Error(`ACCOUNT_${index} is not configured.`), { code: 'BAD_REQUEST' })
            }
            for (const key of Object.keys(stored)) {
                if (/^ACCOUNT_\d+_/.test(key)) env[key] = ''
            }
            for (const key of keys) {
                env[`ACCOUNT_1_${key.slice(`ACCOUNT_${index}_`.length)}`] = stored[key]
            }
        }

        if (Array.isArray(excludedAccountIndexes) && excludedAccountIndexes.length > 0) {
            const indexes = excludedAccountIndexes.map(Number)
            if (indexes.some(i => !Number.isSafeInteger(i) || i < 1)) {
                throw Object.assign(new Error('`excludedAccountIndexes` must be an array of positive integers.'), {
                    code: 'BAD_REQUEST'
                })
            }
            const configured = new Set(
                Object.keys(stored)
                    .map(key => /^ACCOUNT_(\d+)_EMAIL$/.exec(key)?.[1])
                    .filter(Boolean)
                    .map(Number)
            )
            for (const index of indexes) {
                if (!configured.has(index)) {
                    throw Object.assign(new Error(`Unknown account slot(s): ${index}.`), { code: 'BAD_REQUEST' })
                }
                for (const key of Object.keys(stored)) {
                    if (key.startsWith(`ACCOUNT_${index}_`)) env[key] = ''
                }
            }
            if (indexes.length >= configured.size) {
                throw Object.assign(new Error('A scheduled run cannot exclude every configured account.'), {
                    code: 'BAD_REQUEST'
                })
            }
        }

        return this.runner.start({ envOverrides: env, args })
    }

    stop(options) {
        return this.runner.stop(options)
    }

    async restart(options = {}) {
        try {
            await this.runner.stop({ force: options.force })
        } catch {}
        return this.start({})
    }

    scheduleInfo() {
        const schedule = this.applySchedule()
        return {
            ...schedule,
            nextRunAt: this.cron.next ? this.cron.next.toISOString() : null,
            armed: this.cron.active,
            error: this.lastScheduleError ?? undefined
        }
    }

    async dispose() {
        this.cron.clear()
        try {
            await this.runner.stop({ force: true })
        } catch {}
    }
}

export default RewardsRuntime

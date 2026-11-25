import { mergeAccountStats } from '../runtime/scripts/api/accounts.js'
import { accountsOf } from './store.js'

/**
 * Accounts plus the run-history rollup the original `GET /accounts` returns.
 * Each account carries `runs`, `totalCollected`, `successStreak`, `lastRunAt`,
 * `lastCollected`, `lastSuccess`, `lastError`, `streakProtection`, `edgeBrowsing`.
 */
export function accountsWithStats(dataDir, runs = []) {
    let accounts
    try {
        accounts = accountsOf(dataDir)
    } catch (error) {
        const err = new Error(error instanceof Error ? error.message : String(error))
        err.code = 'NO_ACCOUNTS'
        throw err
    }
    return mergeAccountStats(accounts, runs)
}

/** Compact per-account view for tool output: drop internal fields, keep what a user asks for. */
export function accountsSummary(accounts) {
    return accounts.map(account => {
        const row = {
            index: account.index,
            email: account.email,
            geoLocale: account.geoLocale,
            langCode: account.langCode,
            hasTotp: account.hasTotp,
            hasRecoveryEmail: account.hasRecoveryEmail,
            manualLogin: Boolean(account.manualLogin),
            proxy: account.proxy ? account.proxy.url : null
        }
        if (account.runs !== undefined) {
            row.runs = account.runs
            row.totalCollected = account.totalCollected
            row.successStreak = account.successStreak
            row.lastRunAt = account.lastRunAt
            row.lastCollected = account.lastCollected
            row.lastSuccess = account.lastSuccess
            row.lastError = account.lastError
        }
        return row
    })
}

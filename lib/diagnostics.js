import fs from 'node:fs'
import path from 'node:path'

import { dataPaths } from './paths.js'

const NAME_RE = /^error-[A-Za-z0-9._:-]+$/
const ALLOWED_FILES = {
    'screenshot.png': 'image/png',
    'error.txt': 'text/plain; charset=utf-8',
    'dump.html': 'application/octet-stream'
}

/** Directories the bot may write `error-*` bundles into. */
function candidateDirs(dataDir, configured) {
    const dirs = []
    const raw = typeof configured === 'string' ? configured.trim() : ''
    if (raw) dirs.push(path.resolve(dataDir, raw))
    dirs.push(dataPaths.diagnostics(dataDir), path.join(dataDir, 'diagnostics'), path.join(dataDir, 'dist', 'diagnostics'))
    return [...new Set(dirs)]
}

export function listDiagnostics(dataDir, configured) {
    const dir = candidateDirs(dataDir, configured)[0]
    const entries = []
    for (const candidate of candidateDirs(dataDir, configured)) {
        if (!fs.existsSync(candidate)) continue
        for (const item of fs.readdirSync(candidate, { withFileTypes: true })) {
            if (!item.isDirectory() || !NAME_RE.test(item.name)) continue
            if (entries.some(entry => entry.name === item.name)) continue
            const bundle = path.join(candidate, item.name)
            const stat = fs.statSync(bundle)
            entries.push({
                name: item.name,
                createdAt: stat.mtime.toISOString(),
                hasScreenshot: fs.existsSync(path.join(bundle, 'screenshot.png')),
                hasHtml: fs.existsSync(path.join(bundle, 'dump.html')),
                hasError: fs.existsSync(path.join(bundle, 'error.txt'))
            })
        }
    }
    entries.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    return { dir, count: entries.length, entries }
}

export function resolveDiagnosticFile(dataDir, configured, name, file) {
    if (!NAME_RE.test(name)) {
        const err = new Error('Invalid diagnostic name.')
        err.code = 'BAD_REQUEST'
        throw err
    }
    if (!Object.hasOwn(ALLOWED_FILES, file)) {
        const err = new Error('Invalid diagnostic file.')
        err.code = 'BAD_REQUEST'
        throw err
    }
    for (const dir of candidateDirs(dataDir, configured)) {
        const target = path.join(dir, name, file)
        if (fs.existsSync(target) && fs.statSync(target).isFile()) {
            return { path: target, contentType: ALLOWED_FILES[file], name, file }
        }
    }
    return null
}

/** Summarise the newest `error-*` bundle into a compact, model-readable report. */
export function diagnosticsReport(dataDir, configured, { limit = 5, includeErrorText = true } = {}) {
    const listing = listDiagnostics(dataDir, configured)
    const items = listing.entries.slice(0, Math.max(1, limit)).map(entry => {
        const dirs = candidateDirs(dataDir, configured)
        let errorText = null
        if (includeErrorText && entry.hasError) {
            for (const dir of dirs) {
                const file = path.join(dir, entry.name, 'error.txt')
                if (!fs.existsSync(file)) continue
                try {
                    const raw = fs.readFileSync(file, 'utf8')
                    errorText = raw.length > 4000 ? `${raw.slice(0, 4000)}\n… (truncated)` : raw
                } catch {}
                break
            }
        }
        return { ...entry, errorText }
    })
    return { dir: listing.dir, count: listing.count, entries: items }
}

/**
 * Minimal five-field cron support: field validation, next-run computation, and
 * a wall-clock timer. Mirrors `runtime/scripts/api/scheduleStore.js` semantics
 * (minute hour day-of-month month day-of-week, `7` == Sunday) without needing a
 * system crontab, which does not exist on Windows.
 */

const RANGES = [
    { min: 0, max: 59 }, // minute
    { min: 0, max: 23 }, // hour
    { min: 1, max: 31 }, // day of month
    { min: 1, max: 12 }, // month
    { min: 0, max: 7 } // day of week (7 == Sunday)
]

function parseField(expr, { min, max }) {
    const values = new Set()
    if (expr === '*') {
        for (let i = min; i <= max; i++) values.add(i)
        return values
    }
    for (const part of expr.split(',')) {
        if (!/^(?:\*|\d+|\d+-\d+)(?:\/\d+)?$/.test(part)) return null
        const [range, stepRaw] = part.split('/')
        const step = stepRaw === undefined ? 1 : Number(stepRaw)
        if (!Number.isInteger(step) || step < 1) return null

        let lo
        let hi
        if (range === '*') {
            lo = min
            hi = max
        } else if (range.includes('-')) {
            const [a, b] = range.split('-')
            lo = Number(a)
            hi = Number(b)
        } else {
            lo = Number(range)
            hi = Number(range)
        }
        if (!Number.isInteger(lo) || !Number.isInteger(hi)) return null
        if (lo < min || hi > max || lo > hi) return null
        for (let i = lo; i <= hi; i += step) values.add(i)
    }
    return values
}

export function isValidCron(expr) {
    if (typeof expr !== 'string') return false
    const parts = expr.trim().split(/\s+/)
    if (parts.length !== 5) return false
    return parts.every((part, i) => parseField(part, RANGES[i]) !== null)
}

function compile(expr) {
    const parts = expr.trim().split(/\s+/)
    return {
        minutes: parseField(parts[0], RANGES[0]),
        hours: parseField(parts[1], RANGES[1]),
        days: parseField(parts[2], RANGES[2]),
        months: parseField(parts[3], RANGES[3]),
        weekdays: parseField(parts[4], RANGES[4])
    }
}

function matches(spec, date) {
    const weekday = date.getDay()
    const dayOk = spec.days.has(date.getDate())
    const weekdayOk = spec.weekdays.has(weekday) || (weekday === 0 && spec.weekdays.has(7))
    return (
        spec.minutes.has(date.getMinutes()) &&
        spec.hours.has(date.getHours()) &&
        dayOk &&
        weekdayOk &&
        spec.months.has(date.getMonth() + 1)
    )
}

/**
 * First occurrence strictly after `from` (local time), searching up to two years.
 * @returns {Date|null}
 */
export function nextRun(expr, from = new Date()) {
    if (!isValidCron(expr)) return null
    const spec = compile(expr)
    const cursor = new Date(from.getTime())
    cursor.setSeconds(0, 0)
    cursor.setMinutes(cursor.getMinutes() + 1)
    const limit = 366 * 2 * 24 * 60
    for (let i = 0; i < limit; i++) {
        if (matches(spec, cursor)) return new Date(cursor.getTime())
        cursor.setMinutes(cursor.getMinutes() + 1)
    }
    return null
}

/** A single-slot cron timer. Calling `schedule()` again replaces the pending run. */
export class CronTimer {
    constructor(onFire) {
        this.onFire = onFire
        this.timer = null
        this.expression = null
        this.next = null
    }

    schedule(expression) {
        this.clear()
        if (!expression) return null
        const target = nextRun(expression)
        if (!target) return null
        this.expression = expression
        this.next = target
        const delay = Math.max(1000, Math.min(target.getTime() - Date.now(), 2 ** 31 - 1))
        this.timer = setTimeout(() => {
            this.timer = null
            this.next = null
            try {
                this.onFire()
            } finally {
                this.schedule(this.expression)
            }
        }, delay)
        if (typeof this.timer.unref === 'function') this.timer.unref()
        return target
    }

    clear() {
        if (this.timer) clearTimeout(this.timer)
        this.timer = null
        this.next = null
    }

    get active() {
        return this.timer !== null
    }
}

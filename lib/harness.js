import { createRequire } from 'node:module'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

/**
 * Harness packages are provided by the running DSH installation, not by this
 * plugin. When the plugin is installed from the registry it sits inside the
 * profile's `node_modules`, so a plain import resolves. A linked/checked-out
 * copy lives elsewhere, so fall back to the profile and installation
 * `node_modules` directories the harness advertises in its environment.
 */
function candidateDirs() {
    const dirs = []
    const push = dir => {
        if (!dir) return
        const resolved = path.resolve(dir)
        if (!dirs.includes(resolved)) dirs.push(resolved)
    }
    const env = process.env
    push(env.DSH_PROFILE_DIR && path.join(env.DSH_PROFILE_DIR, 'node_modules'))
    push(env.DSH_PROFILE && env.DSH_HOME && path.join(env.DSH_HOME, 'profiles', env.DSH_PROFILE, 'node_modules'))
    push(env.DSH_HOME && path.join(env.DSH_HOME, 'profiles', 'node_modules'))
    push(env.DSH_HOME && path.join(env.DSH_HOME, 'node_modules'))
    push(env.DSH_INSTALL_DIR && path.join(env.DSH_INSTALL_DIR, 'node_modules'))
    return dirs
}

const cache = new Map()

async function loadFrom(specifier, dir) {
    const requireFrom = createRequire(path.join(dir, '__dsh_resolve__.js'))
    const resolved = requireFrom.resolve(specifier)
    return import(pathToFileURL(resolved).href)
}

/** Import a harness-provided package, tolerating a plugin installed outside the profile. */
export async function importHarness(specifier) {
    if (cache.has(specifier)) return cache.get(specifier)
    const attempt = async () => {
        try {
            return await import(specifier)
        } catch (error) {
            if (error?.code !== 'ERR_MODULE_NOT_FOUND' && error?.code !== 'MODULE_NOT_FOUND') throw error
        }
        for (const dir of candidateDirs()) {
            try {
                return await loadFrom(specifier, dir)
            } catch {}
        }
        throw new Error(
            `Cannot resolve the harness package "${specifier}". Install the plugin through the DSH plugin manager so it lands in the profile's node_modules.`
        )
    }
    const promise = attempt()
    cache.set(specifier, promise)
    return promise
}

export default importHarness

import {getOctokit} from '@actions/github'

/**
 * Strip keys whose value is `undefined` so they don't clobber defaults
 * during object spread (e.g. `{baseUrl: undefined}` would wipe a GHES URL).
 */
function stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  )
}

/**
 * Creates a wrapped getOctokit that inherits default options and plugins.
 * Secondary clients created via the wrapper get the same retry, logging,
 * orchestration ID, and retries count as the pre-built `github` client.
 *
 * - `request` and `retry` are deep-merged so partial overrides
 *   (e.g. `{request: {timeout: 5000}}`) don't clobber inherited values.
 * - `undefined` values in both default and user options are stripped to prevent
 *   accidental clobbering (e.g. GHES `baseUrl`, or `log: undefined` from defaults).
 * - Default plugins (retry, requestLog) are always included; duplicates are skipped.
 */
export function createConfiguredGetOctokit(
  rawGetOctokit: typeof getOctokit,
  defaultOptions: Record<string, unknown>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...defaultPlugins: any[]
): typeof getOctokit {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((token: string, options?: any, ...plugins: any[]) => {
    const cleanDefaults = stripUndefined(defaultOptions)
    const userOpts = stripUndefined(options ?? {})

    const defaultRequest =
      (cleanDefaults.request as Record<string, unknown> | undefined) ?? {}
    const userRequest = stripUndefined(
      (userOpts.request as Record<string, unknown> | undefined) ?? {}
    )

    const defaultRetry =
      (cleanDefaults.retry as Record<string, unknown> | undefined) ?? {}
    const userRetry = stripUndefined(
      (userOpts.retry as Record<string, unknown> | undefined) ?? {}
    )

    const merged = {
      ...cleanDefaults,
      ...userOpts,
      request: {...defaultRequest, ...userRequest},
      retry: {...defaultRetry, ...userRetry}
    }

    // Deduplicate: default plugins first, then user plugins that aren't already present
    const allPlugins = [...defaultPlugins]
    for (const plugin of plugins) {
      if (!allPlugins.includes(plugin)) {
        allPlugins.push(plugin)
      }
    }

    return rawGetOctokit(token, merged, ...allPlugins)
  }) as typeof getOctokit
}

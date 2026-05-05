/* eslint-disable @typescript-eslint/no-explicit-any */

import {createConfiguredGetOctokit} from '../src/create-configured-getoctokit'

describe('createConfiguredGetOctokit', () => {
  const mockRetryPlugin = jest.fn()
  const mockRequestLogPlugin = jest.fn()

  function makeMockGetOctokit() {
    return jest.fn().mockReturnValue('mock-client')
  }

  test('passes token and merged defaults to underlying getOctokit', () => {
    const raw = makeMockGetOctokit()
    const defaults = {
      userAgent: 'actions/github-script actions_orchestration_id/abc',
      retry: {enabled: true},
      request: {retries: 3}
    }

    const wrapped = createConfiguredGetOctokit(
      raw as any,
      defaults,
      mockRetryPlugin,
      mockRequestLogPlugin
    )
    wrapped('my-token' as any)

    expect(raw).toHaveBeenCalledWith(
      'my-token',
      expect.objectContaining({
        userAgent: 'actions/github-script actions_orchestration_id/abc',
        retry: {enabled: true},
        request: {retries: 3}
      }),
      mockRetryPlugin,
      mockRequestLogPlugin
    )
  })

  test('user options override top-level defaults', () => {
    const raw = makeMockGetOctokit()
    const defaults = {
      userAgent: 'default-agent',
      previews: ['v3']
    }

    const wrapped = createConfiguredGetOctokit(raw as any, defaults)
    wrapped('tok' as any, {userAgent: 'custom-agent'} as any)

    expect(raw).toHaveBeenCalledWith(
      'tok',
      expect.objectContaining({userAgent: 'custom-agent', previews: ['v3']})
    )
  })

  test('deep-merges request so partial overrides preserve retries', () => {
    const raw = makeMockGetOctokit()
    const defaults = {
      request: {retries: 3, agent: 'proxy-agent', fetch: 'proxy-fetch'}
    }

    const wrapped = createConfiguredGetOctokit(raw as any, defaults)
    wrapped('tok' as any, {request: {timeout: 5000}} as any)

    expect(raw).toHaveBeenCalledWith(
      'tok',
      expect.objectContaining({
        request: {
          retries: 3,
          agent: 'proxy-agent',
          fetch: 'proxy-fetch',
          timeout: 5000
        }
      })
    )
  })

  test('deep-merges retry so partial overrides preserve existing settings', () => {
    const raw = makeMockGetOctokit()
    const defaults = {
      retry: {enabled: true, retries: 3}
    }

    const wrapped = createConfiguredGetOctokit(raw as any, defaults)
    wrapped('tok' as any, {retry: {retries: 5}} as any)

    expect(raw).toHaveBeenCalledWith(
      'tok',
      expect.objectContaining({
        retry: {enabled: true, retries: 5}
      })
    )
  })

  test('user can override request.retries explicitly', () => {
    const raw = makeMockGetOctokit()
    const defaults = {request: {retries: 3}}

    const wrapped = createConfiguredGetOctokit(raw as any, defaults)
    wrapped('tok' as any, {request: {retries: 0}} as any)

    expect(raw).toHaveBeenCalledWith(
      'tok',
      expect.objectContaining({request: {retries: 0}})
    )
  })

  test('user plugins are appended after default plugins', () => {
    const raw = makeMockGetOctokit()
    const customPlugin = jest.fn()

    const wrapped = createConfiguredGetOctokit(
      raw as any,
      {},
      mockRetryPlugin,
      mockRequestLogPlugin
    )
    wrapped('tok' as any, {} as any, customPlugin as any)

    expect(raw).toHaveBeenCalledWith(
      'tok',
      expect.any(Object),
      mockRetryPlugin,
      mockRequestLogPlugin,
      customPlugin
    )
  })

  test('duplicate plugins are deduplicated', () => {
    const raw = makeMockGetOctokit()

    const wrapped = createConfiguredGetOctokit(
      raw as any,
      {},
      mockRetryPlugin,
      mockRequestLogPlugin
    )
    // User passes retry again — should not duplicate
    wrapped('tok' as any, {} as any, mockRetryPlugin as any)

    expect(raw).toHaveBeenCalledWith(
      'tok',
      expect.any(Object),
      mockRetryPlugin,
      mockRequestLogPlugin
    )
  })

  test('applies defaults when no user options provided', () => {
    const raw = makeMockGetOctokit()
    const defaults = {
      userAgent: 'actions/github-script',
      retry: {enabled: true},
      request: {retries: 3}
    }

    const wrapped = createConfiguredGetOctokit(
      raw as any,
      defaults,
      mockRetryPlugin
    )
    wrapped('tok' as any)

    expect(raw).toHaveBeenCalledWith(
      'tok',
      {
        userAgent: 'actions/github-script',
        retry: {enabled: true},
        request: {retries: 3}
      },
      mockRetryPlugin
    )
  })

  test('baseUrl: undefined from user does not clobber default', () => {
    const raw = makeMockGetOctokit()
    const defaults = {baseUrl: 'https://ghes.example.com/api/v3'}

    const wrapped = createConfiguredGetOctokit(raw as any, defaults)
    wrapped('tok' as any, {baseUrl: undefined} as any)

    const calledOpts = raw.mock.calls[0][1]
    expect(calledOpts.baseUrl).toBe('https://ghes.example.com/api/v3')
  })

  test('undefined values in nested request are stripped', () => {
    const raw = makeMockGetOctokit()
    const defaults = {request: {retries: 3, agent: 'proxy'}}

    const wrapped = createConfiguredGetOctokit(raw as any, defaults)
    wrapped('tok' as any, {request: {retries: undefined, timeout: 5000}} as any)

    const calledOpts = raw.mock.calls[0][1]
    expect(calledOpts.request).toEqual({
      retries: 3,
      agent: 'proxy',
      timeout: 5000
    })
  })

  test('undefined values in nested retry are stripped', () => {
    const raw = makeMockGetOctokit()
    const defaults = {retry: {enabled: true, retries: 3}}

    const wrapped = createConfiguredGetOctokit(raw as any, defaults)
    wrapped('tok' as any, {retry: {enabled: undefined, retries: 5}} as any)

    const calledOpts = raw.mock.calls[0][1]
    expect(calledOpts.retry).toEqual({enabled: true, retries: 5})
  })

  test('each call creates an independent client', () => {
    const raw = jest
      .fn()
      .mockReturnValueOnce('client-a')
      .mockReturnValueOnce('client-b')

    const wrapped = createConfiguredGetOctokit(raw as any, {})
    const a = wrapped('token-a' as any)
    const b = wrapped('token-b' as any)

    expect(a).toBe('client-a')
    expect(b).toBe('client-b')
    expect(raw).toHaveBeenCalledTimes(2)
  })

  test('does not mutate defaultOptions between calls', () => {
    const raw = makeMockGetOctokit()
    const defaults = {
      request: {retries: 3},
      retry: {enabled: true}
    }
    const originalDefaults = JSON.parse(JSON.stringify(defaults))

    const wrapped = createConfiguredGetOctokit(raw as any, defaults)
    wrapped(
      'tok' as any,
      {request: {timeout: 5000}, retry: {retries: 10}} as any
    )
    wrapped('tok' as any, {request: {timeout: 9000}} as any)

    expect(defaults).toEqual(originalDefaults)
  })

  test('undefined values in defaults are stripped (e.g. log: undefined)', () => {
    const raw = makeMockGetOctokit()
    const defaults = {
      userAgent: 'actions/github-script',
      log: undefined,
      previews: undefined,
      retry: {enabled: true}
    }

    const wrapped = createConfiguredGetOctokit(raw as any, defaults)
    wrapped('tok' as any)

    const calledOpts = raw.mock.calls[0][1]
    expect(calledOpts.userAgent).toBe('actions/github-script')
    expect(calledOpts.retry).toEqual({enabled: true})
    // undefined defaults should be stripped, not passed through
    expect('log' in calledOpts).toBe(false)
    expect('previews' in calledOpts).toBe(false)
  })

  test('falsy-but-valid values are preserved, only undefined is stripped', () => {
    const raw = makeMockGetOctokit()
    const defaults = {baseUrl: 'https://ghes.example.com/api/v3'}

    const wrapped = createConfiguredGetOctokit(raw as any, defaults)
    wrapped(
      'tok' as any,
      {
        log: null,
        retries: 0,
        debug: false,
        userAgent: ''
      } as any
    )

    const calledOpts = raw.mock.calls[0][1]
    expect(calledOpts.log).toBeNull()
    expect(calledOpts.retries).toBe(0)
    expect(calledOpts.debug).toBe(false)
    expect(calledOpts.userAgent).toBe('')
    expect(calledOpts.baseUrl).toBe('https://ghes.example.com/api/v3')
  })
})

/* eslint-disable @typescript-eslint/no-explicit-any */

import {callAsyncFunction} from '../src/async-function'

describe('callAsyncFunction', () => {
  test('calls the function with its arguments', async () => {
    const result = await callAsyncFunction({foo: 'bar'} as any, 'return foo')
    expect(result).toEqual('bar')
  })

  test('passes getOctokit through the script context', async () => {
    const getOctokit = jest.fn().mockReturnValue('secondary-client')

    const result = await callAsyncFunction(
      {getOctokit} as any,
      "return getOctokit('token')"
    )

    expect(getOctokit).toHaveBeenCalledWith('token')
    expect(result).toEqual('secondary-client')
  })

  test('getOctokit creates client independent from github', async () => {
    const github = {rest: {issues: 'primary'}}
    const getOctokit = jest.fn().mockReturnValue({rest: {issues: 'secondary'}})

    const result = await callAsyncFunction(
      {github, getOctokit} as any,
      `
        const secondary = getOctokit('other-token')
        return {
          primary: github.rest.issues,
          secondary: secondary.rest.issues,
          different: github !== secondary
        }
      `
    )

    expect(result).toEqual({
      primary: 'primary',
      secondary: 'secondary',
      different: true
    })
    expect(getOctokit).toHaveBeenCalledWith('other-token')
  })

  test('getOctokit passes options through', async () => {
    const getOctokit = jest.fn().mockReturnValue('client-with-opts')

    const result = await callAsyncFunction(
      {getOctokit} as any,
      `return getOctokit('my-token', { baseUrl: 'https://ghes.example.com/api/v3' })`
    )

    expect(getOctokit).toHaveBeenCalledWith('my-token', {
      baseUrl: 'https://ghes.example.com/api/v3'
    })
    expect(result).toEqual('client-with-opts')
  })

  test('getOctokit supports plugins', async () => {
    const getOctokit = jest.fn().mockReturnValue('client-with-plugins')

    const result = await callAsyncFunction(
      {getOctokit} as any,
      `return getOctokit('my-token', { previews: ['v3'] }, 'pluginA', 'pluginB')`
    )

    expect(getOctokit).toHaveBeenCalledWith(
      'my-token',
      {previews: ['v3']},
      'pluginA',
      'pluginB'
    )
    expect(result).toEqual('client-with-plugins')
  })

  test('multiple getOctokit calls produce independent clients', async () => {
    const getOctokit = jest
      .fn()
      .mockReturnValueOnce({id: 'client-a'})
      .mockReturnValueOnce({id: 'client-b'})

    const result = await callAsyncFunction(
      {getOctokit} as any,
      `
        const a = getOctokit('token-a')
        const b = getOctokit('token-b')
        return { a: a.id, b: b.id, different: a !== b }
      `
    )

    expect(getOctokit).toHaveBeenCalledTimes(2)
    expect(getOctokit).toHaveBeenNthCalledWith(1, 'token-a')
    expect(getOctokit).toHaveBeenNthCalledWith(2, 'token-b')
    expect(result).toEqual({a: 'client-a', b: 'client-b', different: true})
  })

  test('throws on ReferenceError', async () => {
    expect.assertions(1)

    try {
      await callAsyncFunction({} as any, 'proces')
    } catch (err) {
      expect(err).toBeInstanceOf(ReferenceError)
    }
  })

  test('can access process', async () => {
    await callAsyncFunction({} as any, 'process')
  })

  test('can access console', async () => {
    await callAsyncFunction({} as any, 'console')
  })

  test('injected names are accessible when not redeclared', async () => {
    const getOctokit = jest.fn().mockReturnValue('from-injected')

    const result = await callAsyncFunction(
      {getOctokit} as any,
      `return getOctokit('token')`
    )

    expect(result).toEqual('from-injected')
    expect(getOctokit).toHaveBeenCalledWith('token')
  })

  test('syntax errors in user code still throw', () => {
    expect(() => callAsyncFunction({} as any, 'const x = {')).toThrow(
      SyntaxError
    )
  })
})

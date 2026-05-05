/* eslint-disable @typescript-eslint/no-explicit-any */

import {callAsyncFunction} from '../src/async-function'

// Create a mock getOctokit that returns Octokit-like objects.
// Real @actions/github integration is tested in the CI workflow
// (integration.yml test-get-octokit job). Here we verify the
// script context wiring — getOctokit is passed through and
// callable from user scripts.
function mockGetOctokit(token: string, options?: any) {
  return {
    _token: token,
    _options: options,
    rest: {
      issues: {get: async () => ({data: {id: 1}})},
      pulls: {get: async () => ({data: {id: 2}})}
    },
    graphql: async () => ({}),
    request: async () => ({})
  }
}

describe('getOctokit integration via callAsyncFunction', () => {
  test('getOctokit creates a functional client in script scope', async () => {
    const result = await callAsyncFunction(
      {getOctokit: mockGetOctokit} as any,
      `
        const client = getOctokit('fake-token-for-test')
        return {
          hasRest: typeof client.rest === 'object',
          hasGraphql: typeof client.graphql === 'function',
          hasRequest: typeof client.request === 'function',
          hasIssues: typeof client.rest.issues === 'object',
          hasPulls: typeof client.rest.pulls === 'object'
        }
      `
    )

    expect(result).toEqual({
      hasRest: true,
      hasGraphql: true,
      hasRequest: true,
      hasIssues: true,
      hasPulls: true
    })
  })

  test('secondary client is independent from primary github client', async () => {
    const primary = mockGetOctokit('primary-token')

    const result = await callAsyncFunction(
      {github: primary, getOctokit: mockGetOctokit} as any,
      `
        const secondary = getOctokit('secondary-token')
        return {
          bothHaveRest: typeof github.rest === 'object' && typeof secondary.rest === 'object',
          areDistinct: github !== secondary
        }
      `
    )

    expect(result).toEqual({
      bothHaveRest: true,
      areDistinct: true
    })
  })

  test('getOctokit accepts options for GHES base URL', async () => {
    const result = await callAsyncFunction(
      {getOctokit: mockGetOctokit} as any,
      `
        const client = getOctokit('fake-token', {
          baseUrl: 'https://ghes.example.com/api/v3'
        })
        return typeof client.rest === 'object'
      `
    )

    expect(result).toBe(true)
  })

  test('multiple getOctokit calls produce independent clients with different tokens', async () => {
    const result = await callAsyncFunction(
      {getOctokit: mockGetOctokit} as any,
      `
        const clientA = getOctokit('token-a')
        const clientB = getOctokit('token-b')
        return {
          aHasRest: typeof clientA.rest === 'object',
          bHasRest: typeof clientB.rest === 'object',
          areDistinct: clientA !== clientB
        }
      `
    )

    expect(result).toEqual({
      aHasRest: true,
      bHasRest: true,
      areDistinct: true
    })
  })
})

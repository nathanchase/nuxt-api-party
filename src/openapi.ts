import { resolve } from 'pathe'
import { useNuxt } from '@nuxt/kit'
import type { OpenAPI3, OpenAPITSOptions } from 'openapi-typescript'
import type { ApiEndpoint } from './module'

export async function generateDeclarationTypes(
  endpoints: Record<string, ApiEndpoint>,
  globalOpenAPIOptions: OpenAPITSOptions,
) {
  const resolvedSchemaEntries = await Promise.all(
    Object.entries(endpoints)
      .filter(([, endpoint]) => Boolean(endpoint.schema))
      .map(async ([id, endpoint]) => {
        const types = await generateSchemaTypes({ id, endpoint, openAPITSOptions: globalOpenAPIOptions })
        return [id, types] as const
      }),
  )

  return resolvedSchemaEntries.map(
    ([id, types]) => `
declare module "#nuxt-api-party/${id}" {
${normalizeIndentation(types).trimEnd()}

  // Request and response types
  export type Response<
    T extends keyof operations,
    R extends keyof operations[T]['responses'] = 200 extends keyof operations[T]['responses'] ? 200 : never
  > = operations[T]['responses'][R] extends { content: { 'application/json': infer U } } ? U : never
  export type RequestBody<
    T extends keyof operations
  > = operations[T]['requestBody'] extends { content: { 'application/json': infer U } } ? U : never
  export type RequestQuery<
    T extends keyof operations
  > = operations[T]['parameters'] extends { query?: infer U } ? U : never
}`.trimStart(),
  ).join('\n\n').trimStart()
}

async function generateSchemaTypes(options: {
  id: string
  endpoint: ApiEndpoint
  openAPITSOptions?: OpenAPITSOptions
},
) {
  // openapi-typescript < 7 does not have named exports
  const openAPITS = await interopDefault(import('openapi-typescript'))
  const { astToString } = await import('openapi-typescript')
  const schema = await resolveSchema(options.endpoint)

  try {
    const ast = await openAPITS(schema, {
      // @ts-expect-error: openapi-typescript >= 7 dropped this option
      commentHeader: '',
      ...options.openAPITSOptions,
      ...options.endpoint.openAPITS,
    })
    if (typeof ast !== 'string') {
      // Required for openapi-typescript v7+
      return astToString!(ast)
    }
    return ast
  }
  catch (error) {
    console.error(`Failed to generate types for ${options.id}`)
    console.error(error)
    return `
export type paths = Record<string, never>
export type webhooks = Record<string, never>
export interface components {
  schemas: never
  responses: never
  parameters: never
  requestBodies: never
  headers: never
  pathItems: never
}
export type $defs = Record<string, never>
export type operations = Record<string, never>
`.trimStart()
  }
}

async function resolveSchema({ schema }: ApiEndpoint): Promise<string | URL | OpenAPI3> {
  const nuxt = useNuxt()

  if (typeof schema === 'function')
    return await schema()

  if (typeof schema === 'string' && !isValidUrl(schema))
    return new URL(resolve(nuxt.options.rootDir, schema), import.meta.url)

  return schema!
}

function isValidUrl(url: string) {
  try {
    return Boolean(new URL(url))
  }
  catch {
    return false
  }
}

async function interopDefault<T>(
  m: T | Promise<T>,
): Promise<T extends { default: infer U } ? U : T> {
  const resolved = await m
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (resolved as any).default || resolved
}

function normalizeIndentation(code: string): string {
  // Replace each cluster of four spaces with two spaces
  const replacedCode = code.replace(/^( {4})+/gm, match => '  '.repeat(match.length / 4))

  // Ensure each line starts with exactly two spaces
  const normalizedCode = replacedCode.replace(/^/gm, '  ')

  return normalizedCode
}

# Interceptors

A common question when working with APIs is how to handle the HTTP status code. This is where interceptors come in. Interceptors are functions that are called before and after the fetch request is made. They can be used to modify the request, response, or options. Nuxt uses [`ofetch`](https://github.com/unjs/ofetch) for its fetch implementation, which provides a way to [intercept requests and responses](https://github.com/unjs/ofetch?tab=readme-ov-file#%EF%B8%8F-interceptors).

**tl;dr**: To use interceptors, pass an object with the following properties to the composables:

- `onRequest({ request, options })`
- `onRequestError({ request, options, error })`
- `onResponse({ request, options, response })`
- `onResponseError({ request, options, response })`

Getting the HTTP status code is as simple as logging the response status from the `response` object in the `onResponse` interceptor.

```ts
const { data } = await useMyApiData('path', {
  onResponse(ctx) {
    const status = ctx.response.status
    console.log('The status code is:', status)
  }
})
```

::: tip
The examples below use `useMyApiData` as a placeholder for the generated composable. Replace it with the actual composable name generated by Nuxt API Party. Fetch interceptors work with both the [`$fetch`-like](/api/dollarfetch-like) and [`useFetch`-like](/api/use-fetch-like) composables.
:::

## `onRequest({ request, options })`

`onRequest` is called as soon as the given composable is called, allowing you to modify options or log the request.

```ts
const { data } = await useMyApiData('path', {
  async onRequest({ request, options }) {
    // Log the request
    console.log(request, options)

    // Add a timestamp to the search parameters
    options.query ||= {}
    options.query.t = Date.now()
  }
})
```

## `onRequestError({ request, options, error })`

`onRequestError` will be called when the fetch request fails before it is made, allowing you to log the error.

```ts
const { data } = await useMyApiData('path', {
  async onRequestError({ request, options, error }) {
    // Log the error
    console.error(error)
  }
})
```

## `onResponse({ request, options, response })`

`onResponse` will be called after the fetch request is made, allowing you to log the response or modify the data.

```ts
const { data } = await useMyApiData('path', {
  async onResponse({ request, response, options }) {
    // Log the response status code and body
    console.log(response.status, response.body)
  }
})
```

## `onResponseError({ request, options, response })`

`onResponseError` is the same as `onResponse` but will be called when the fetch request fails and `response.ok` is `false`.

```ts
const { data } = await useMyApiData('path', {
  async onResponseError({ request, response, options }) {
    // Log the response status code and body
    console.error(
      response.status,
      response.body
    )
  }
})
```
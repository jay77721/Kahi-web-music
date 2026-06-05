/**
 * Shared SWR fetcher wrapper.
 *
 * Components use this to wrap their inline async loaders so the loader
 * shape is centralized. Future cross-cutting concerns (error reporting,
 * telemetry, retries outside the ncmApi layer, etc.) can be added here
 * without touching every consumer.
 *
 * Usage:
 *   useSWR('banner', swrFetcher(async () => {
 *     const result = await ncmApi.banner(0)
 *     return (result as { banners?: BannerItem[] } | undefined)?.banners || []
 *   }))
 */
export function swrFetcher<T>(loader: () => Promise<T>): () => Promise<T> {
  return loader
}

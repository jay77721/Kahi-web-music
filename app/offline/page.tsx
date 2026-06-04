export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center text-foreground">
      <div className="max-w-md space-y-4 rounded-3xl border border-border/60 bg-card/80 p-8 shadow-2xl shadow-black/20">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-primary">
          Offline
        </p>
        <h1 className="text-3xl font-bold">KaQi Music is offline</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Your network connection is unavailable. Previously cached pages and
          assets may still work, but account and private music data are never
          served from the service worker cache.
        </p>
      </div>
    </main>
  )
}

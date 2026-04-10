import { Skeleton } from '@/components/ui/skeleton'

/* ─── Album Card Skeleton ──────────────────────────────────────────────── */

/**
 * Mirrors the real AlbumCard: rounded-xl, bg-card/70, border-border,
 * aspect-square cover, p-3.5 text area with title / artist / count.
 */
export function AlbumCardSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden bg-card/70 border border-border shadow-sm">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="p-3.5 space-y-2">
        <Skeleton className="h-3.5 w-3/4 rounded-md" />
        <Skeleton className="h-3 w-1/2 rounded-md" />
        <Skeleton className="h-2.5 w-1/4 rounded-md mt-1.5" />
      </div>
    </div>
  )
}

export function AlbumGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <AlbumCardSkeleton key={i} />
      ))}
    </div>
  )
}

/* ─── Song Row Skeleton ────────────────────────────────────────────────── */

/**
 * Mirrors the real SongRow: flex row, px-4 py-3, rounded-xl,
 * bg-muted/30, border-border/30, with index / play / info / duration / like.
 */
export function SongRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/30 border border-border/30">
      {/* Index */}
      <Skeleton className="w-5 h-3.5 rounded flex-shrink-0" />
      {/* Play button */}
      <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
      {/* Song info */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <Skeleton className="h-3.5 w-3/5 rounded-md" />
        <Skeleton className="h-3 w-2/5 rounded-md" />
      </div>
      {/* Duration */}
      <Skeleton className="w-9 h-3 rounded flex-shrink-0" />
      {/* Like */}
      <Skeleton className="w-5 h-5 rounded-full flex-shrink-0" />
    </div>
  )
}

export function SongListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-1">
      {Array.from({ length: count }).map((_, i) => (
        <SongRowSkeleton key={i} />
      ))}
    </div>
  )
}

/* ─── Album Detail Skeleton ────────────────────────────────────────────── */

/**
 * Mirrors the album detail page layout: hero with cover + metadata,
 * then a tracks section + sidebar.
 */
export function AlbumDetailSkeleton() {
  return (
    <>
      {/* Hero */}
      <div className="mb-10 flex flex-col md:flex-row gap-8 items-start md:items-end">
        {/* Cover art — matches h-48 w-48 sm:h-64 sm:w-64 rounded-2xl */}
        <Skeleton className="h-48 w-48 sm:h-64 sm:w-64 flex-shrink-0 rounded-2xl" />

        <div className="flex-1 space-y-4 w-full">
          <div className="space-y-3">
            {/* "ALBUM" label */}
            <Skeleton className="h-3 w-14 rounded" />
            {/* Title */}
            <Skeleton className="h-10 sm:h-14 w-4/5 max-w-lg rounded-lg" />
            {/* Artist */}
            <Skeleton className="h-5 w-36 rounded-md" />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-4 pt-2">
            <Skeleton className="h-12 w-40 rounded-full" />
            <Skeleton className="h-12 w-12 rounded-full" />
          </div>
        </div>
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Tracks */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between border-b border-border/10 pb-4">
            <Skeleton className="h-6 w-20 rounded" />
            <Skeleton className="h-4 w-16 rounded" />
          </div>
          <SongListSkeleton count={4} />
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <Skeleton className="h-3 w-32 rounded" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </div>
    </>
  )
}

/* ─── Library Header Skeleton ──────────────────────────────────────────── */

/**
 * Mirrors the library page header: p-6 rounded-2xl surface-glass.
 */
export function LibraryHeaderSkeleton() {
  return (
    <div className="mb-8 p-6 rounded-2xl surface-glass border border-border/50 space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-7 w-36 rounded-md" />
        <Skeleton className="h-4 w-60 rounded-md" />
      </div>
      <div className="flex flex-col sm:flex-row gap-4">
        <Skeleton className="h-9 flex-1 rounded-xl" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>
      <div className="flex gap-1 border-t border-border/10 pt-4">
        <Skeleton className="h-8 w-24 rounded-lg" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
    </div>
  )
}

/* ─── Playlist Card Skeleton ───────────────────────────────────────────── */

/**
 * Mirrors the real playlist card: surface-glass, rounded-2xl,
 * aspect-square cover placeholder + p-5 text + action buttons.
 */
export function PlaylistCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden surface-glass border border-border/40">
      {/* Cover placeholder */}
      <Skeleton className="aspect-square w-full rounded-none" />
      {/* Text & buttons */}
      <div className="p-5 space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-5 w-3/4 rounded-md" />
          <Skeleton className="h-3 w-1/3 rounded" />
        </div>
        <div className="flex gap-2 border-t border-border/10 pt-4">
          <Skeleton className="h-9 flex-1 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>
      </div>
    </div>
  )
}

export function PlaylistGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <PlaylistCardSkeleton key={i} />
      ))}
    </div>
  )
}

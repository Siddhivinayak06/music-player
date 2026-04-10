'use client'

import { useEffect, useMemo, useRef, useState, useCallback, Suspense, CSSProperties } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { trackPlay } from '@/lib/history-client'
import { ThemeToggle } from '@/components/theme-toggle'
import MagicRings from '@/components/MagicRings'
import SplashCursor from '@/components/SplashCursor'
import { useTheme } from 'next-themes'
import {
    fetchQueue,
    moveQueueItem,
    reorderQueueItems,
    removeQueueItem,
    replaceQueueFromAlbum,
    replaceQueueWithSongs,
    saveQueueAsPlaylist,
    QueueItem,
} from '@/lib/queue-client'

interface Song {
    id: string
    title: string
    artist: string
    duration: number
    audio_url: string
    album_id: string
}

interface Album {
    id: string
    title: string
    cover_image_url: string | null
}

function useDrag(
    ref: React.RefObject<HTMLDivElement | null>,
    onChange: (pct: number) => void,
) {
    const dragging = useRef(false)

    const calc = useCallback(
        (clientX: number) => {
            if (!ref.current) return
            const r = ref.current.getBoundingClientRect()
            onChange(Math.max(0, Math.min(1, (clientX - r.left) / r.width)))
        },
        [ref, onChange],
    )

    const onMouseDown = useCallback(
        (e: React.MouseEvent) => {
            dragging.current = true
            calc(e.clientX)
        },
        [calc],
    )

    const onTouchStart = useCallback(
        (e: React.TouchEvent) => {
            if (e.touches.length === 0) return
            dragging.current = true
            calc(e.touches[0].clientX)
        },
        [calc],
    )

    useEffect(() => {
        const move = (e: MouseEvent) => { if (dragging.current) calc(e.clientX) }
        const touchMove = (e: TouchEvent) => {
            if (dragging.current && e.touches.length > 0) {
                calc(e.touches[0].clientX)
            }
        }
        const up = () => { dragging.current = false }
        window.addEventListener('mousemove', move)
        window.addEventListener('touchmove', touchMove, { passive: true })
        window.addEventListener('mouseup', up)
        window.addEventListener('touchend', up)
        return () => {
            window.removeEventListener('mousemove', move)
            window.removeEventListener('touchmove', touchMove)
            window.removeEventListener('mouseup', up)
            window.removeEventListener('touchend', up)
        }
    }, [calc])

    return { onMouseDown, onTouchStart }
}

const S: Record<string, CSSProperties> = {
    page: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'stretch',
        padding: 0,
        background: `
      radial-gradient(1200px 540px at 50% -12%, color-mix(in oklab, var(--primary) 12%, transparent), transparent 70%),
      radial-gradient(900px 480px at 100% 100%, color-mix(in oklab, var(--accent) 10%, transparent), transparent 72%),
      var(--background)
    `,
        position: 'relative',
        overflowY: 'auto',
    },
    backBtn: {
        position: 'absolute' as const,
        top: 24,
        left: 24,
        width: 40,
        height: 40,
        borderRadius: '50%',
        border: '1px solid var(--border)',
        background: 'color-mix(in oklab, var(--card) 85%, transparent)',
        color: 'var(--muted-foreground)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s',
        backdropFilter: 'blur(8px)',
        zIndex: 30,
    },
    card: {
        width: '100vw',
        minHeight: '100vh',
        maxWidth: 'none',
        background: 'transparent',
        border: 'none',
        borderRadius: 0,
        padding: '4.25rem clamp(0.8rem, 2.2vw, 1.8rem) 1.2rem',
        boxShadow: 'none',
        display: 'flex',
        flexDirection: 'column',
        backdropFilter: 'none',
    },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.2rem' },
    headerLeft: { display: 'flex', alignItems: 'center', gap: 8 },
    headerText: { fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.14em', color: 'var(--primary)' },
    badge: {
        fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.1em',
        color: 'var(--muted-foreground)', border: '1px solid var(--border)',
        borderRadius: 6, padding: '4px 10px',
    },
    vinylWrap: {
        position: 'relative' as const, display: 'flex', justifyContent: 'center',
        alignItems: 'center', marginBottom: '1.5rem', height: 'clamp(240px, 42vh, 370px)',
    },
    songTitle: {
        fontSize: 'clamp(1.45rem, 2.6vw, 2rem)', fontWeight: 800, color: 'var(--foreground)',
        textAlign: 'center' as const, margin: '0 0 2px', letterSpacing: '-0.01em',
    },
    songArtist: {
        fontSize: '0.88rem', color: 'var(--muted-foreground)',
        textAlign: 'center' as const, margin: '0 0 1.05rem', fontWeight: 400,
    },
    progressRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1rem' },
    time: { fontSize: '0.7rem', color: 'var(--muted-foreground)', fontVariantNumeric: 'tabular-nums' as const, minWidth: 32 },
    trackBg: {
        flex: 1, height: 4, background: 'color-mix(in oklab, var(--muted) 65%, transparent)',
        borderRadius: 2, cursor: 'pointer', position: 'relative' as const,
    },
    trackFill: {
        height: '100%', background: 'linear-gradient(90deg,var(--primary),color-mix(in oklab, var(--primary) 60%, var(--accent)))',
        borderRadius: 2, position: 'relative' as const, pointerEvents: 'none' as const,
    },
    trackThumb: {
        position: 'absolute' as const, right: -6, top: '50%', transform: 'translateY(-50%)',
        width: 12, height: 12, borderRadius: '50%', background: '#fff',
        boxShadow: '0 0 8px color-mix(in oklab, var(--primary) 55%, transparent)',
    },
    controlsRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    volSection: { display: 'flex', alignItems: 'center', gap: 8, width: 120 },
    volTrack: {
        flex: 1, height: 3, background: 'color-mix(in oklab, var(--muted) 65%, transparent)',
        borderRadius: 2, cursor: 'pointer', position: 'relative' as const,
    },
    volFill: {
        height: '100%', background: 'linear-gradient(90deg,var(--primary),color-mix(in oklab, var(--primary) 60%, var(--accent)))',
        borderRadius: 2, position: 'relative' as const, pointerEvents: 'none' as const,
    },
    volThumb: {
        position: 'absolute' as const, right: -5, top: '50%', transform: 'translateY(-50%)',
        width: 10, height: 10, borderRadius: '50%', background: 'var(--primary)',
        boxShadow: '0 0 4px color-mix(in oklab, var(--primary) 45%, transparent)',
    },
    transport: { display: 'flex', alignItems: 'center', gap: 18 },
    skipBtn: {
        background: 'none', border: 'none', color: 'var(--muted-foreground)',
        cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center',
        justifyContent: 'center', transition: 'color 0.2s',
    },
    playBtn: {
        width: 54, height: 54, borderRadius: '50%', border: 'none',
        background: 'linear-gradient(135deg,var(--primary),color-mix(in oklab, var(--primary) 70%, var(--accent)))', color: 'var(--primary-foreground)',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 24px color-mix(in oklab, var(--primary) 45%, transparent), 0 0 0 3px color-mix(in oklab, var(--primary) 20%, transparent)',
        transition: 'transform 0.18s',
    },
    empty: { color: 'var(--muted-foreground)', textAlign: 'center' as const, padding: '4rem 0' },
    browseLink: {
        display: 'inline-block', marginTop: 12, padding: '10px 24px',
        background: 'linear-gradient(135deg,var(--primary),color-mix(in oklab, var(--primary) 70%, var(--accent)))', color: 'var(--primary-foreground)',
        borderRadius: 10, textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600,
    },
    queueWrap: {
        marginTop: '1.75rem',
        borderTop: '1px solid color-mix(in oklab, var(--border) 70%, transparent)',
        paddingTop: '0.95rem',
    },
    queueHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '0.75rem',
    },
    queueTools: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
    },
    queueTitle: {
        fontSize: '0.78rem',
        letterSpacing: '0.08em',
        color: 'var(--muted-foreground)',
        fontWeight: 600,
    },
    queueBtn: {
        fontSize: '0.68rem',
        padding: '0.35rem 0.65rem',
        color: 'var(--foreground)',
        background: 'color-mix(in oklab, var(--primary) 20%, transparent)',
        border: '1px solid color-mix(in oklab, var(--primary) 35%, transparent)',
        borderRadius: 8,
        cursor: 'pointer',
    },
    queueList: {
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        maxHeight: 'min(180px, 24vh)',
        overflowY: 'auto',
    },
    queueEmpty: {
        textAlign: 'center' as const,
        padding: '0.8rem 0.4rem',
        color: 'var(--muted-foreground)',
        fontSize: '0.78rem',
    },
    queueItem: {
        position: 'relative' as const,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        padding: '0.55rem 0.65rem',
        borderRadius: 10,
        background: 'color-mix(in oklab, var(--card) 88%, transparent)',
        border: '1px solid var(--border)',
    },
    queueItemActive: {
        background: 'color-mix(in oklab, var(--primary) 16%, transparent)',
        border: '1px solid color-mix(in oklab, var(--primary) 35%, transparent)',
    },
    queueItemDragging: {
        opacity: 0.45,
    },
    queueItemDropTarget: {
        boxShadow: 'inset 0 0 0 1px color-mix(in oklab, var(--primary) 45%, transparent)',
    },
    queueDropLine: {
        position: 'absolute' as const,
        top: -1,
        left: 8,
        right: 8,
        height: 2,
        borderRadius: 999,
        background: 'linear-gradient(90deg, color-mix(in oklab, var(--primary) 10%, transparent), color-mix(in oklab, var(--primary) 95%, transparent), color-mix(in oklab, var(--primary) 10%, transparent))',
    },
    queueMeta: {
        minWidth: 0,
        flex: 1,
        textAlign: 'left' as const,
        border: 'none',
        background: 'none',
        cursor: 'pointer',
        padding: 0,
    },
    queueSong: {
        fontSize: '0.8rem',
        color: 'var(--foreground)',
        whiteSpace: 'nowrap' as const,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    queueArtist: {
        fontSize: '0.68rem',
        color: 'var(--muted-foreground)',
        whiteSpace: 'nowrap' as const,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    queueActions: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
    },
    queueDragHandle: {
        border: '1px solid var(--border)',
        background: 'color-mix(in oklab, var(--card) 80%, transparent)',
        color: 'var(--muted-foreground)',
        borderRadius: 6,
        fontSize: '0.72rem',
        padding: '0.2rem 0.4rem',
        cursor: 'grab',
        userSelect: 'none' as const,
    },
    queueActionBtn: {
        border: '1px solid var(--border)',
        background: 'color-mix(in oklab, var(--card) 80%, transparent)',
        color: 'var(--foreground)',
        borderRadius: 6,
        fontSize: '0.7rem',
        padding: '0.2rem 0.45rem',
        cursor: 'pointer',
    },
    rateBtn: {
        border: '1px solid var(--border)',
        background: 'color-mix(in oklab, var(--card) 80%, transparent)',
        color: 'var(--foreground)',
        borderRadius: 8,
        fontSize: '0.72rem',
        padding: '0.2rem 0.45rem',
        minWidth: 40,
        textAlign: 'center' as const,
        cursor: 'pointer',
    },
    content: {
        width: '100%',
        maxWidth: 980,
        margin: '0 auto',
        padding: '0.35rem clamp(0.25rem, 1.2vw, 0.9rem) 0.85rem',
        borderRadius: 0,
        border: 'none',
        background: 'transparent',
        boxShadow: 'none',
        backdropFilter: 'none',
        maxHeight: 'none',
        overflowY: 'visible',
        position: 'relative' as const,
        zIndex: 10,
    },
}

const Ico = {
    Music: () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>),
    Vol: () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>),
    SkipB: () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="19 20 9 12 19 4 19 20" /><line x1="5" y1="19" x2="5" y2="5" /></svg>),
    SkipF: () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 4 15 12 5 20 5 4" /><line x1="19" y1="5" x2="19" y2="19" /></svg>),
    Play: () => (<svg width="26" height="26" viewBox="0 0 24 24" fill="white" stroke="none"><polygon points="6 3 20 12 6 21 6 3" /></svg>),
    Pause: () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="white" stroke="none"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>),
    Back: () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>),
}

const vinylCSS = `
@keyframes vinylSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes vinylWobble {
  0%, 100% { transform: translate3d(0, 0, 0); }
  25% { transform: translate3d(0.35px, -0.35px, 0); }
  50% { transform: translate3d(-0.25px, 0.35px, 0); }
  75% { transform: translate3d(0.2px, 0.1px, 0); }
}
@keyframes vinylSpecular {
  0% { transform: rotate(0deg); opacity: 0.55; }
  100% { transform: rotate(360deg); opacity: 0.55; }
}

.vr-platter {
  position: relative;
  width: clamp(250px, 40vh, 355px);
  height: clamp(250px, 40vh, 355px);
  border-radius: 50%;
  isolation: isolate;
  filter: drop-shadow(0 18px 26px rgba(0,0,0,0.45));
}

.vr-platter::before {
  content: '';
  position: absolute;
  inset: -24px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(162, 0, 255, 0) 42%,
    rgba(162, 0, 255, 0.32) 62%,
    rgba(106, 66, 255, 0.2) 74%,
    rgba(106, 66, 255, 0) 100%
  );
  filter: blur(7px);
    opacity: 0;
  pointer-events: none;
  z-index: 0;
}

.vr-disc {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  position: relative;
  z-index: 1;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% 50%, rgba(22,22,24,0.95) 0 14%, rgba(9,9,10,1) 15% 62%, rgba(5,5,6,1) 63% 100%);
  box-shadow:
    inset 0 0 0 1px rgba(255,255,255,0.05),
    inset 0 0 80px rgba(0,0,0,0.5),
    inset 0 10px 24px rgba(255,255,255,0.02),
    inset 0 -10px 20px rgba(0,0,0,0.45);
  transform-origin: center;
}

.vr-disc::before {
  content: '';
  position: absolute;
  inset: 4.5%;
  border-radius: 50%;
  background: repeating-radial-gradient(
    circle at 50% 50%,
    rgba(255,255,255,0.06) 0 0.45px,
    rgba(0,0,0,0) 0.45px 2px
  );
  mix-blend-mode: soft-light;
  opacity: 0.42;
}

.vr-disc::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
    background:
        radial-gradient(ellipse at 72% 26%, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.03) 24%, rgba(255,255,255,0) 54%),
        radial-gradient(ellipse at 34% 78%, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.06) 32%, rgba(0,0,0,0) 62%);
    mix-blend-mode: soft-light;
    opacity: 0.5;
    filter: blur(0.2px);
}

.vr-disc.spinning {
  animation: vinylSpin 2.25s linear infinite;
}

.vr-wobbler {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  position: relative;
}

.vr-wobbler.spinning {
  animation: vinylWobble 2.25s linear infinite;
}

.vr-specular {
  position: absolute;
  inset: 0;
  border-radius: 50%;
    background:
        radial-gradient(ellipse at 74% 24%, rgba(255,255,255,0.24) 0%, rgba(255,255,255,0.08) 18%, rgba(255,255,255,0) 44%),
        radial-gradient(ellipse at 64% 32%, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 36%);
  mix-blend-mode: screen;
    opacity: 0.52;
  pointer-events: none;
}

/* Specular highlights now inherit parent rotation to stay in sync with the image */
.vr-disc.spinning .vr-specular {
  opacity: 0.55;
}

.vr-rim {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  box-shadow: inset 0 0 0 2px rgba(255,255,255,0.03), inset 0 0 0 10px rgba(255,255,255,0.01);
  pointer-events: none;
}

.vr-lightfall {
  position: absolute;
  inset: 0;
  border-radius: 50%;
    background: radial-gradient(ellipse at 70% 18%, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.07) 24%, rgba(255,255,255,0) 56%);
  mix-blend-mode: screen;
    opacity: 0.45;
  pointer-events: none;
}

.vr-shade {
  position: absolute;
  inset: 0;
  border-radius: 50%;
    background: radial-gradient(ellipse at 28% 80%, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.11) 34%, rgba(0,0,0,0) 62%);
  mix-blend-mode: multiply;
    opacity: 0.46;
  pointer-events: none;
}

.vr-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: clamp(96px, 14vw, 116px);
  height: clamp(96px, 14vw, 116px);
  border-radius: 50%;
  overflow: hidden;
  box-shadow:
    0 0 0 1.5px rgba(255,255,255,0.22),
    0 0 0 8px rgba(0,0,0,0.28),
    inset 0 8px 18px rgba(255,255,255,0.08),
    inset 0 -10px 18px rgba(0,0,0,0.26);
}

.vr-center img { width: 100%; height: 100%; object-fit: cover; }

.vr-gradient {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg,#0ea5e9 0%,#06b6d4 18%,#a855f7 42%,#ec4899 65%,#22d3ee 84%,#10b981 100%);
  filter: saturate(1.25) brightness(0.9);
}

.vr-label-ring {
  position: absolute;
  inset: 15%;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.16);
  pointer-events: none;
}

.vr-spindle {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #dedede 0 20%, #8f8f8f 35%, #4b4b4b 100%);
  box-shadow: 0 0 0 2px rgba(20,20,20,0.75), 0 2px 4px rgba(0,0,0,0.5);
}

.vr-dust {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background-image: radial-gradient(circle, rgba(255,255,255,0.38) 0.7px, transparent 1px);
  background-size: 18px 18px;
  opacity: 0.05;
  pointer-events: none;
}

.ta-wrap{position:absolute;top:-9px;right:-29px;transform-origin:11px 11px;
  transition:transform .5s cubic-bezier(.4,0,.2,1);z-index:2}
.ta-wrap.resting{transform:rotate(-24deg)}.ta-wrap.playing{transform:rotate(-7deg)}
.ta-pivot{width:22px;height:22px;border-radius:50%;
  background:linear-gradient(135deg,#f1f1f1,#8f8f8f);box-shadow:0 2px 8px rgba(0,0,0,.45);position:relative;z-index:3}
.ta-arm{width:4px;height:154px;margin:-3px auto 0;
  background:linear-gradient(180deg,#d1d5db,#8b8f97);border-radius:2px;box-shadow:1px 2px 6px rgba(0,0,0,.35)}
.ta-head{width:14px;height:18px;margin:0 auto;
  background:linear-gradient(180deg,#8f949a,#545b63);border-radius:0 0 3px 3px;box-shadow:0 2px 5px rgba(0,0,0,.4)}
.ta-head::after{content:'';display:block;width:6px;height:4px;background:#444;border-radius:0 0 2px 2px;margin:0 auto}
`

function PlayerContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const { user } = useAuth()
    const { resolvedTheme } = useTheme()
    const songId = searchParams.get('song')

    const [song, setSong] = useState<Song | null>(null)
    const [album, setAlbum] = useState<Album | null>(null)
    const [queue, setQueue] = useState<QueueItem[]>([])
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [volume, setVolume] = useState(0.7)
    const [playbackRate, setPlaybackRate] = useState(1)
    const [loading, setLoading] = useState(true)
    const [draggedQueueItemId, setDraggedQueueItemId] = useState<string | null>(null)
    const [dropTargetQueueItemId, setDropTargetQueueItemId] = useState<string | null>(null)
    const [queueExpanded, setQueueExpanded] = useState(false)

    const audioRef = useRef<HTMLAudioElement>(null)
    const progressRef = useRef<HTMLDivElement>(null)
    const volumeRef = useRef<HTMLDivElement>(null)
    const trackedSongIdRef = useRef<string | null>(null)

    const currentQueueIndex = useMemo(() => {
        if (!songId) return -1
        return queue.findIndex((item) => item.song.id === songId)
    }, [queue, songId])

    const navigateToQueueIndex = useCallback((index: number) => {
        if (index < 0 || index >= queue.length) {
            return
        }

        const nextSongId = queue[index].song.id
        router.replace(`/player?song=${nextSongId}`)
    }, [queue, router])

    const loadQueue = useCallback(async () => {
        try {
            const queueResponse = await fetchQueue()
            setQueue(queueResponse.data)
            return queueResponse.data
        } catch {
            setQueue([])
            return [] as QueueItem[]
        }
    }, [])

    const isLightTheme = resolvedTheme === 'light'

    const attemptPlay = useCallback(() => {
        const a = audioRef.current
        if (!a || !song || !isPlaying) return
        a.play().catch((error: unknown) => {
            // If autoplay is blocked, keep UI state in sync so one click on play is enough.
            if (error instanceof DOMException && error.name === 'NotAllowedError') {
                setIsPlaying(false)
            }
        })
    }, [song, isPlaying])

    useEffect(() => {
        let cancelled = false

        const fetchData = async () => {
            setLoading(true)

            try {
                let fetchedSong: Song | null = null
                let fetchedAlbum: Album | null = null

                if (songId && supabase) {
                    const { data: s } = await supabase.from('songs').select('*').eq('id', songId).single()

                    if (s) {
                        fetchedSong = s
                        const { data: a } = await supabase.from('albums').select('*').eq('id', s.album_id).single()
                        fetchedAlbum = a ?? null
                    }
                }

                if (!cancelled) {
                    setSong(fetchedSong)
                    setAlbum(fetchedAlbum)
                }

                if (!user) {
                    return
                }

                let queueData = await loadQueue()

                if (songId && queueData.length > 0 && !queueData.some((item) => item.song.id === songId)) {
                    if (fetchedSong?.album_id) {
                        await replaceQueueFromAlbum(fetchedSong.album_id, songId)
                    } else {
                        await replaceQueueWithSongs([songId])
                    }
                    queueData = await loadQueue()
                }

                if (songId && queueData.length === 0) {
                    if (fetchedSong?.album_id) {
                        await replaceQueueFromAlbum(fetchedSong.album_id, songId)
                    } else {
                        await replaceQueueWithSongs([songId])
                    }
                    queueData = await loadQueue()
                }

                if (!songId && queueData.length > 0) {
                    router.replace(`/player?song=${queueData[0].song.id}`)
                }
            } finally {
                if (!cancelled) {
                    setLoading(false)
                }
            }
        }

        fetchData()

        return () => {
            cancelled = true
        }
    }, [songId, user, router, loadQueue])

    useEffect(() => {
        const a = audioRef.current
        if (!a) return

        if (isPlaying && song) {
            attemptPlay()
        } else {
            a.pause()
        }
    }, [isPlaying, song, attemptPlay])

    useEffect(() => {
        const a = audioRef.current
        if (!a || !song?.audio_url || !isPlaying) return

        // Force source refresh on new track and retry quickly.
        a.load()
        attemptPlay()
        const retry = window.setTimeout(() => {
            attemptPlay()
        }, 180)

        return () => window.clearTimeout(retry)
    }, [song?.audio_url, isPlaying, attemptPlay])

    useEffect(() => {
        const a = audioRef.current
        if (!a || !song || !isPlaying) return

        const delays = [0, 120, 320, 800]
        const timers = delays.map((delay) => window.setTimeout(() => {
            if (!audioRef.current || !isPlaying) return
            attemptPlay()
        }, delay))

        return () => {
            timers.forEach((timer) => window.clearTimeout(timer))
        }
    }, [songId, song, isPlaying, attemptPlay])

    useEffect(() => {
        const resumeIfBlocked = () => {
            if (audioRef.current && isPlaying && audioRef.current.paused) {
                attemptPlay()
            }
        }

        window.addEventListener('pointerdown', resumeIfBlocked, { once: true })
        window.addEventListener('keydown', resumeIfBlocked, { once: true })

        return () => {
            window.removeEventListener('pointerdown', resumeIfBlocked)
            window.removeEventListener('keydown', resumeIfBlocked)
        }
    }, [isPlaying, songId, attemptPlay])

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume
        }
    }, [volume])

    useEffect(() => {
        setCurrentTime(0)
        setDuration(0)
        setIsPlaying(true)
        trackedSongIdRef.current = null

        const a = audioRef.current
        if (a) {
            a.pause()
            a.currentTime = 0
        }
    }, [songId])

    const onProgressDrag = useCallback((pct: number) => {
        if (!audioRef.current) return
        const t = pct * duration
        audioRef.current.currentTime = t
        setCurrentTime(t)
    }, [duration])
    const progressDrag = useDrag(progressRef, onProgressDrag)

    const onVolumeDrag = useCallback((pct: number) => setVolume(pct), [])
    const volumeDrag = useDrag(volumeRef, onVolumeDrag)

    const fmt = (t: number) => {
        if (!t || !isFinite(t)) return '0:00'
        return `${Math.floor(t / 60)}:${Math.floor(t % 60).toString().padStart(2, '0')}`
    }

    const pct = duration > 0 ? (currentTime / duration) * 100 : 0

    const handleNext = useCallback(() => {
        if (currentQueueIndex >= 0 && currentQueueIndex < queue.length - 1) {
            navigateToQueueIndex(currentQueueIndex + 1)
            return
        }

        // Fallback when there is no next queue item: jump ahead in current track.
        if (audioRef.current) {
            audioRef.current.currentTime = Math.min(audioRef.current.currentTime + 10, duration || audioRef.current.currentTime)
        }
    }, [currentQueueIndex, queue.length, navigateToQueueIndex, duration])

    const handlePrev = useCallback(() => {
        // Standard player behavior: restart track if enough progress has elapsed.
        if (audioRef.current && audioRef.current.currentTime > 3) {
            audioRef.current.currentTime = 0
            setCurrentTime(0)
            return
        }

        if (currentQueueIndex > 0) {
            navigateToQueueIndex(currentQueueIndex - 1)
            return
        }

        // Fallback when there is no previous queue item: rewind in current track.
        if (audioRef.current) {
            audioRef.current.currentTime = Math.max(audioRef.current.currentTime - 10, 0)
        }
    }, [currentQueueIndex, navigateToQueueIndex])

    const handleProgressClick = (event: React.MouseEvent<HTMLDivElement>) => {
        if (!progressRef.current || !audioRef.current || duration <= 0) return
        const rect = progressRef.current.getBoundingClientRect()
        const pct = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
        const target = pct * duration
        audioRef.current.currentTime = target
        setCurrentTime(target)
    }

    const handleVolumeClick = (event: React.MouseEvent<HTMLDivElement>) => {
        if (!volumeRef.current) return
        const rect = volumeRef.current.getBoundingClientRect()
        const pct = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
        setVolume(pct)
    }

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.playbackRate = playbackRate
        }
    }, [playbackRate])

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null
            if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) {
                return
            }

            if (!song) {
                return
            }

            if (event.code === 'Space') {
                event.preventDefault()
                setIsPlaying((prev) => !prev)
                return
            }

            if (event.code === 'ArrowRight' && audioRef.current) {
                event.preventDefault()
                audioRef.current.currentTime = Math.min(audioRef.current.currentTime + 5, duration || audioRef.current.currentTime)
                return
            }

            if (event.code === 'ArrowLeft' && audioRef.current) {
                event.preventDefault()
                audioRef.current.currentTime = Math.max(audioRef.current.currentTime - 5, 0)
                return
            }

            if (event.code === 'KeyN') {
                event.preventDefault()
                handleNext()
                return
            }

            if (event.code === 'KeyP') {
                event.preventDefault()
                handlePrev()
            }
        }

        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [song, duration, handleNext, handlePrev])

    const cyclePlaybackRate = () => {
        const rates = [1, 1.25, 1.5, 2]
        const next = rates[(rates.indexOf(playbackRate) + 1) % rates.length]
        setPlaybackRate(next)
    }

    const handleQueueDragStart = (itemId: string) => {
        setDraggedQueueItemId(itemId)
        setDropTargetQueueItemId(null)
    }

    const handleQueueDragOver = (event: React.DragEvent, targetItemId: string) => {
        event.preventDefault()
        if (draggedQueueItemId && draggedQueueItemId !== targetItemId) {
            setDropTargetQueueItemId(targetItemId)
        }
    }

    const handleQueueDrop = async (targetItemId: string) => {
        if (!draggedQueueItemId || draggedQueueItemId === targetItemId) {
            setDraggedQueueItemId(null)
            setDropTargetQueueItemId(null)
            return
        }

        const sourceIdx = queue.findIndex((item) => item.id === draggedQueueItemId)
        const targetIdx = queue.findIndex((item) => item.id === targetItemId)

        if (sourceIdx === -1 || targetIdx === -1) {
            setDraggedQueueItemId(null)
            setDropTargetQueueItemId(null)
            return
        }

        const nextQueue = [...queue]
        const [moved] = nextQueue.splice(sourceIdx, 1)
        nextQueue.splice(targetIdx, 0, moved)

        setQueue(nextQueue)
        setDraggedQueueItemId(null)
        setDropTargetQueueItemId(null)

        try {
            const { data } = await reorderQueueItems(nextQueue.map((item) => item.id))
            setQueue(data)
        } catch {
            await loadQueue()
        }
    }

    const handleQueueDragEnd = () => {
        setDraggedQueueItemId(null)
        setDropTargetQueueItemId(null)
    }

    const handleMoveItem = async (itemId: string, direction: 'up' | 'down') => {
        try {
            const { data } = await moveQueueItem(itemId, direction)
            setQueue(data)
        } catch {
            await loadQueue()
        }
    }

    const handleRemove = async (itemId: string, songToRemoveId: string) => {
        try {
            const { data } = await removeQueueItem(itemId)
            setQueue(data)

            if (songToRemoveId === songId) {
                if (data.length > 0) {
                    router.replace(`/player?song=${data[0].song.id}`)
                } else {
                    setSong(null)
                    setIsPlaying(false)
                }
            }
        } catch {
            // UI remains responsive even if remove fails.
        }
    }

    const handleSaveQueue = async () => {
        const title = window.prompt('Playlist name for current queue')?.trim()
        if (!title) {
            return
        }

        try {
            const result = await saveQueueAsPlaylist(title, 'Created from Up Next queue')
            router.push(`/playlist/${result.playlistId}`)
        } catch {
            window.alert('Failed to save queue as playlist')
        }
    }

    if (loading) {
        return (<div style={S.page}><style>{vinylCSS}</style><div style={S.card}><p style={S.empty}>Loading…</p></div></div>)
    }

    return (
        <div style={S.page}>
            <style>{vinylCSS}</style>
            <SplashCursor
                BACK_COLOR={{ r: 0.0, g: 0.0, b: 0.0 }}
                TRANSPARENT={true}
                COLOR_UPDATE_SPEED={8}
                SPLAT_RADIUS={0.18}
                SPLAT_FORCE={4600}
                MIN_POINTER_DELTA={0.0045}
                START_DELAY={700}
            />

            <button
                style={S.backBtn}
                onClick={() => router.back()}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'color-mix(in oklab, var(--card) 85%, transparent)'; e.currentTarget.style.color = 'var(--muted-foreground)' }}
            >
                <Ico.Back />
            </button>

            <div className="absolute top-6 right-6 z-30">
                <ThemeToggle />
            </div>

            <audio
                ref={audioRef}
                src={song?.audio_url}
                preload="auto"
                autoPlay
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onTimeUpdate={() => {
                    if (!audioRef.current) return

                    const nextTime = audioRef.current.currentTime
                    setCurrentTime(nextTime)

                    if (songId && nextTime >= 10 && trackedSongIdRef.current !== songId) {
                        trackedSongIdRef.current = songId
                        trackPlay(songId).catch(() => {
                            trackedSongIdRef.current = null
                        })
                    }
                }}
                onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)}
                onLoadedData={() => {
                    attemptPlay()
                }}
                onCanPlay={() => {
                    attemptPlay()
                }}
                onCanPlayThrough={() => {
                    attemptPlay()
                }}
                onEnded={handleNext}
            />

            <div style={S.card}>
                <main style={S.content}>
                    <div style={S.header}>
                        <div style={S.headerLeft}><Ico.Music /><span style={S.headerText}>NOW PLAYING</span></div>
                        <div style={S.badge}>HIGH FIDELITY</div>
                    </div>

                    {!song ? (
                        <div style={S.empty}>
                            <p>No song selected</p>
                            <Link href="/library" style={S.browseLink}>Browse Music</Link>
                        </div>
                    ) : (
                        <>
                            <section style={S.vinylWrap}>
                                <div
                                    aria-hidden="true"
                                    style={{
                                        position: 'absolute',
                                        left: '50%',
                                        top: '50%',
                                        width: 'clamp(620px, 86vw, 900px)',
                                        height: 'clamp(320px, 46vh, 470px)',
                                        transform: 'translate(-50%, -50%)',
                                        pointerEvents: 'none',
                                        zIndex: 0,
                                    }}
                                >
                                    <div
                                        style={{
                                            position: 'absolute',
                                            left: '-7%',
                                            top: '50%',
                                            width: '44%',
                                            height: '58%',
                                            transform: 'translateY(-50%)',
                                            borderRadius: 999,
                                           
                                            opacity: isPlaying ? 0.82 : 0.46,
                                        }}
                                    />
                                    <div
                                        style={{
                                            position: 'absolute',
                                            right: '-7%',
                                            top: '50%',
                                            width: '44%',
                                            height: '58%',
                                            transform: 'translateY(-50%)',
                                            borderRadius: 999,
                                            
                                            filter: 'blur(14px)',
                                            opacity: isPlaying ? 0.78 : 0.42,
                                        }}
                                    />
                                </div>

                                <div
                                    aria-hidden="true"
                                    style={{
                                        position: 'absolute',
                                        width: 'clamp(560px, 80vw, 840px)',
                                        height: 'clamp(300px, 42vh, 430px)',
                                        opacity: isLightTheme ? (isPlaying ? 0.86 : 0.5) : (isPlaying ? 0.92 : 0.56),
                                        pointerEvents: 'none',
                                        borderRadius: 999,
                                        overflow: 'visible',
                                        zIndex: 1,
                                        mixBlendMode: 'screen',
                                        filter: isLightTheme ? 'saturate(1.56) contrast(1.08) brightness(1.08)' : 'saturate(1.42) contrast(1.05) brightness(1.05)',
                                        WebkitMaskImage: 'radial-gradient(circle, rgba(0,0,0,0) 0 40%, rgba(0,0,0,0.94) 49%, rgba(0,0,0,0.92) 63%, rgba(0,0,0,0.48) 76%, rgba(0,0,0,0.08) 88%, rgba(0,0,0,0) 100%)',
                                        maskImage: 'radial-gradient(circle, rgba(0,0,0,0) 0 40%, rgba(0,0,0,0.94) 49%, rgba(0,0,0,0.92) 63%, rgba(0,0,0,0.48) 76%, rgba(0,0,0,0.08) 88%, rgba(0,0,0,0) 100%)',
                                    }}
                                >
                                    <MagicRings
                                        color="#fc42ff"
                                        colorTwo="#42fcff"
                                        ringCount={5}
                                        speed={0.78}
                                        attenuation={30}
                                        lineThickness={1}
                                        baseRadius={0.52}
                                        radiusStep={0.11}
                                        scaleRate={0.078}
                                        opacity={1.06}
                                        blur={0}
                                        noiseAmount={0.03}
                                        rotation={0}
                                        ringGap={1.38}
                                        fadeIn={0.7}
                                        fadeOut={0.6}
                                        followMouse={false}
                                        mouseInfluence={0.2}
                                        hoverScale={1.06}
                                        parallax={0.02}
                                        clickBurst={false}
                                    />
                                </div>

                                <div className="vr-platter">
                                    <div className={`vr-wobbler ${isPlaying ? 'spinning' : ''}`}>
                                        <div className={`vr-disc ${isPlaying ? 'spinning' : ''}`}>
                                            <div className="vr-lightfall" />
                                            <div className="vr-shade" />
                                            <div className="vr-dust" />
                                            <div className="vr-specular" />
                                            <div className="vr-rim" />
                                            <div className="vr-center">
                                                {album?.cover_image_url
                                                    ? <img src={album.cover_image_url} alt="" />
                                                    : <div className="vr-gradient" />}
                                                <div className="vr-label-ring" />
                                                <div className="vr-spindle" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`ta-wrap ${isPlaying ? 'playing' : 'resting'}`}>
                                        <div className="ta-pivot" /><div className="ta-arm" /><div className="ta-head" />
                                    </div>
                                </div>
                            </section>

                            <h1 style={S.songTitle}>{song.title}</h1>
                            <p style={S.songArtist}>{song.artist}</p>

                            <div style={S.progressRow}>
                                <span style={S.time}>{fmt(currentTime)}</span>
                                <div
                                    style={S.trackBg}
                                    ref={progressRef}
                                    onClick={handleProgressClick}
                                    onMouseDown={progressDrag.onMouseDown}
                                    onTouchStart={progressDrag.onTouchStart}
                                    aria-label="Seek"
                                >
                                    <div style={{ ...S.trackFill, width: `${pct}%` }}>
                                        <div style={S.trackThumb} />
                                    </div>
                                </div>
                                <span style={{ ...S.time, textAlign: 'right' }}>{fmt(duration)}</span>
                            </div>

                            <div style={S.controlsRow}>
                                <div style={S.volSection}>
                                    <Ico.Vol />
                                    <div
                                        style={S.volTrack}
                                        ref={volumeRef}
                                        onClick={handleVolumeClick}
                                        onMouseDown={volumeDrag.onMouseDown}
                                        onTouchStart={volumeDrag.onTouchStart}
                                        aria-label="Volume"
                                    >
                                        <div style={{ ...S.volFill, width: `${volume * 100}%` }}>
                                            <div style={S.volThumb} />
                                        </div>
                                    </div>
                                </div>
                                <div style={S.transport}>
                                    <button
                                        style={S.skipBtn}
                                        onClick={handlePrev}
                                        aria-label="Previous track"
                                        title="Previous track (P)"
                                    >
                                        <Ico.SkipB />
                                    </button>
                                    <button
                                        style={S.playBtn}
                                        onClick={() => setIsPlaying(!isPlaying)}
                                        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.07)')}
                                        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                                        aria-label={isPlaying ? 'Pause' : 'Play'}
                                        title="Play or pause (Space)"
                                    >
                                        {isPlaying ? <Ico.Pause /> : <Ico.Play />}
                                    </button>
                                    <button
                                        style={S.skipBtn}
                                        onClick={handleNext}
                                        aria-label="Next track"
                                        title="Next track (N)"
                                    >
                                        <Ico.SkipF />
                                    </button>
                                    <button
                                        style={S.rateBtn}
                                        onClick={cyclePlaybackRate}
                                        aria-label="Playback speed"
                                        title="Playback speed"
                                    >
                                        {playbackRate}x
                                    </button>
                                </div>
                            </div>

                            <section style={S.queueWrap}>
                                <div style={S.queueHeader}>
                                    <span style={S.queueTitle}>UP NEXT ({queue.length})</span>
                                    <div style={S.queueTools}>
                                        <button
                                            style={S.queueBtn}
                                            onClick={() => setQueueExpanded((prev) => !prev)}
                                            aria-label="Toggle queue"
                                        >
                                            {queueExpanded ? 'Hide' : 'Show'}
                                        </button>
                                        <button style={S.queueBtn} onClick={handleSaveQueue} disabled={queue.length === 0}>
                                            Save Queue
                                        </button>
                                    </div>
                                </div>
                                {queueExpanded && <div style={S.queueList}>
                                    {queue.length === 0 && (
                                        <div style={S.queueEmpty}>Queue is empty</div>
                                    )}
                                    {queue.map((item, idx) => (
                                        <div
                                            key={item.id}
                                            draggable
                                            onDragStart={() => handleQueueDragStart(item.id)}
                                            onDragOver={(event) => handleQueueDragOver(event, item.id)}
                                            onDrop={() => handleQueueDrop(item.id)}
                                            onDragEnd={handleQueueDragEnd}
                                            style={{
                                                ...S.queueItem,
                                                ...(item.song.id === songId ? S.queueItemActive : {}),
                                                ...(draggedQueueItemId === item.id ? S.queueItemDragging : {}),
                                                ...(dropTargetQueueItemId === item.id ? S.queueItemDropTarget : {}),
                                            }}
                                        >
                                            {dropTargetQueueItemId === item.id && <div style={S.queueDropLine} />}
                                            <button
                                                style={S.queueMeta}
                                                onClick={() => router.replace(`/player?song=${item.song.id}`)}
                                                title="Play this song"
                                            >
                                                <div style={S.queueSong}>{item.song.title}</div>
                                                <div style={S.queueArtist}>{item.song.artist}</div>
                                            </button>
                                            <div style={S.queueActions}>
                                                <span style={S.queueDragHandle}>Drag</span>
                                                <button
                                                    style={S.queueActionBtn}
                                                    onClick={() => handleMoveItem(item.id, 'up')}
                                                    disabled={idx === 0}
                                                    aria-label={`Move ${item.song.title} up`}
                                                >
                                                    ↑
                                                </button>
                                                <button
                                                    style={S.queueActionBtn}
                                                    onClick={() => handleMoveItem(item.id, 'down')}
                                                    disabled={idx === queue.length - 1}
                                                    aria-label={`Move ${item.song.title} down`}
                                                >
                                                    ↓
                                                </button>
                                                <button
                                                    style={S.queueActionBtn}
                                                    onClick={() => handleRemove(item.id, item.song.id)}
                                                    aria-label={`Remove ${item.song.title} from queue`}
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>}
                            </section>
                        </>
                    )}
                </main>
            </div>
        </div>
    )
}

export default function PlayerPage() {
    return (
        <Suspense fallback={<div style={S.page}><div style={S.card}><p style={S.empty}>Loading player…</p></div></div>}>
            <PlayerContent />
        </Suspense>
    )
}

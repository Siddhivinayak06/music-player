'use client'

import { useEffect, useState, useRef, useCallback, Suspense, CSSProperties } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'

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

/* ─── reusable drag hook ─── */
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

  const onDown = useCallback(
    (e: React.MouseEvent) => {
      dragging.current = true
      calc(e.clientX)
    },
    [calc],
  )

  useEffect(() => {
    const move = (e: MouseEvent) => { if (dragging.current) calc(e.clientX) }
    const up = () => { dragging.current = false }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up) }
  }, [calc])

  return onDown
}

/* ─── inline CSS ─── */
const S: Record<string, CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1.5rem',
    background: 'linear-gradient(135deg, #0a0a14 0%, #111122 50%, #0d0d1a 100%)',
    position: 'relative',
  },
  backBtn: {
    position: 'absolute' as const,
    top: 24,
    left: 24,
    width: 40,
    height: 40,
    borderRadius: '50%',
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.04)',
    color: 'rgba(255,255,255,0.6)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    backdropFilter: 'blur(8px)',
    zIndex: 10,
  },
  card: {
    width: '100%',
    maxWidth: 500,
    background: 'linear-gradient(150deg, rgba(20,20,35,0.97), rgba(14,14,24,0.99))',
    borderRadius: 24,
    padding: '2rem 2.25rem 2.25rem',
    boxShadow:
      '0 8px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.05)',
  },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 8 },
  headerText: { fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.14em', color: '#a855f7' },
  badge: {
    fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.1em',
    color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 6, padding: '4px 10px',
  },
  vinylWrap: {
    position: 'relative' as const, display: 'flex', justifyContent: 'center',
    alignItems: 'center', marginBottom: '2rem', height: 280,
  },
  songTitle: {
    fontSize: '1.65rem', fontWeight: 700, color: '#fff',
    textAlign: 'center' as const, margin: '0 0 4px', letterSpacing: '-0.01em',
  },
  songArtist: {
    fontSize: '0.88rem', color: 'rgba(255,255,255,0.4)',
    textAlign: 'center' as const, margin: '0 0 1.75rem', fontWeight: 400,
  },
  progressRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.75rem' },
  time: { fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', fontVariantNumeric: 'tabular-nums' as const, minWidth: 32 },
  trackBg: {
    flex: 1, height: 4, background: 'rgba(255,255,255,0.08)',
    borderRadius: 2, cursor: 'pointer', position: 'relative' as const,
  },
  trackFill: {
    height: '100%', background: 'linear-gradient(90deg,#a855f7,#c084fc)',
    borderRadius: 2, position: 'relative' as const, pointerEvents: 'none' as const,
  },
  trackThumb: {
    position: 'absolute' as const, right: -6, top: '50%', transform: 'translateY(-50%)',
    width: 12, height: 12, borderRadius: '50%', background: '#fff',
    boxShadow: '0 0 8px rgba(168,85,247,0.55)',
  },
  controlsRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  volSection: { display: 'flex', alignItems: 'center', gap: 8, width: 120 },
  volTrack: {
    flex: 1, height: 3, background: 'rgba(255,255,255,0.08)',
    borderRadius: 2, cursor: 'pointer', position: 'relative' as const,
  },
  volFill: {
    height: '100%', background: 'linear-gradient(90deg,#a855f7,#c084fc)',
    borderRadius: 2, position: 'relative' as const, pointerEvents: 'none' as const,
  },
  volThumb: {
    position: 'absolute' as const, right: -5, top: '50%', transform: 'translateY(-50%)',
    width: 10, height: 10, borderRadius: '50%', background: '#c084fc',
    boxShadow: '0 0 4px rgba(168,85,247,0.45)',
  },
  transport: { display: 'flex', alignItems: 'center', gap: 18 },
  skipBtn: {
    background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
    cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center',
    justifyContent: 'center', transition: 'color 0.2s',
  },
  playBtn: {
    width: 54, height: 54, borderRadius: '50%', border: 'none',
    background: 'linear-gradient(135deg,#a855f7,#9333ea)', color: '#fff',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 24px rgba(168,85,247,0.45), 0 0 0 3px rgba(168,85,247,0.15)',
    transition: 'transform 0.18s',
  },
  empty: { color: 'rgba(255,255,255,0.35)', textAlign: 'center' as const, padding: '4rem 0' },
  browseLink: {
    display: 'inline-block', marginTop: 12, padding: '10px 24px',
    background: 'linear-gradient(135deg,#a855f7,#9333ea)', color: '#fff',
    borderRadius: 10, textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600,
  },
}

/* ─── tiny SVG icons ─── */
const Ico = {
  Music: () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>),
  Vol: () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>),
  SkipB: () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="19 20 9 12 19 4 19 20" /><line x1="5" y1="19" x2="5" y2="5" /></svg>),
  SkipF: () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 4 15 12 5 20 5 4" /><line x1="19" y1="5" x2="19" y2="19" /></svg>),
  Play: () => (<svg width="26" height="26" viewBox="0 0 24 24" fill="white" stroke="none"><polygon points="6 3 20 12 6 21 6 3" /></svg>),
  Pause: () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="white" stroke="none"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>),
  Back: () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>),
}

/* ─── Vinyl CSS (needs keyframe, embedded via <style>) ─── */
const vinylCSS = `
@keyframes vinylSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
.vr-disc{width:250px;height:250px;border-radius:50%;position:relative;
  background:radial-gradient(circle,#111 0%,#090909 18%,#121212 19%,#080808 36%,
  #0f0f0f 37%,#070707 54%,#0d0d0d 55%,#060606 72%,#0b0b0b 73%,#050505 90%,#080808 100%);
  box-shadow:0 8px 40px rgba(0,0,0,0.7),0 0 0 3px rgba(50,50,50,0.25),inset 0 0 30px rgba(0,0,0,0.25);}
.vr-disc.spinning{animation:vinylSpin 2.8s linear infinite}
.vr-center{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
  width:86px;height:86px;border-radius:50%;overflow:hidden;
  box-shadow:0 0 12px rgba(0,0,0,0.5),0 0 0 2px rgba(80,80,80,0.25)}
.vr-center img{width:100%;height:100%;object-fit:cover}
.vr-gradient{width:100%;height:100%;
  background:linear-gradient(135deg,#0ea5e9 0%,#06b6d4 15%,#a855f7 35%,#ec4899 55%,#22d3ee 75%,#10b981 100%);
  filter:saturate(1.5) brightness(0.85)}
.vr-spindle{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
  width:8px;height:8px;border-radius:50%;background:#0a0a0a;box-shadow:0 0 0 2px rgba(100,100,100,0.4)}
.vr-groove{position:absolute;border-radius:50%;border:1px solid rgba(255,255,255,0.025);
  top:50%;left:50%;transform:translate(-50%,-50%)}
.ta-wrap{position:absolute;top:10px;right:60px;transform-origin:11px 11px;
  transition:transform .5s cubic-bezier(.4,0,.2,1);z-index:2}
.ta-wrap.resting{transform:rotate(-30deg)}.ta-wrap.playing{transform:rotate(-8deg)}
.ta-pivot{width:22px;height:22px;border-radius:50%;
  background:linear-gradient(135deg,#ddd,#888);box-shadow:0 2px 8px rgba(0,0,0,.45);position:relative;z-index:3}
.ta-arm{width:4px;height:130px;margin:-3px auto 0;
  background:linear-gradient(180deg,#ccc,#999);border-radius:2px;box-shadow:1px 2px 6px rgba(0,0,0,.35)}
.ta-head{width:14px;height:18px;margin:0 auto;
  background:linear-gradient(180deg,#888,#555);border-radius:0 0 3px 3px;box-shadow:0 2px 5px rgba(0,0,0,.4)}
.ta-head::after{content:'';display:block;width:6px;height:4px;background:#444;border-radius:0 0 2px 2px;margin:0 auto}
`

/* ─── PlayerContent ─── */
function PlayerContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()
  const songId = searchParams.get('song')

  const [song, setSong] = useState<Song | null>(null)
  const [album, setAlbum] = useState<Album | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.7)
  const [loading, setLoading] = useState(true)

  const audioRef = useRef<HTMLAudioElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const volumeRef = useRef<HTMLDivElement>(null)

  /* fetch */
  useEffect(() => {
    const fetch = async () => {
      if (!songId) { setLoading(false); return }
      try {
        const { data: s } = await supabase!.from('songs').select('*').eq('id', songId).single()
        if (s) {
          setSong(s)
          const { data: a } = await supabase!.from('albums').select('*').eq('id', s.album_id).single()
          if (a) setAlbum(a)
        }
      } finally { setLoading(false) }
    }
    if (supabase) fetch(); else setLoading(false)
  }, [songId, user])

  /* play/pause */
  useEffect(() => {
    const a = audioRef.current; if (!a) return
    if (isPlaying && song) a.play().catch(() => setIsPlaying(false)); else a.pause()
  }, [isPlaying, song])

  /* volume sync */
  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume }, [volume])

  /* draggable progress */
  const onProgressDrag = useCallback((pct: number) => {
    if (!audioRef.current) return
    const t = pct * duration
    audioRef.current.currentTime = t
    setCurrentTime(t)
  }, [duration])
  const onProgressDown = useDrag(progressRef, onProgressDrag)

  /* draggable volume */
  const onVolumeDrag = useCallback((pct: number) => setVolume(pct), [])
  const onVolumeDown = useDrag(volumeRef, onVolumeDrag)

  const fmt = (t: number) => {
    if (!t || !isFinite(t)) return '0:00'
    return `${Math.floor(t / 60)}:${Math.floor(t % 60).toString().padStart(2, '0')}`
  }

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0

  if (loading) {
    return (<div style={S.page}><style>{vinylCSS}</style><div style={S.card}><p style={S.empty}>Loading…</p></div></div>)
  }

  return (
    <div style={S.page}>
      <style>{vinylCSS}</style>

      {/* Back button */}
      <button
        style={S.backBtn}
        onClick={() => router.back()}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)' }}
      >
        <Ico.Back />
      </button>

      <audio
        ref={audioRef}
        src={song?.audio_url}
        onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
        onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)}
      />

      <div style={S.card}>
        {/* header */}
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
            {/* vinyl + tonearm */}
            <div style={S.vinylWrap}>
              <div className={`vr-disc ${isPlaying ? 'spinning' : ''}`}>
                <div className="vr-groove" style={{ width: '92%', height: '92%' }} />
                <div className="vr-groove" style={{ width: '78%', height: '78%' }} />
                <div className="vr-groove" style={{ width: '64%', height: '64%' }} />
                <div className="vr-groove" style={{ width: '50%', height: '50%' }} />
                <div className="vr-center">
                  {album?.cover_image_url
                    ? <img src={album.cover_image_url} alt="" />
                    : <div className="vr-gradient" />}
                  <div className="vr-spindle" />
                </div>
              </div>
              <div className={`ta-wrap ${isPlaying ? 'playing' : 'resting'}`}>
                <div className="ta-pivot" /><div className="ta-arm" /><div className="ta-head" />
              </div>
            </div>

            {/* song info */}
            <h1 style={S.songTitle}>{song.title}</h1>
            <p style={S.songArtist}>{song.artist}</p>

            {/* progress */}
            <div style={S.progressRow}>
              <span style={S.time}>{fmt(currentTime)}</span>
              <div style={S.trackBg} ref={progressRef} onMouseDown={onProgressDown}>
                <div style={{ ...S.trackFill, width: `${pct}%` }}>
                  <div style={S.trackThumb} />
                </div>
              </div>
              <span style={{ ...S.time, textAlign: 'right' }}>{fmt(duration)}</span>
            </div>

            {/* controls */}
            <div style={S.controlsRow}>
              <div style={S.volSection}>
                <Ico.Vol />
                <div style={S.volTrack} ref={volumeRef} onMouseDown={onVolumeDown}>
                  <div style={{ ...S.volFill, width: `${volume * 100}%` }}>
                    <div style={S.volThumb} />
                  </div>
                </div>
              </div>
              <div style={S.transport}>
                <button style={S.skipBtn}><Ico.SkipB /></button>
                <button
                  style={S.playBtn}
                  onClick={() => setIsPlaying(!isPlaying)}
                  onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.07)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  {isPlaying ? <Ico.Pause /> : <Ico.Play />}
                </button>
                <button style={S.skipBtn}><Ico.SkipF /></button>
              </div>
            </div>
          </>
        )}
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

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { AlbumCard } from '@/components/album-card'
import { Music, Search, ArrowLeft, Upload } from 'lucide-react'

interface Album {
  id: string
  title: string
  artist: string
  cover_image_url: string | null
  user_id: string
  song_count?: number
}

export default function LibraryPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [allAlbums, setAllAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all')

  useEffect(() => {
    const fetchData = async () => {
      if (!supabase) { setLoading(false); return }
      try {
        const { data: albums } = await supabase
          .from('albums')
          .select('*, songs(id)')

        if (albums) {
          setAllAlbums(albums.map((a: any) => ({
            ...a,
            song_count: a.songs?.length || 0,
            songs: undefined
          })))
        }
      } finally { setLoading(false) }
    }
    fetchData()
  }, [user])

  const displayed = allAlbums
    .filter(a => activeTab === 'all' || a.user_id === user?.id)
    .filter(a =>
      a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.artist.toLowerCase().includes(searchTerm.toLowerCase())
    )

  return (
    <div className="min-h-screen"
      style={{ background: 'linear-gradient(180deg, #0a0a14 0%, #0d0d1a 100%)' }}>

      {/* Header */}
      <header className="sticky top-0 z-10"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(10,10,20,0.85)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center gap-3">
          <button onClick={() => router.push('/')}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
            style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)' }}>
            <ArrowLeft size={16} />
          </button>
          <h1 className="text-lg font-bold text-white flex-1">Your Library</h1>
          <Link href="/library/upload">
            <button className="px-3.5 py-2 rounded-lg text-xs font-medium flex items-center gap-2"
              style={{ background: 'linear-gradient(135deg, #a855f7, #9333ea)', color: '#fff', boxShadow: '0 2px 10px rgba(168,85,247,0.25)' }}>
              <Upload size={13} /> Upload
            </button>
          </Link>
        </div>
      </header>

      {/* Search + Tabs */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(15,15,28,0.4)' }}>
        <div className="max-w-6xl mx-auto px-5 py-4 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.2)' }} />
            <input
              type="text"
              placeholder="Search albums or artists..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white placeholder:text-white/20 outline-none transition-all"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
              onFocus={e => (e.currentTarget.style.borderColor = 'rgba(168,85,247,0.3)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)')}
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-1">
            {(['all', 'my'] as const).map(tab => (
              <button key={tab}
                className="px-4 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: activeTab === tab ? 'rgba(168,85,247,0.15)' : 'transparent',
                  color: activeTab === tab ? '#c084fc' : 'rgba(255,255,255,0.35)',
                  border: activeTab === tab ? '1px solid rgba(168,85,247,0.2)' : '1px solid transparent',
                }}
                onClick={() => setActiveTab(tab)}>
                {tab === 'all' ? 'All Albums' : 'My Albums'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-5 py-8">
        {loading ? (
          <p className="text-center py-16" style={{ color: 'rgba(255,255,255,0.35)' }}>Loading albums...</p>
        ) : displayed.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ background: 'rgba(168,85,247,0.08)' }}>
              <Music className="h-7 w-7" style={{ color: 'rgba(168,85,247,0.35)' }} />
            </div>
            <p className="mb-4" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {activeTab === 'my' ? "You haven't uploaded any albums yet" : 'No albums found'}
            </p>
            {activeTab === 'my' && (
              <Link href="/library/upload">
                <button className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg, #a855f7, #9333ea)' }}>
                  Upload Your First Album
                </button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {displayed.map(album => (
              <AlbumCard
                key={album.id}
                id={album.id}
                title={album.title}
                artist={album.artist}
                coverImage={album.cover_image_url || undefined}
                songCount={album.song_count || 0}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

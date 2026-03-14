'use client'

import Image from 'next/image'

interface VinylRecordProps {
  coverImage?: string | null
  isPlaying: boolean
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'h-32 w-32',
  md: 'h-48 w-48',
  lg: 'h-64 w-64',
}

export function VinylRecord({ coverImage, isPlaying, size = 'md' }: VinylRecordProps) {
  const sizeClass = sizeClasses[size]

  return (
    <div className={`relative flex items-center justify-center ${sizeClass}`}>
      <style>{`
        @keyframes vr-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes vr-wobble {
          0%,100% { transform: translate3d(0,0,0); }
          25% { transform: translate3d(0.25px,-0.3px,0); }
          50% { transform: translate3d(-0.25px,0.2px,0); }
          75% { transform: translate3d(0.1px,0.2px,0); }
        }
      `}</style>

      <div
        className={`absolute inset-0 rounded-full shadow-2xl overflow-hidden ${
          isPlaying ? 'animate-spin' : ''
        }`}
        style={{
          animationDuration: '2.2s',
          animationTimingFunction: 'linear',
          animationIterationCount: 'infinite',
          background:
            'radial-gradient(circle at 50% 50%, rgba(20,20,22,0.96) 0 14%, rgba(8,8,9,1) 15% 60%, rgba(4,4,5,1) 61% 100%)',
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05), inset 0 0 60px rgba(0,0,0,0.5), 0 10px 28px rgba(0,0,0,0.55)',
        }}
      >
        <div
          className="absolute inset-[4%] rounded-full"
          style={{
            background:
              'repeating-radial-gradient(circle at 50% 50%, rgba(255,255,255,0.055) 0 0.42px, rgba(0,0,0,0) 0.42px 2px)',
            mixBlendMode: 'soft-light',
            opacity: 0.42,
          }}
        />

        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              'conic-gradient(from 25deg, rgba(255,255,255,0.16), rgba(255,255,255,0.02) 15%, rgba(0,0,0,0) 50%, rgba(255,255,255,0.08) 72%, rgba(0,0,0,0) 100%)',
            mixBlendMode: 'screen',
            opacity: 0.48,
          }}
        />

        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.03), inset 0 0 0 10px rgba(255,255,255,0.01)',
          }}
        />

        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.38) 0.7px, transparent 1px)',
            backgroundSize: '18px 18px',
            opacity: 0.05,
          }}
        />

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-[35%] h-[35%] rounded-full overflow-hidden"
            style={{
              boxShadow:
                '0 0 0 1.5px rgba(255,255,255,0.22), 0 0 0 8px rgba(0,0,0,0.28), inset 0 8px 18px rgba(255,255,255,0.08), inset 0 -10px 18px rgba(0,0,0,0.26)',
            }}>
            {coverImage ? (
              <Image
                src={coverImage}
                alt="Album cover"
                fill
                className="object-cover"
              />
            ) : (
              <div
                className="w-full h-full"
                style={{
                  background: 'linear-gradient(135deg,#0ea5e9 0%,#06b6d4 18%,#a855f7 42%,#ec4899 65%,#22d3ee 84%,#10b981 100%)',
                }}
              />
            )}
            <div className="absolute inset-[15%] rounded-full border border-white/15" />
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[10px] h-[10px] rounded-full"
              style={{
                background: 'radial-gradient(circle at 35% 35%, #dedede 0 20%, #8f8f8f 35%, #4b4b4b 100%)',
                boxShadow: '0 0 0 2px rgba(20,20,20,0.75), 0 2px 4px rgba(0,0,0,0.5)',
              }}
            />
          </div>
        </div>
      </div>

      <div className="absolute -top-4 right-8 w-1 h-16 bg-gray-400 origin-top pointer-events-none transform -rotate-45">
        <div className="absolute top-0 right-0 w-2 h-2 bg-gray-600 rounded-full"></div>
      </div>
    </div>
  )
}

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
      {/* Vinyl record background */}
      <div
        className={`absolute inset-0 rounded-full bg-black/90 shadow-2xl ${
          isPlaying ? 'animate-spin' : ''
        }`}
        style={{
          animationDuration: '3s',
          animationDirection: 'reverse',
        }}
      >
        {/* Vinyl grooves */}
        <div className="absolute inset-0 rounded-full opacity-30">
          <svg className="w-full h-full" viewBox="0 0 100 100">
            <defs>
              <pattern id="grooves" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
                <circle cx="50" cy="50" r="10" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
                <circle cx="50" cy="50" r="20" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
                <circle cx="50" cy="50" r="30" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#grooves)" />
          </svg>
        </div>

        {/* Center label area */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-24 h-24 rounded-full bg-primary/30 flex items-center justify-center shadow-inner">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/50 shadow-md flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-primary/80"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Cover image overlay */}
      {coverImage && (
        <div
          className={`absolute inset-0 rounded-full overflow-hidden ${
            isPlaying ? 'animate-spin' : ''
          }`}
          style={{
            animationDuration: '3s',
            animationDirection: 'reverse',
          }}
        >
          <Image
            src={coverImage}
            alt="Album cover"
            fill
            className="object-cover opacity-20"
          />
        </div>
      )}

      {/* Needle */}
      <div className="absolute -top-4 right-8 w-1 h-16 bg-gray-400 origin-top pointer-events-none transform -rotate-45">
        <div className="absolute top-0 right-0 w-2 h-2 bg-gray-600 rounded-full"></div>
      </div>
    </div>
  )
}

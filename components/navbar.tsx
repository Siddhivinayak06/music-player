'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import {
  Music,
  Library,
  Upload,
  LogOut,
  Search,
  Plus,
  Home,
  User as UserIcon,
  ChevronDown
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function Navbar() {
  const { user, signOut } = useAuth()
  const pathname = usePathname()

  const isActive = (path: string) => pathname === path || pathname?.startsWith(path + '/')

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/70 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          
          {/* Left: Logo & Core Nav */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-90">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shadow-sm">
                <Music className="h-5 w-5" />
              </div>
              <span className="text-xl font-bold tracking-tight">Vinyl</span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              <Link href="/" className={`
                px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${pathname === '/' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}
              `}>
                <div className="flex items-center gap-2">
                  <Home size={16} />
                  Home
                </div>
              </Link>
              <Link href="/library" className={`
                px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${isActive('/library') ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}
              `}>
                <div className="flex items-center gap-2">
                  <Library size={16} />
                  Library
                </div>
              </Link>
            </nav>
          </div>

          {/* Center: Search */}
          <div className="hidden sm:flex flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search songs, albums..."
              className="w-full pl-10 pr-4 py-2 rounded-full text-sm bg-muted/40 border border-transparent transition-all focus:bg-background focus:border-primary/30 outline-none"
            />
          </div>

          {/* Right: Actions & Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:block">
               <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 border-primary/20 hover:border-primary/40 hover:bg-primary/5">
                    <Plus size={16} />
                    Create
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 surface-glass">
                  <Link href="/library/upload">
                    <DropdownMenuItem className="cursor-pointer gap-2 focus:bg-primary/10">
                      <Upload size={14} /> Upload Album
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuItem className="cursor-pointer gap-2 focus:bg-primary/10">
                    <Plus size={14} /> New Playlist
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <ThemeToggle />

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 p-1 rounded-full transition-colors hover:bg-muted/60">
                    <div className="h-8 w-8 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-xs ring-1 ring-primary/20">
                      {user.email?.charAt(0).toUpperCase()}
                    </div>
                    <ChevronDown size={14} className="text-muted-foreground hidden sm:block" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 surface-glass">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.user_metadata.username || 'User'}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <Link href="/library">
                    <DropdownMenuItem className="cursor-pointer gap-2">
                      <Library size={14} /> Your Library
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuItem className="cursor-pointer gap-2">
                    <UserIcon size={14} /> Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="cursor-pointer gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                    onClick={() => signOut()}
                  >
                    <LogOut size={14} /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/auth/login">
                  <Button variant="ghost" size="sm">Sign In</Button>
                </Link>
                <Link href="/auth/signup">
                  <Button size="sm">Sign Up</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

import { Navbar } from "@/components/navbar"
import { AuthGuard } from "@/components/auth-guard"

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
      <div className="relative flex min-h-screen flex-col bg-background selection:bg-primary selection:text-primary-foreground">
        {/* Background Gradients for the whole app context */}
        <div className="fixed inset-0 -z-10 pointer-events-none">
          <div className="absolute top-0 left-1/4 h-[500px] w-1/2 bg-primary/5 blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 h-[500px] w-1/2 bg-accent/5 blur-[120px]" />
        </div>

        <Navbar />
        
        <main className="flex-1">
          {/* Consistent max-width for all main content */}
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
            {children}
          </div>
        </main>

        {/* Persistent mini-player placeholder - Future feature */}
        <div className="sticky bottom-4 mx-auto w-full max-xl px-4 z-50 pointer-events-none">
          {/* Future Floating Player component could go here */}
        </div>
      </div>
    </AuthGuard>
  )
}

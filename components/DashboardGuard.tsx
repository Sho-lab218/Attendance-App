'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function DashboardGuard({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [hasUser, setHasUser] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkUser = async () => {
      try {
        // First check session (more reliable right after sign-in)
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          setHasUser(true)
          setLoading(false)
          return
        }
        
        // If no session, try getUser
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          setHasUser(true)
          setLoading(false)
          return
        }
        
        // Wait a moment and check again (cookies might be setting)
        await new Promise(resolve => setTimeout(resolve, 500))
        
        const { data: { session: retrySession } } = await supabase.auth.getSession()
        if (retrySession?.user) {
          setHasUser(true)
          setLoading(false)
          return
        }
        
        const { data: { user: retryUser } } = await supabase.auth.getUser()
        if (retryUser) {
          setHasUser(true)
          setLoading(false)
          return
        }
        
        // Still no user after retry
        router.push('/login')
      } catch (error) {
        console.error('DashboardGuard: Error checking user:', error)
        router.push('/login')
      }
    }

    checkUser()
  }, [supabase, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-800 mb-2">Loading...</div>
          <div className="text-sm text-gray-700">Verifying your session</div>
        </div>
      </div>
    )
  }

  if (!hasUser) {
    return null // Will redirect
  }

  return <>{children}</>
}


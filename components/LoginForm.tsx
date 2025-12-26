'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (loading) return // Prevent double submission
    
    setLoading(true)
    setError(null)

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
          },
        })
        if (error) throw error
        alert('Check your email to confirm your account!')
      } else {
        console.log('Attempting to sign in...')
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        
        console.log('Sign in response:', { data, error })
        
        if (error) {
          console.error('Sign in error:', error)
          // Provide more helpful error messages
          if (error.message.includes('Email not confirmed') || error.message.includes('email_not_confirmed')) {
            throw new Error('Please verify your email address before signing in. Check your inbox for the confirmation email.')
          }
          if (error.message.includes('Invalid login credentials')) {
            throw new Error('Invalid email or password. Please check your credentials and try again.')
          }
          throw error
        }
        
        // Verify the session is established
        if (data.user && data.session) {
          console.log('Sign in successful, user:', data.user.id)
          console.log('Session token:', data.session.access_token ? 'present' : 'missing')
          
          // Wait for cookies to be written - longer delay to ensure server can read them
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          // Double-check the session is still there
          const { data: { session: checkSession } } = await supabase.auth.getSession()
          if (!checkSession) {
            throw new Error('Session was lost. Please try signing in again.')
          }
          
          console.log('Session verified, performing hard redirect to dashboard...')
          
          // Check if cookies are actually set
          const cookies = document.cookie
          console.log('Cookies present:', cookies.length > 0 ? 'yes' : 'no')
          console.log('Cookie count:', cookies.split(';').length)
          
          // Check for Supabase auth cookies specifically
          const hasAuthCookie = cookies.includes('sb-') || cookies.includes('supabase')
          console.log('Auth cookies present:', hasAuthCookie)
          
          // Force a small additional delay to ensure cookies are fully set
          await new Promise(resolve => setTimeout(resolve, 500))
          
          // Final session check
          const { data: { session: finalSession } } = await supabase.auth.getSession()
          if (!finalSession) {
            console.error('Session lost before redirect!')
            throw new Error('Session was lost. Please try signing in again.')
          }
          
          console.log('Final session check passed, redirecting...')
          // Redirect with a query parameter to help middleware recognize the session
          // The middleware will handle removing this parameter
          window.location.replace('/dashboard?just_signed_in=true')
          
          // Don't execute anything after this - we're redirecting
          return
        } else if (data.user && !data.session) {
          throw new Error('Email not confirmed. Please check your email and click the confirmation link, then try signing in again.')
        } else {
          throw new Error('Sign in failed. Please try again.')
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          {error}
        </div>
      )}
      
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete={isSignUp ? "email" : "email"}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={isSignUp ? "new-password" : "current-password"}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
      </button>

      <div className="text-center">
        <button
          type="button"
          onClick={() => setIsSignUp(!isSignUp)}
          className="text-sm text-indigo-600 hover:text-indigo-800"
        >
          {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
        </button>
      </div>
    </form>
  )
}


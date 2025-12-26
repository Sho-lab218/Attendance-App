import { createClient } from '@/utils/supabase/server'
import Navbar from '@/components/Navbar'
import ClassesList from '@/components/ClassesList'
import DashboardGuard from '@/components/DashboardGuard'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If no user on server, let client-side guard handle it
  // (cookies might not be available yet after sign-in)
  const userId = user?.id || ''

  return (
    <DashboardGuard>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-2 text-gray-800">Manage your classes and track attendance</p>
          </div>
          <ClassesList userId={userId} />
        </main>
      </div>
    </DashboardGuard>
  )
}


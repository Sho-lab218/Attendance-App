import { createClient } from '@/utils/supabase/server'
import Navbar from '@/components/Navbar'
import ClassDetail from '@/components/ClassDetail'
import DashboardGuard from '@/components/DashboardGuard'

export default async function ClassPage({
  params,
}: {
  params: { classId: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If no user on server, let client-side guard handle it
  const userId = user?.id || ''
  
  // Try to get class data if user exists
  let classData = null
  if (user) {
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('id', params.classId)
      .eq('owner_id', user.id)
      .single()
    
    if (!error && data) {
      classData = data
    }
  }

  return (
    <DashboardGuard>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ClassDetail classId={params.classId} classData={classData} userId={userId} />
        </main>
      </div>
    </DashboardGuard>
  )
}


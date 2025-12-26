import { createClient } from '@/utils/supabase/server'
import Navbar from '@/components/Navbar'
import AttendancePage from '@/components/AttendancePage'
import DashboardGuard from '@/components/DashboardGuard'

export default async function SessionAttendancePage({
  params,
}: {
  params: { classId: string; sessionId: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If no user on server, let client-side guard handle it
  const userId = user?.id || ''
  
  // Try to get class and session data if user exists
  let classData = null
  let sessionData = null
  
  if (user) {
    const { data: classDataResult, error: classError } = await supabase
      .from('classes')
      .select('*')
      .eq('id', params.classId)
      .eq('owner_id', user.id)
      .single()
    
    if (!classError && classDataResult) {
      classData = classDataResult
      
      // Get session data
      const { data: sessionDataResult, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', params.sessionId)
        .eq('class_id', params.classId)
        .single()
      
      if (!sessionError && sessionDataResult) {
        sessionData = sessionDataResult
      }
    }
  }

  return (
    <DashboardGuard>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <AttendancePage
            classId={params.classId}
            sessionId={params.sessionId}
            sessionData={sessionData}
            classData={classData}
          />
        </main>
      </div>
    </DashboardGuard>
  )
}


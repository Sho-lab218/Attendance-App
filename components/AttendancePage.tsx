'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Student {
  id: string
  name: string
  email: string
}

interface AttendanceRecord {
  id: string
  session_id: string
  user_id: string
  status: 'present' | 'absent'
}

interface AttendancePageProps {
  classId: string
  sessionId: string
  sessionData: {
    id: string
    date: string
  } | null
  classData: {
    id: string
    name: string
    term: string
  } | null
}

export default function AttendancePage({
  classId,
  sessionId,
  sessionData: serverSessionData,
  classData: serverClassData,
}: AttendancePageProps) {
  const [students, setStudents] = useState<Student[]>([])
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [classData, setClassData] = useState(serverClassData)
  const [sessionData, setSessionData] = useState(serverSessionData)
  const supabase = createClient()
  const router = useRouter()

  // Fetch classData and sessionData if not provided
  useEffect(() => {
    const fetchPageData = async () => {
      if (classData && sessionData) {
        return // Already have data
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Fetch class data if needed
      if (!classData) {
        const { data, error } = await supabase
          .from('classes')
          .select('*')
          .eq('id', classId)
          .eq('owner_id', user.id)
          .single()
        
        if (error || !data) {
          router.push('/dashboard')
          return
        }
        setClassData(data)
      }

      // Fetch session data if needed
      if (!sessionData && classData) {
        const { data, error } = await supabase
          .from('sessions')
          .select('*')
          .eq('id', sessionId)
          .eq('class_id', classId)
          .single()
        
        if (error || !data) {
          router.push(`/classes/${classId}`)
          return
        }
        setSessionData(data)
      }
    }

    fetchPageData()
  }, [classId, sessionId, classData, sessionData, supabase, router])

  const fetchData = useCallback(async () => {
    try {
      setError(null)
      // Fetch students for this class
      const { data: studentsData, error: studentsError } = await supabase
        .from('class_students')
        .select('*')
        .eq('class_id', classId)
        .order('name', { ascending: true })

      if (studentsError) throw studentsError
      setStudents(studentsData || [])

      // Fetch attendance records for this session
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('*')
        .eq('session_id', sessionId)

      if (attendanceError) throw attendanceError

      // Convert to map for easy lookup
      const attendanceMap: Record<string, AttendanceRecord> = {}
      attendanceData?.forEach((record) => {
        attendanceMap[record.user_id] = record
      })
      setAttendance(attendanceMap)
    } catch (error: any) {
      console.error('Error fetching data:', error.message)
      setError('Failed to load attendance data. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [classId, sessionId, supabase])

  useEffect(() => {
    if (classData && sessionData) {
      fetchData()
    }
  }, [classData, sessionData, fetchData])

  const handleAttendanceChange = async (studentId: string, status: 'present' | 'absent') => {
    try {
      setError(null)
      const existingRecord = attendance[studentId]

      if (existingRecord) {
        // Update existing record
        const { error } = await supabase
          .from('attendance')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', existingRecord.id)

        if (error) throw error
      } else {
        // Create new record
        const { error } = await supabase
          .from('attendance')
          .insert([
            {
              session_id: sessionId,
              user_id: studentId,
              status,
            },
          ])

        if (error) throw error
      }

      // Refresh data
      fetchData()
    } catch (error: any) {
      console.error('Error updating attendance:', error.message)
      setError('Failed to update attendance: ' + error.message)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const presentCount = Object.values(attendance).filter((a) => a.status === 'present').length
  const absentCount = Object.values(attendance).filter((a) => a.status === 'absent').length
  const totalCount = students.length
  const attendancePercentage =
    totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0

  if (loading || !classData || !sessionData) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-800">Loading attendance...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <Link
          href={`/classes/${classId}`}
          className="text-indigo-600 hover:text-indigo-800 text-sm font-medium mb-4 inline-block"
        >
          ← Back to Class
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">{classData.name}</h1>
        <p className="mt-2 text-gray-800">
          Session: {formatDate(sessionData.date)}
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-800 mb-1">Total Students</p>
          <p className="text-3xl font-bold text-gray-900">{totalCount}</p>
        </div>
        <div className="bg-green-50 rounded-lg shadow p-6 border border-green-200">
          <p className="text-sm text-green-700 mb-1">Present</p>
          <p className="text-3xl font-bold text-green-700">{presentCount}</p>
        </div>
        <div className="bg-red-50 rounded-lg shadow p-6 border border-red-200">
          <p className="text-sm text-red-700 mb-1">Absent</p>
          <p className="text-3xl font-bold text-red-700">{absentCount}</p>
        </div>
        <div className="bg-indigo-50 rounded-lg shadow p-6 border border-indigo-200">
          <p className="text-sm text-indigo-700 mb-1">Attendance Rate</p>
          <p className="text-3xl font-bold text-indigo-700">{attendancePercentage}%</p>
        </div>
      </div>

      {/* Attendance List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Mark Attendance</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {students.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No students yet</h3>
              <p className="text-gray-800 mb-4">Add students to this class before marking attendance.</p>
              <Link
                href={`/classes/${classId}`}
                className="inline-block text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Add students →
              </Link>
            </div>
          ) : (
            students.map((student) => {
              const currentStatus = attendance[student.id]?.status
              return (
                <div
                  key={student.id}
                  className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <p className="font-medium text-gray-900">{student.name}</p>
                    <p className="text-sm text-gray-800">{student.email}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleAttendanceChange(student.id, 'present')}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        currentStatus === 'present'
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-green-100 hover:text-green-700'
                      }`}
                    >
                      Present
                    </button>
                    <button
                      onClick={() => handleAttendanceChange(student.id, 'absent')}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        currentStatus === 'absent'
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-red-100 hover:text-red-700'
                      }`}
                    >
                      Absent
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}


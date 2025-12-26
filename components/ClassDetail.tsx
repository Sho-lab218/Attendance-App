'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import AddSessionModal from './AddSessionModal'
import AddStudentModal from './AddStudentModal'

interface Session {
  id: string
  class_id: string
  date: string
  created_at: string
}

interface Student {
  id: string
  class_id: string
  name: string
  email: string
  created_at: string
}

interface ClassDetailProps {
  classId: string
  classData: {
    id: string
    name: string
    term: string
  } | null
  userId: string
}

export default function ClassDetail({ classId, classData: serverClassData, userId: serverUserId }: ClassDetailProps) {
  const [classData, setClassData] = useState(serverClassData)
  const [userId, setUserId] = useState(serverUserId)
  const [sessions, setSessions] = useState<Session[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSessionModal, setShowSessionModal] = useState(false)
  const [showStudentModal, setShowStudentModal] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Get userId and classData from client if not provided
  useEffect(() => {
    const fetchData = async () => {
      // If we already have classData, don't fetch again
      if (classData) {
        return
      }
      
      console.log('ClassDetail: Fetching data, classData:', classData ? 'exists' : 'null', 'userId:', userId || 'none')
      
      let currentUserId = userId
      
      if (!currentUserId) {
        console.log('ClassDetail: Getting user from client...')
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          currentUserId = user.id
          setUserId(user.id)
          console.log('ClassDetail: User found:', user.id)
        } else {
          console.log('ClassDetail: No user found')
          setLoading(false)
          return
        }
      }
      
      if (!classData && currentUserId) {
        console.log('ClassDetail: Fetching class data for classId:', classId)
        const { data, error } = await supabase
          .from('classes')
          .select('*')
          .eq('id', classId)
          .eq('owner_id', currentUserId)
          .single()
        
        if (error) {
          console.error('ClassDetail: Error fetching class:', error)
          setLoading(false)
          router.push('/dashboard')
          return
        }
        
        if (!data) {
          console.error('ClassDetail: No class data found')
          setLoading(false)
          router.push('/dashboard')
          return
        }
        
        console.log('ClassDetail: Class data fetched:', data.name)
        setClassData(data)
      }
    }
    fetchData()
  }, [classId, classData, userId, supabase, router])

  const fetchSessions = async () => {
    try {
      setError(null)
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('class_id', classId)
        .order('date', { ascending: false })

      if (error) throw error
      setSessions(data || [])
    } catch (error: any) {
      console.error('Error fetching sessions:', error.message)
      setError('Failed to load sessions. Please try again.')
    }
  }

  const fetchStudents = async () => {
    try {
      setError(null)
      const { data, error } = await supabase
        .from('class_students')
        .select('*')
        .eq('class_id', classId)
        .order('name', { ascending: true })

      if (error) throw error
      setStudents(data || [])
    } catch (error: any) {
      console.error('Error fetching students:', error.message)
      setError('Failed to load students. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteSession = async (sessionId: string, sessionDate: string) => {
    if (!confirm(`Are you sure you want to delete the session on ${formatDate(sessionDate)}? This will also delete all attendance records for this session.`)) {
      return
    }

    try {
      setError(null)
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId)

      if (error) throw error
      fetchSessions()
    } catch (error: any) {
      console.error('Error deleting session:', error.message)
      setError('Failed to delete session. Please try again.')
    }
  }

  const handleRemoveStudent = async (studentId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to remove "${studentName}" from this class? This will also delete all their attendance records.`)) {
      return
    }

    try {
      setError(null)
      const { error } = await supabase
        .from('class_students')
        .delete()
        .eq('id', studentId)

      if (error) throw error
      fetchStudents()
    } catch (error: any) {
      console.error('Error removing student:', error.message)
      setError('Failed to remove student. Please try again.')
    }
  }

  useEffect(() => {
    if (classData) {
      setLoading(true)
      fetchSessions()
      fetchStudents()
    } else {
      // If no classData yet, keep loading
      setLoading(true)
    }
  }, [classId, classData])

  const handleSessionAdded = () => {
    fetchSessions()
    setShowSessionModal(false)
  }

  const handleStudentAdded = () => {
    fetchStudents()
    setShowStudentModal(false)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (loading || !classData) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-800">Loading...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="text-indigo-600 hover:text-indigo-800 text-sm font-medium mb-4 inline-block"
        >
          ← Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">{classData.name}</h1>
        <p className="mt-2 text-gray-800">Term: {classData.term}</p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sessions Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Sessions</h2>
            <button
              onClick={() => setShowSessionModal(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              Add Session
            </button>
          </div>

          {sessions.length === 0 ? (
            <div className="text-center py-8">
              <svg className="mx-auto h-10 w-10 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">No sessions yet</h3>
              <p className="text-gray-800 text-sm mb-4">Create a session to start tracking attendance.</p>
              <button
                onClick={() => setShowSessionModal(true)}
                className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
              >
                Create your first session →
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="group relative p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                >
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleDeleteSession(session.id, session.date)
                    }}
                    className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-800 p-1.5 rounded hover:bg-red-50"
                    title="Delete session"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  <Link
                    href={`/classes/${classId}/sessions/${session.id}`}
                    className="block pl-8"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-900">{formatDate(session.date)}</p>
                      </div>
                      <span className="text-indigo-600 text-sm font-medium">View →</span>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Students Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Students</h2>
            <button
              onClick={() => setShowStudentModal(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              Add Student
            </button>
          </div>

          {students.length === 0 ? (
            <div className="text-center py-8">
              <svg className="mx-auto h-10 w-10 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">No students yet</h3>
              <p className="text-gray-800 text-sm mb-4">Add students to track their attendance.</p>
              <button
                onClick={() => setShowStudentModal(true)}
                className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
              >
                Add your first student →
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {students.map((student) => (
                <div
                  key={student.id}
                  className="group relative p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <p className="font-medium text-gray-900">{student.name}</p>
                  <p className="text-sm text-gray-800">{student.email}</p>
                  <button
                    onClick={() => handleRemoveStudent(student.id, student.name)}
                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-800 p-1.5 rounded hover:bg-red-50"
                    title="Remove student"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showSessionModal && (
        <AddSessionModal
          classId={classId}
          onClose={() => setShowSessionModal(false)}
          onSuccess={handleSessionAdded}
        />
      )}

      {showStudentModal && (
        <AddStudentModal
          classId={classId}
          onClose={() => setShowStudentModal(false)}
          onSuccess={handleStudentAdded}
        />
      )}
    </div>
  )
}


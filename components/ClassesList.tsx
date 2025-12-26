'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import AddClassModal from './AddClassModal'

interface Class {
  id: string
  name: string
  term: string
  created_at: string
}

interface ClassesListProps {
  userId?: string
}

export default function ClassesList({ userId: serverUserId }: ClassesListProps) {
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string>(serverUserId || '')
  const supabase = createClient()

  // Get userId from client if not provided
  useEffect(() => {
    if (!userId && !serverUserId) {
      const getUser = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setUserId(user.id)
        }
      }
      getUser()
    } else if (serverUserId && !userId) {
      setUserId(serverUserId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverUserId, supabase])

  const fetchClasses = useCallback(async (id: string) => {
    try {
      setError(null)
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('owner_id', id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setClasses(data || [])
    } catch (error: any) {
      console.error('Error fetching classes:', error.message)
      setError('Failed to load classes. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const handleDeleteClass = async (classId: string, className: string) => {
    if (!confirm(`Are you sure you want to delete "${className}"? This will also delete all sessions and attendance records for this class.`)) {
      return
    }

    try {
      setError(null)
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', classId)

      if (error) throw error
      
      // Refresh the list
      if (userId) {
        fetchClasses(userId)
      }
    } catch (error: any) {
      console.error('Error deleting class:', error.message)
      setError('Failed to delete class. Please try again.')
    }
  }

  useEffect(() => {
    if (userId) {
      setLoading(true)
      fetchClasses(userId)
    }
  }, [userId, fetchClasses])

  const handleClassAdded = () => {
    if (userId) {
      fetchClasses(userId)
    }
    setShowModal(false)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-800">Loading classes...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Your Classes</h2>
        <button
          onClick={() => setShowModal(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
        >
          Add Class
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {classes.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No classes yet</h3>
          <p className="text-gray-800 mb-4">Create your first class to start tracking attendance.</p>
          <button
            onClick={() => setShowModal(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            Create Your First Class
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((classItem) => (
            <div
              key={classItem.id}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 border border-gray-200 hover:border-indigo-300 relative group"
            >
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleDeleteClass(classItem.id, classItem.name)
                }}
                className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-800 p-1.5 rounded hover:bg-red-50"
                title="Delete class"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              <Link
                href={`/classes/${classItem.id}`}
                className="block"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {classItem.name}
                </h3>
                <p className="text-sm text-gray-800">Term: {classItem.term}</p>
                <div className="mt-4 text-sm text-indigo-600 font-medium">
                  View Details →
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <AddClassModal
          userId={userId}
          onClose={() => setShowModal(false)}
          onSuccess={handleClassAdded}
        />
      )}
    </div>
  )
}


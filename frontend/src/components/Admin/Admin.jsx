import { useEffect, useState } from 'react'
import { adminApi } from '../../lib/api.js'
import { supabase } from '../../lib/supabase.js'

const demoData = {
  profiles: [
    { id: 'demo-1', full_name: 'Олександр Мельник', role: 'student', created_at: '2026-09-01' },
    { id: 'demo-2', full_name: 'Марія Коваль', role: 'student', created_at: '2026-09-03' },
  ],
  courses: [
    { id: 'course-1', name: 'Бази даних', source: 'moodle', user_id: 'demo-1' },
    { id: 'course-2', name: 'Архітектура ПЗ', source: 'manual', user_id: 'demo-2' },
  ],
  tasks: [
    { id: 'task-1', title: 'Реалізація міграцій БД', source: 'moodle', completed_at: null },
    {
      id: 'task-2',
      title: 'Есе з мікросервісної архітектури',
      source: 'manual',
      completed_at: '2026-09-14',
    },
  ],
  moodle_connections: [
    { id: 'moodle-1', base_url: 'moodle.example.edu', last_synced_at: '2026-09-15T12:00:00Z' },
  ],
}

const sections = [
  ['profiles', 'Користувачі', 'person'],
  ['courses', 'Курси', 'school'],
  ['tasks', 'Завдання', 'checklist'],
  ['moodle_connections', 'Moodle', 'sync'],
]

function formatDate(value) {
  if (!value) return 'Не виконано'
  return new Intl.DateTimeFormat('uk-UA', { dateStyle: 'medium' }).format(new Date(value))
}

export default function Admin() {
  const [data, setData] = useState(demoData)
  const [activeSection, setActiveSection] = useState('profiles')
  const [loading, setLoading] = useState(Boolean(supabase))
  const [error, setError] = useState('')

  useEffect(() => {
    if (!supabase) return undefined

    let mounted = true
    adminApi.overview().then(({ data: overview, error: requestError }) => {
      if (!mounted) return
      if (requestError) setError(requestError.message)
      setData(overview || { profiles: [], courses: [], tasks: [], moodle_connections: [] })
      setLoading(false)
    })

    return () => {
      mounted = false
    }
  }, [])

  const rows = data[activeSection] || []

  return (
    <div className="min-h-screen bg-[#f5f7fb] px-8 py-8 text-[#1d1d1f]">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600">
              StudyTrack Admin
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Огляд системи</h1>
            <p className="mt-2 text-sm text-gray-500">
              Користувачі, курси, завдання та підключення Moodle в одному місці.
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-medium text-gray-600 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Адміністратор
          </span>
        </header>

        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {sections.map(([key, label, icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveSection(key)}
              className={`rounded-xl border p-5 text-left transition ${activeSection === key ? 'border-blue-200 bg-blue-50' : 'border-gray-100 bg-white hover:border-blue-100'}`}
            >
              <span className="material-symbols-outlined text-blue-600" style={{ fontSize: 21 }}>
                {icon}
              </span>
              <p className="mt-4 text-2xl font-semibold">{data[key]?.length ?? 0}</p>
              <p className="mt-1 text-xs text-gray-500">{label}</p>
            </button>
          ))}
        </div>

        <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h2 className="font-semibold">
              {sections.find(([key]) => key === activeSection)?.[1]}
            </h2>
            {loading && <span className="text-xs text-gray-400">Оновлення...</span>}
          </div>

          {error && (
            <p className="border-b border-red-100 bg-red-50 px-5 py-3 text-sm text-red-700">
              Не вдалося завантажити дані: {error}
            </p>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-400">
                <tr>
                  <th className="px-5 py-3">Назва / ID</th>
                  <th className="px-5 py-3">Джерело</th>
                  <th className="px-5 py-3">Статус</th>
                  <th className="px-5 py-3">Дата</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4 font-medium">
                      {row.full_name || row.name || row.title || row.base_url || row.id}
                    </td>
                    <td className="px-5 py-4 text-gray-500">{row.source || 'Система'}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs ${row.completed_at || row.role === 'admin' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}
                      >
                        {row.role ||
                          (row.completed_at
                            ? 'Виконано'
                            : row.last_synced_at
                              ? 'Підключено'
                              : 'Активно')}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-500">
                      {formatDate(row.created_at || row.last_synced_at || row.completed_at)}
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td colSpan="4" className="px-5 py-10 text-center text-sm text-gray-400">
                      Даних поки немає
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}

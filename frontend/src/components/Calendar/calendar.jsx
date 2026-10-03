import { useEffect, useMemo, useRef, useState } from 'react'
import { tasksApi } from '../../lib/api.js'
import { supabase } from '../../lib/supabase.js'

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']
const MONTHS = [
  'Січень',
  'Лютий',
  'Березень',
  'Квітень',
  'Травень',
  'Червень',
  'Липень',
  'Серпень',
  'Вересень',
  'Жовтень',
  'Листопад',
  'Грудень',
]

// Перетворює courses.color (hex або tailwind-клас) у bg-клас для точки
const colorToBg = (color) => {
  if (!color) return 'bg-gray-400'
  if (color.startsWith('#')) return null // повернемо inline style
  // Якщо вже tailwind bg-клас
  if (color.startsWith('bg-')) return color
  // Інакше вважаємо що це назва кольору типу "yellow", "blue"
  return `bg-${color}-400`
}

const ColorDot = ({ color, className = 'h-2 w-2' }) => {
  const bg = colorToBg(color)
  if (bg) return <span className={`${className} rounded-full inline-block ${bg}`} />
  return (
    <span className={`${className} rounded-full inline-block`} style={{ backgroundColor: color }} />
  )
}

const dateKey = (date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const formatTime = (date) =>
  date.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })

// Повертає перший день тижня (Пн) для заданої дати
const getWeekStart = (date) => {
  const d = new Date(date)
  const day = (d.getDay() + 6) % 7 // 0=Пн
  d.setDate(d.getDate() - day)
  d.setHours(0, 0, 0, 0)
  return d
}

function WeekView({
  weekDays,
  tasksByDate,
  completedIds,
  selectedDate,
  setSelectedDate,
  today,
  todayKey,
  dateKey,
}) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-900 lg:col-span-8">
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((date) => {
          const key = dateKey(date)
          const dayTasks = tasksByDate[key] || []
          const selected = key === selectedDate
          const isToday = key === todayKey
          const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate())
          const hasOverdue = dayTasks.some((t) => !completedIds.includes(t.id) && isPast)

          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedDate(key)}
              className={`flex flex-col rounded-xl p-3 text-left transition-colors min-h-32
                ${
                  selected
                    ? 'bg-gray-900 text-white ring-2 ring-yellow-400 dark:bg-white dark:text-gray-900'
                    : hasOverdue
                      ? 'bg-red-50 dark:bg-red-900/20 hover:bg-red-100'
                      : 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700'
                }`}
            >
              <span
                className={`text-[10px] uppercase tracking-wider mb-1 ${selected ? 'text-gray-300 dark:text-gray-600' : 'text-gray-400'}`}
              >
                {WEEKDAYS[(date.getDay() + 6) % 7]}
              </span>
              <span
                className={`text-[18px] font-semibold mb-2 flex items-center gap-1
                ${isToday && !selected ? 'text-yellow-500' : ''}`}
              >
                {date.getDate()}
                {isToday && !selected && (
                  <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
                )}
              </span>
              <div className="flex flex-col gap-1">
                {dayTasks.slice(0, 3).map((task) => {
                  const done = completedIds.includes(task.id)
                  const overdue = isPast && !done
                  return (
                    <span
                      key={task.id}
                      className={`flex items-center gap-1 truncate rounded px-1 py-0.5 text-[10px]
                        ${done ? 'line-through opacity-50' : overdue ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : selected ? 'bg-white/20' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                    >
                      {!selected && (
                        <ColorDot color={task.courseColor} className="h-1.5 w-1.5 shrink-0" />
                      )}
                      <span className="truncate">{task.title}</span>
                    </span>
                  )
                })}
                {dayTasks.length > 3 && (
                  <span
                    className={`text-[10px] ${selected ? 'text-gray-300 dark:text-gray-600' : 'text-gray-400'}`}
                  >
                    +{dayTasks.length - 3} ще
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function Calendar({ user }) {
  const today = new Date()
  const todayKey = dateKey(today)

  const [viewMode, setViewMode] = useState('month') // "month" | "week"
  const [currentMonth, setCurrentMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  )
  const [weekStart, setWeekStart] = useState(getWeekStart(today))
  const [selectedDate, setSelectedDate] = useState(todayKey)
  const [tasks, setTasks] = useState([])
  const [completedIds, setCompletedIds] = useState([])
  const [loadError, setLoadError] = useState('')
  const [monthPickerOpen, setMonthPickerOpen] = useState(false)
  const monthPickerRef = useRef(null)

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (monthPickerRef.current && !monthPickerRef.current.contains(e.target)) {
        setMonthPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  useEffect(() => {
    if (!supabase || !user?.id) return
    tasksApi.list().then(({ data, error }) => {
      if (error) {
        setLoadError(error.message)
        return
      }
      const liveTasks = (data || [])
        .filter((t) => t.due_at)
        .map((t) => ({
          ...t,
          courseName: t.courses?.name || 'Без курсу',
          courseColor: t.courses?.color || 'gray',
        }))
      setTasks(liveTasks)
      setCompletedIds(liveTasks.filter((t) => t.completed_at).map((t) => t.id))
    })
  }, [user?.id])

  const tasksByDate = useMemo(
    () =>
      tasks.reduce((acc, task) => {
        const key = dateKey(new Date(task.due_at))
        acc[key] = [...(acc[key] || []), task]
        return acc
      }, {}),
    [tasks],
  )

  // Унікальні курси для легенди
  const courseLegend = useMemo(() => {
    const map = new Map()
    tasks.forEach((t) => {
      if (!map.has(t.courseName)) map.set(t.courseName, t.courseColor)
    })
    return [...map.entries()].map(([name, color]) => ({ name, color }))
  }, [tasks])

  const selectedTasks = tasksByDate[selectedDate] || []
  const selectedDateObj = new Date(`${selectedDate}T12:00:00`)

  // ── Місячна навігація ──────────────────────────────────────────────────────
  const changeMonth = (offset) =>
    setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + offset, 1))

  const selectToday = () => {
    const d = new Date()
    setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1))
    setWeekStart(getWeekStart(d))
    setSelectedDate(todayKey)
  }

  // ── Тижнева навігація ──────────────────────────────────────────────────────
  const changeWeek = (offset) => {
    setWeekStart((ws) => {
      const d = new Date(ws)
      d.setDate(d.getDate() + offset * 7)
      return d
    })
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })

  const weekLabel = (() => {
    const end = new Date(weekStart)
    end.setDate(end.getDate() + 6)
    const startStr = weekStart.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })
    const endStr = end.toLocaleDateString('uk-UA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
    return `${startStr} — ${endStr}`
  })()

  // ── Місячна сітка ──────────────────────────────────────────────────────────
  const monthLabel = currentMonth.toLocaleDateString('uk-UA', { month: 'long', year: 'numeric' })
  const firstWeekday = (currentMonth.getDay() + 6) % 7
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()
  const calendarCells = Array.from({ length: firstWeekday + daysInMonth }, (_, i) =>
    i < firstWeekday ? null : i - firstWeekday + 1,
  )

  const toggleTask = async (task) => {
    const wasDone = completedIds.includes(task.id)
    const completedAt = wasDone ? null : new Date().toISOString()
    setCompletedIds((ids) => (wasDone ? ids.filter((id) => id !== task.id) : [...ids, task.id]))
    setTasks((items) =>
      items.map((item) => (item.id === task.id ? { ...item, completed_at: completedAt } : item)),
    )
    if (supabase) {
      const { error } = await tasksApi.update(task.id, { completed_at: completedAt })
      if (error) {
        setCompletedIds((ids) => (wasDone ? [...ids, task.id] : ids.filter((id) => id !== task.id)))
        setTasks((items) =>
          items.map((item) =>
            item.id === task.id ? { ...item, completed_at: task.completed_at } : item,
          ),
        )
        setLoadError(error.message)
      }
    }
  }

  // ── Клітинка дня (місячний вигляд) ────────────────────────────────────────
  const MonthCell = ({ day }) => {
    if (!day) return <div className="h-24 rounded-lg bg-gray-50/50 dark:bg-gray-800/30" />
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    const key = dateKey(date)
    const dayTasks = tasksByDate[key] || []
    const selected = key === selectedDate
    const isToday = key === todayKey
    const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const hasOverdue = dayTasks.some((t) => !completedIds.includes(t.id) && isPast)
    const allDone = dayTasks.length > 0 && dayTasks.every((t) => completedIds.includes(t.id))

    return (
      <button
        type="button"
        onClick={() => setSelectedDate(key)}
        className={`relative flex h-24 flex-col justify-between overflow-hidden rounded-lg p-2 text-left transition-colors
          ${
            selected
              ? 'bg-gray-900 text-white ring-2 ring-yellow-400 dark:bg-white dark:text-gray-900'
              : hasOverdue && !allDone
                ? 'bg-red-50 dark:bg-red-900/20 hover:bg-red-100'
                : 'bg-gray-50 text-gray-900 hover:bg-gray-200 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700'
          }`}
      >
        {/* Число + індикатор сьогодні */}
        <span className="flex items-center gap-1.5">
          <span
            className={`text-[13px] font-medium ${isToday && !selected ? 'text-yellow-500' : ''}`}
          >
            {day}
          </span>
          {isToday && !selected && <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />}
        </span>

        {/* Крапки курсів */}
        {dayTasks.length > 0 && (
          <div className="flex justify-center gap-1">
            {dayTasks
              .slice(0, 4)
              .map((task) =>
                selected ? (
                  <span key={task.id} className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
                ) : (
                  <ColorDot key={task.id} color={task.courseColor} className="h-1.5 w-1.5" />
                ),
              )}
          </div>
        )}

        {/* Прострочено — червона мітка */}
        {hasOverdue && !allDone && !selected && (
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />
        )}

        {/* Усі виконано — жовта лінія знизу */}
        {allDone && <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-yellow-400" />}
      </button>
    )
  }

  // ── Тижневий вигляд — компонент визначений вище ────────────────────

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="mb-1 block text-[11px] uppercase tracking-wider text-gray-500">
            Планування та дедлайни
          </span>
          <h1 className="text-[28px] font-semibold tracking-tight">Календар</h1>
          <p className="mt-1 text-sm text-gray-500">
            Актуальні дедлайни із синхронізованих курсів.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap justify-end">
          {/* Перемикач місяць/тиждень */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-900 p-1 rounded-xl">
            {[
              ['month', 'Місяць'],
              ['week', 'Тиждень'],
            ].map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all
                  ${viewMode === mode ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Навігація */}
          <div
            ref={monthPickerRef}
            className="relative flex items-center gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-900"
          >
            <button
              type="button"
              onClick={() => (viewMode === 'month' ? changeMonth(-1) : changeWeek(-1))}
              className="rounded-lg p-2 hover:bg-gray-200 dark:hover:bg-gray-800"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                chevron_left
              </span>
            </button>

            {viewMode === 'month' ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMonthPickerOpen((o) => !o)}
                  className="min-w-36 rounded-lg px-4 py-2 text-center text-sm font-semibold capitalize hover:bg-gray-200 dark:hover:bg-gray-800"
                >
                  {monthLabel}
                </button>
                {monthPickerOpen && (
                  <div className="absolute left-1/2 top-full z-30 mt-2 w-80 -translate-x-1/2 rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
                    <div className="mb-3 flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
                      <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
                        Вибрати місяць
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setCurrentMonth((m) => new Date(m.getFullYear() - 1, m.getMonth(), 1))
                          }
                          className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                            chevron_left
                          </span>
                        </button>
                        <span className="min-w-16 text-center text-sm font-semibold">
                          {currentMonth.getFullYear()}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setCurrentMonth((m) => new Date(m.getFullYear() + 1, m.getMonth(), 1))
                          }
                          className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                            chevron_right
                          </span>
                        </button>
                      </div>
                    </div>
                    <div
                      className="grid gap-1.5"
                      style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}
                    >
                      {MONTHS.map((month, i) => (
                        <button
                          key={month}
                          type="button"
                          onClick={() => {
                            setCurrentMonth((c) => new Date(c.getFullYear(), i, 1))
                            setMonthPickerOpen(false)
                          }}
                          className={`h-9 rounded-lg px-1 text-[11px] transition-colors
                            ${currentMonth.getMonth() === i ? 'bg-gray-900 font-semibold text-white dark:bg-white dark:text-gray-900' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}`}
                        >
                          {month}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <span className="min-w-52 px-3 py-2 text-center text-sm font-semibold">
                {weekLabel}
              </span>
            )}

            <button
              type="button"
              onClick={() => (viewMode === 'month' ? changeMonth(1) : changeWeek(1))}
              className="rounded-lg p-2 hover:bg-gray-200 dark:hover:bg-gray-800"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                chevron_right
              </span>
            </button>
            <button
              type="button"
              onClick={selectToday}
              className="ml-1 rounded-lg bg-gray-200 px-3 py-1.5 text-xs font-medium hover:opacity-80 dark:bg-gray-800"
            >
              Сьогодні
            </button>
          </div>
        </div>
      </div>

      {loadError && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          Не вдалося завантажити календар: {loadError}
        </div>
      )}

      <div className="grid items-start gap-8 lg:grid-cols-12">
        {/* Місячний або тижневий вигляд */}
        {viewMode === 'month' ? (
          <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-900 lg:col-span-8">
            <div className="mb-4 grid grid-cols-7 gap-2 text-center">
              {WEEKDAYS.map((d) => (
                <span key={d} className="text-[11px] font-medium text-gray-500">
                  {d}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {calendarCells.map((day, i) => (
                <MonthCell key={day ?? `empty-${i}`} day={day} />
              ))}
            </div>
          </div>
        ) : (
          <WeekView
            weekDays={weekDays}
            tasksByDate={tasksByDate}
            completedIds={completedIds}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            today={today}
            todayKey={todayKey}
            dateKey={dateKey}
          />
        )}

        {/* Бічна панель */}
        <div className="flex flex-col rounded-xl bg-white p-6 shadow-sm dark:bg-gray-900 lg:col-span-4">
          <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
            <div>
              <span className="block text-[11px] uppercase tracking-wider text-gray-500">
                Вибраний день
              </span>
              <h2 className="text-xl font-semibold capitalize">
                {selectedDateObj.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' })}
              </h2>
            </div>
            <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] text-gray-500 dark:bg-gray-800">
              {selectedTasks.length} завдань
            </span>
          </div>

          <div className="flex-1 space-y-3">
            {selectedTasks.length === 0 && (
              <p className="py-8 text-center text-sm text-gray-400">Немає завдань на цей день</p>
            )}
            {selectedTasks.map((task) => {
              const done = completedIds.includes(task.id)
              const dueDate = new Date(task.due_at)
              const isPast = dueDate < today
              const overdue = isPast && !done

              return (
                <div
                  key={task.id}
                  className={`flex items-start gap-3 rounded-lg p-3.5 transition-colors
                    ${
                      done
                        ? 'bg-gray-50 opacity-60 dark:bg-gray-800/50'
                        : overdue
                          ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                          : 'bg-gray-50 dark:bg-gray-800'
                    }`}
                >
                  <input
                    type="checkbox"
                    checked={done}
                    onChange={() => toggleTask(task)}
                    className="mt-1 h-4 w-4 accent-yellow-400"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500">
                        <ColorDot color={task.courseColor} className="h-1.5 w-1.5" />
                        {task.courseName}
                      </span>
                      <span
                        className={`text-[11px] ${overdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}
                      >
                        {overdue ? 'Прострочено' : formatTime(dueDate)}
                      </span>
                    </div>
                    <p
                      className={`truncate text-sm font-medium ${done ? 'line-through text-gray-400' : overdue ? 'text-red-700 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}
                    >
                      {task.title}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-4 border-t border-gray-100 pt-4 text-[13px] text-gray-500 dark:border-gray-800">
            Виконано {selectedTasks.filter((t) => completedIds.includes(t.id)).length} з{' '}
            {selectedTasks.length}
          </div>
        </div>
      </div>

      {/* Легенда курсів */}
      {courseLegend.length > 0 && (
        <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-900">
          <span className="mb-3 block text-[11px] uppercase tracking-wider text-gray-500">
            Курси
          </span>
          <div className="flex flex-wrap gap-3">
            {courseLegend.map(({ name, color }) => (
              <span
                key={name}
                className="flex items-center gap-2 text-[13px] text-gray-700 dark:text-gray-300"
              >
                <ColorDot color={color} className="h-2.5 w-2.5 shrink-0" />
                {name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

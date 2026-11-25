'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import StudyAvailability from './StudyAvailability'
import StudySchedule from './StudySchedule'
import AIAssignmentEntry from './AIAssignmentEntry'

type Assignment = {
  id: string | number
  title: string
  due_date: string
  effort_hours: number
}

const cardClass =
  'rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm sm:p-6'

const inputClass =
  'mt-2 block w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20'

const buttonClass =
  'rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 disabled:cursor-not-allowed disabled:opacity-50'

const componentClass = [
  cardClass,
  '[&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold',
  '[&_h3]:mb-3 [&_h3]:mt-6 [&_h3]:font-medium',
  '[&_p]:my-3 [&_p]:text-sm [&_p]:leading-6 [&_p]:text-slate-400',
  '[&_label]:block [&_label]:text-sm [&_label]:text-slate-300',
  '[&_input]:mt-2 [&_input]:block [&_input]:w-full',
  '[&_input]:rounded-xl [&_input]:border [&_input]:border-slate-700',
  '[&_input]:bg-slate-950 [&_input]:px-4 [&_input]:py-3',
  '[&_input]:text-slate-100 [&_input]:outline-none',
  '[&_input:focus]:border-indigo-400',
  '[&_select]:mt-2 [&_select]:block [&_select]:w-full',
  '[&_select]:rounded-xl [&_select]:border [&_select]:border-slate-700',
  '[&_select]:bg-slate-950 [&_select]:px-4 [&_select]:py-3',
  '[&_textarea]:my-3 [&_textarea]:block [&_textarea]:w-full',
  '[&_textarea]:rounded-xl [&_textarea]:border [&_textarea]:border-slate-700',
  '[&_textarea]:bg-slate-950 [&_textarea]:px-4 [&_textarea]:py-3',
  '[&_textarea]:text-sm [&_textarea]:outline-none',
  '[&_textarea:focus]:border-indigo-400',
  '[&_fieldset]:flex [&_fieldset]:flex-col [&_fieldset]:gap-4',
  '[&_legend]:mb-4 [&_legend]:text-sm [&_legend]:text-slate-400',
  '[&_button]:mt-3 [&_button]:rounded-xl [&_button]:bg-indigo-500',
  '[&_button]:px-4 [&_button]:py-3 [&_button]:text-sm',
  '[&_button]:font-semibold [&_button]:text-white',
  '[&_button]:transition [&_button:hover]:bg-indigo-400',
  '[&_button:disabled]:cursor-not-allowed [&_button:disabled]:opacity-50',
  '[&_ul]:space-y-3',
  '[&_li]:rounded-xl [&_li]:border [&_li]:border-slate-800',
  '[&_li]:bg-slate-950/60 [&_li]:p-4',
  '[&_li]:text-sm [&_li]:leading-6 [&_li]:text-slate-300',
].join(' ')

function formatDeadline(value: string) {
  const dateOnly = value.split('T')[0]
  const date = new Date(`${dateOnly}T00:00:00`)

  if (Number.isNaN(date.getTime())) return dateOnly

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function Home() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [effortHours, setEffortHours] = useState('')

  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [assignmentError, setAssignmentError] = useState('')
  const [saveMessage, setSaveMessage] = useState('')
  const [loginMessage, setLoginMessage] = useState('')

  const [loggingIn, setLoggingIn] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [authReady, setAuthReady] = useState(false)
  const [saving, setSaving] = useState(false)

  const [editingId, setEditingId] = useState<string | number | null>(null)
  const [deletingId, setDeletingId] = useState<string | number | null>(null)
  const [scheduleVersion, setScheduleVersion] = useState(0)

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(Boolean(session))
      setAuthReady(true)

      if (!session) {
        setAssignments([])
        setEmail('')
        setPassword('')
        setTitle('')
        setDueDate('')
        setEffortHours('')
        setEditingId(null)
        setSaveMessage('')
        setAssignmentError('')
        setLoginMessage('')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    let cancelled = false

    async function restoreAssignments() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) return

      const { data, error } = await supabase
        .from('assignments')
        .select('id, title, due_date, effort_hours')
        .eq('user_id', user.id)
        .order('due_date', { ascending: true })

      if (cancelled) return

      if (error) {
        setAssignmentError(error.message)
        return
      }

      setAssignments(data ?? [])
      setLoginMessage('Your saved session is active.')
    }

    void restoreAssignments().catch(() => {
      if (!cancelled) {
        setAssignmentError('Could not load assignments. Try logging in.')
      }
    })

    return () => {
      cancelled = true
    }
  }, [])

  async function loadAssignments(userId: string) {
    setAssignmentError('')

    const { data, error } = await supabase
      .from('assignments')
      .select('id, title, due_date, effort_hours')
      .eq('user_id', userId)
      .order('due_date', { ascending: true })

    if (error) {
      setAssignmentError(error.message)
      return
    }

    setAssignments(data ?? [])
  }

  async function handleLogin() {
    setLoggingIn(true)
    setLoginMessage('')

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        setLoginMessage(error.message)
        return
      }

      if (data.user) {
        setPassword('')
        setLoginMessage('You’re logged in.')
        await loadAssignments(data.user.id)
      }
    } catch {
      setLoginMessage('Could not connect. Please try again.')
    } finally {
      setLoggingIn(false)
    }
  }

  async function handleLogout() {
    setLoggingOut(true)
    setLoginMessage('')

    try {
      const { error } = await supabase.auth.signOut()

      if (error) {
        setLoginMessage(error.message)
        return
      }

      window.location.reload()
    } catch {
      setLoginMessage('Could not log out. Please try again.')
    } finally {
      setLoggingOut(false)
    }
  }

  function handleEditAssignment(assignment: Assignment) {
    setEditingId(assignment.id)
    setTitle(assignment.title)
    setDueDate(assignment.due_date.split('T')[0])
    setEffortHours(String(assignment.effort_hours))
    setSaveMessage('Editing assignment. Update the fields and save.')

    document.getElementById('assignment-form')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  function cancelEditing() {
    setEditingId(null)
    setTitle('')
    setDueDate('')
    setEffortHours('')
    setSaveMessage('')
  }

  async function handleAddAssignment() {
    setSaveMessage('')

    if (
      !title.trim() ||
      !dueDate ||
      !Number.isFinite(Number(effortHours)) ||
      Number(effortHours) <= 0
    ) {
      setSaveMessage(
        'Enter a name, deadline, and positive estimated hours.'
      )
      return
    }

    setSaving(true)

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        setSaveMessage('Please log in before saving.')
        return
      }

      const values = {
        title: title.trim(),
        due_date: dueDate,
        effort_hours: Number(effortHours),
      }

      if (editingId !== null) {
        const { data, error } = await supabase
          .from('assignments')
          .update(values)
          .eq('id', editingId)
          .eq('user_id', user.id)
          .select('id')

        if (error) {
          setSaveMessage(error.message)
          return
        }

        if (!data?.length) {
          setSaveMessage(
            'Assignment was not updated. Refresh and try again.'
          )
          return
        }
      } else {
        const { error } = await supabase
          .from('assignments')
          .insert({
            ...values,
            user_id: user.id,
          })

        if (error) {
          setSaveMessage(error.message)
          return
        }
      }

      setSaveMessage(
        editingId !== null ? 'Assignment updated.' : 'Assignment saved.'
      )

      setEditingId(null)
      setTitle('')
      setDueDate('')
      setEffortHours('')
      setScheduleVersion((current) => current + 1)

      await loadAssignments(user.id)
    } catch {
      setSaveMessage('Could not save your assignment. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteAssignment(assignment: Assignment) {
    const confirmed = window.confirm(
      `Delete "${assignment.title}"? This cannot be undone.`
    )

    if (!confirmed) return

    setDeletingId(assignment.id)
    setAssignmentError('')

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        setAssignmentError('Please log in before deleting.')
        return
      }

      const { data, error } = await supabase
        .from('assignments')
        .delete()
        .eq('id', assignment.id)
        .eq('user_id', user.id)
        .select('id')

      if (error) {
        setAssignmentError(error.message)
        return
      }

      if (!data?.length) {
        setAssignmentError(
          'Assignment was not deleted. Refresh the page and try again.'
        )
        return
      }

      setAssignments((current) =>
        current.filter((item) => item.id !== assignment.id)
      )

      if (editingId === assignment.id) {
        cancelEditing()
      }

      setScheduleVersion((current) => current + 1)
    } catch {
      setAssignmentError('Could not delete the assignment. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  const totalHours = assignments.reduce(
    (total, assignment) => total + Number(assignment.effort_hours),
    0
  )

  if (!authReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        <p role="status">Loading your session…</p>
      </main>
    )
  }

  if (!isLoggedIn) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 text-slate-100 [color-scheme:dark]">
        <div className="w-full max-w-md">
          <header className="mb-8 text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">
              Your personal study workspace
            </p>

            <h1 className="text-4xl font-bold tracking-tight">
              StudyOS
            </h1>

            <p className="mt-3 text-sm text-slate-400">
              Log in to access your assignments and study schedule.
            </p>
          </header>

          <section className={cardClass}>
            <h2 className="text-xl font-semibold">Welcome back</h2>

            <form
              className="mt-5 space-y-4"
              onSubmit={(event) => {
                event.preventDefault()
                void handleLogin()
              }}
            >
              <label className="block text-sm text-slate-300">
                Email
                <input
                  className={inputClass}
                  type="email"
                  autoComplete="username"
                  placeholder="you@example.com"
                  value={email}
                  required
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>

              <label className="block text-sm text-slate-300">
                Password
                <input
                  className={inputClass}
                  type="password"
                  autoComplete="current-password"
                  placeholder="Your password"
                  value={password}
                  required
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>

              <button
                className={`${buttonClass} w-full`}
                type="submit"
                disabled={loggingIn}
              >
                {loggingIn ? 'Logging in…' : 'Log in'}
              </button>

              <p role="status" className="text-sm text-slate-400">
                {loginMessage}
              </p>
            </form>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 [color-scheme:dark]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 border-b border-slate-800 pb-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">
            Your personal study workspace
          </p>

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            StudyOS
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
            Turn assignments into a realistic study week.
            Add your tasks, choose your availability, and make a plan.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <span className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300">
              {assignments.length} assignments
            </span>

            <span className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300">
              {Number(totalHours.toFixed(2))} estimated hours
            </span>
          </div>
        </header>

        <div className="grid items-start gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className={componentClass}>
              <AIAssignmentEntry
                onParsed={(assignment) => {
                  if (saving || deletingId !== null) return

                  setEditingId(null)
                  setTitle(assignment.title)
                  setDueDate(assignment.due_date ?? '')
                  setEffortHours(
                    assignment.effort_hours === null
                      ? ''
                      : String(assignment.effort_hours)
                  )
                  setSaveMessage('Review the details below before saving.')
                }}
              />
            </div>

            <section
              id="assignment-form"
              className={`${cardClass} scroll-mt-6`}
            >
              <h2 className="text-lg font-semibold">
                {editingId !== null ? 'Edit Assignment' : 'Add Assignment'}
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                {editingId !== null
                  ? 'Update the details below, then save your changes.'
                  : 'Enter a task manually or review the details filled in by AI.'}
              </p>

              <form
                className="mt-5"
                onSubmit={(event) => {
                  event.preventDefault()
                  void handleAddAssignment()
                }}
              >
                <fieldset
                  disabled={saving || deletingId !== null}
                  className="space-y-4"
                >
                  <label className="block text-sm text-slate-300">
                    Assignment name
                    <input
                      className={inputClass}
                      type="text"
                      placeholder="e.g. Linear algebra practice"
                      value={title}
                      required
                      onChange={(event) => setTitle(event.target.value)}
                    />
                  </label>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm text-slate-300">
                      Due date
                      <input
                        className={inputClass}
                        type="date"
                        value={dueDate}
                        required
                        onChange={(event) => setDueDate(event.target.value)}
                      />
                    </label>

                    <label className="block text-sm text-slate-300">
                      Estimated hours
                      <input
                        className={inputClass}
                        type="number"
                        min="0.01"
                        step="any"
                        placeholder="e.g. 2"
                        value={effortHours}
                        required
                        onChange={(event) =>
                          setEffortHours(event.target.value)
                        }
                      />
                    </label>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      className={buttonClass}
                      type="submit"
                      disabled={saving || deletingId !== null}
                    >
                      {saving
                        ? 'Saving…'
                        : editingId !== null
                          ? 'Save Changes'
                          : 'Add Assignment'}
                    </button>

                    {editingId !== null && (
                      <button
                        type="button"
                        disabled={saving || deletingId !== null}
                        onClick={cancelEditing}
                        className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-medium text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </fieldset>

                <p role="status" className="mt-4 text-sm text-slate-400">
                  {saveMessage}
                </p>
              </form>
            </section>

            <div className={componentClass}>
              <StudySchedule key={scheduleVersion} />
            </div>
          </div>

          <aside className="space-y-6">
            <section className={cardClass}>
              <h2 className="text-lg font-semibold">Your Account</h2>

              <div className="mt-4 space-y-4">
                <p className="text-sm text-emerald-400">
                  You’re signed in.
                </p>

                <button
                  type="button"
                  className={`${buttonClass} w-full`}
                  disabled={loggingOut || saving || deletingId !== null}
                  onClick={() => void handleLogout()}
                >
                  {loggingOut ? 'Logging out…' : 'Log out'}
                </button>

                <p role="status" className="text-sm text-slate-400">
                  {loginMessage}
                </p>
              </div>
            </section>

            <div className={componentClass}>
              <StudyAvailability />
            </div>

            <section className={cardClass}>
              <h2 className="text-lg font-semibold">Your Assignments</h2>

              {assignmentError && (
                <p role="alert" className="mt-3 text-sm text-rose-400">
                  {assignmentError}
                </p>
              )}

              {assignments.length === 0 ? (
                <p className="mt-4 text-sm leading-6 text-slate-400">
                  No assignments loaded. Add your first task.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {assignments.map((assignment) => (
                    <li
                      key={assignment.id}
                      className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
                    >
                      <p className="break-words text-sm font-medium">
                        {assignment.title}
                      </p>

                      <p className="mt-2 text-xs leading-5 text-slate-400">
                        Due {formatDeadline(assignment.due_date)}
                        {' · '}
                        {assignment.effort_hours}
                        {Number(assignment.effort_hours) === 1
                          ? ' hour'
                          : ' hours'}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={saving || deletingId !== null}
                          onClick={() => handleEditAssignment(assignment)}
                          className="rounded-lg border border-indigo-400/30 px-3 py-2 text-xs font-medium text-indigo-300 transition hover:bg-indigo-400/10 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          disabled={saving || deletingId !== null}
                          onClick={() =>
                            void handleDeleteAssignment(assignment)
                          }
                          className="rounded-lg border border-rose-400/30 px-3 py-2 text-xs font-medium text-rose-400 transition hover:bg-rose-400/10 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {deletingId === assignment.id
                            ? 'Deleting…'
                            : 'Delete'}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </aside>
        </div>
      </div>
    </main>
  )
}
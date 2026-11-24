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

export default function Home() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [effortHours, setEffortHours] = useState('')

  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [assignmentError, setAssignmentError] = useState('')

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
  }

  void restoreAssignments().catch(() => {
    if (!cancelled) {
      setAssignmentError('Could not load assignments. Please try logging in.')
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

  // Logs the user into Supabase
  async function handleLogin() {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    })

    if (error) {
      console.error('Login error:', error.message)
      return
    }

    console.log('Logged in user:', data.user)

    if (data.user) {
  await loadAssignments(data.user.id)
}
  }

  // Saves a new assignment to Supabase
  async function handleAddAssignment() {
    // Find out which user is currently logged in
    if (
          !title.trim() ||
          !dueDate ||
          !Number.isFinite(Number(effortHours)) ||
          Number(effortHours) <= 0
        ) {
  alert('Enter an assignment name, deadline, and positive estimated hours.')
  return
}
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('No logged-in user:', userError?.message)
      return
    }

    // Insert the assignment into our assignments table
    const { data, error } = await supabase
      .from('assignments')
      .insert({
        user_id: user.id,
        title: title,
        due_date: dueDate,
        effort_hours: Number(effortHours),
      })
      .select()
      .single()

    if (error) {
      console.error('Assignment error:', error.message)
      return
    }

    console.log('Assignment saved:', data)

    await loadAssignments(user.id)
      setTitle('')
      setDueDate('')
      setEffortHours('')
  }

  return (
    <main>
      <h1>Study Scheduler</h1>

      <section>
        <h2>Login</h2>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        <button onClick={handleLogin}>
          Log in
        </button>
      </section>

      <section>
        <AIAssignmentEntry
        onParsed={(assignment) => {
        setTitle(assignment.title)
        setDueDate(assignment.due_date ?? '')
        setEffortHours(
        assignment.effort_hours === null
            ? ''
            : String(assignment.effort_hours)
    )
  }}
/>
        <h2>Add Assignment</h2>

        <input
          type="text"
          placeholder="Assignment name"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />

        <input
          type="date"
          value={dueDate}
          onChange={(event) => setDueDate(event.target.value)}
        />

        <input
          type="number"
          min="0.5"
          step="0.5"
          placeholder="Estimated hours"
          value={effortHours}
          onChange={(event) => setEffortHours(event.target.value)}
        />

        <button onClick={handleAddAssignment}>
          Add Assignment
        </button>
      </section>
      <section>
  <h2>Your Assignments</h2>

  {assignmentError && (
    <p role="alert">{assignmentError}</p>
  )}

  {assignments.length === 0 ? (
    <p>No assignments loaded yet. Log in and add one.</p>
  ) : (
    <ul>
      {assignments.map((assignment) => (
        <li key={assignment.id}>
          <strong>{assignment.title}</strong>
          {' — Due: '}
          {assignment.due_date}
          {' — '}
          {assignment.effort_hours} hours
        </li>
      ))}
    </ul>
  )}
</section>
    <StudyAvailability />
    <StudySchedule />
    </main>
  )
}
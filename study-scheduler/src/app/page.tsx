'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [effortHours, setEffortHours] = useState('')

  const [assignments, setAssignments] = useState<any[]>([])

  // Log the user into Supabase
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
  }

  // Save a new assignment to Supabase
  async function handleAddAssignment() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('No logged-in user:', userError?.message)
      return
    }

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

    setTitle('')
    setDueDate('')
    setEffortHours('')
  }

  // Load the current user's assignments
  async function loadAssignments() {
    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .order('due_date', { ascending: true })

    if (error) {
      console.error('Error loading assignments:', error.message)
      return
    }

    setAssignments(data)
  }

  // Add 0.5 hours to an assignment's completed time
  async function addCompletedTime(
    assignmentId: string,
    currentHours: number
  ) {
    const newHours = currentHours + 0.5

    const { error } = await supabase
      .from('assignments')
      .update({
        hours_completed: newHours,
      })
      .eq('id', assignmentId)

    if (error) {
      console.error('Error updating assignment:', error.message)
      return
    }

    await loadAssignments()
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

        <button onClick={loadAssignments}>
          Load Assignments
        </button>
      </section>

      <section>
        <h2>Your Assignments</h2>

        {assignments.map((assignment) => {
          const remainingHours =
            assignment.effort_hours - assignment.hours_completed

          return (
            <div key={assignment.id}>
              <h3>{assignment.title}</h3>

              <p>Due: {assignment.due_date}</p>

              <p>
                Estimated hours: {assignment.effort_hours}
              </p>

              <p>
                Completed: {assignment.hours_completed}
              </p>

              <p>
                Remaining: {remainingHours}
              </p>

              <button
                onClick={() =>
                  addCompletedTime(
                    assignment.id,
                    Number(assignment.hours_completed)
                  )
                }
              >
                +0.5 Hour
              </button>
            </div>
          )
        })}
      </section>
    </main>
  )
}
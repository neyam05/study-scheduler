'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [effortHours, setEffortHours] = useState('')

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
  }

  // Saves a new assignment to Supabase
  async function handleAddAssignment() {
    // Find out which user is currently logged in
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
      </section>
    </main>
  )
}
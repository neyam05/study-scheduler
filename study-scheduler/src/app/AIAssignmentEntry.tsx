'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

type AssignmentDraft = {
  title: string
  due_date: string | null
  effort_hours: number | null
  clarification: string | null
}

type Props = {
  onParsed: (assignment: AssignmentDraft) => void
}

export default function AIAssignmentEntry({ onParsed }: Props) {
  const [text, setText] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleParse() {
    setMessage('')
    setBusy(true)

    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (error || !session) {
        setMessage('Please log in first.')
        return
      }

      // Use the browser's local date, rather than the UTC date.
      const now = new Date()
      const today = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0'),
      ].join('-')

      const response = await fetch('/api/parse-assignment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ text, today }),
      })

      const result = await response.json()

      if (!response.ok) {
        setMessage(result.error ?? 'Could not interpret your task.')
        return
      }

      const assignment = result.assignment as AssignmentDraft

      if (!assignment || typeof assignment.title !== 'string') {
        setMessage('The server returned an unexpected result.')
        return
      }

      onParsed(assignment)

      setMessage(
        assignment.clarification ||
          'Form filled in. Review the details, then click Add Assignment.'
      )
    } catch {
      setMessage('Could not reach the server. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section>
      <h2>Add a Task with AI</h2>

      <label htmlFor="ai-task">Describe one study task</label>

      <textarea
        id="ai-task"
        rows={3}
        maxLength={2000}
        placeholder="Study linear algebra for two hours, due Friday."
        value={text}
        disabled={busy}
        onChange={(event) => setText(event.target.value)}
      />

      <button
        type="button"
        disabled={busy || !text.trim()}
        onClick={() => void handleParse()}
      >
        {busy ? 'Reading your task…' : 'Fill Assignment Form'}
      </button>

      <p role="status">{message}</p>
    </section>
  )
}
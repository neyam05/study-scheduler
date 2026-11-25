'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  generateSchedule,
  type ScheduleResult,
} from '@/lib/scheduler'

export default function StudySchedule() {
  const [schedule, setSchedule] = useState<ScheduleResult | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleGenerate() {
    setBusy(true)
    setMessage('')
    setSchedule(null)

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        setMessage('Please log in first.')
        return
      }

      const [assignmentResult, availabilityResult] = await Promise.all([
        supabase
          .from('assignments')
          .select('id, title, due_date, effort_hours')
          .eq('user_id', user.id),

        supabase
          .from('availability')
          .select('day_of_week, start_time, end_time')
          .eq('user_id', user.id),
      ])

      if (assignmentResult.error) throw assignmentResult.error
      if (availabilityResult.error) throw availabilityResult.error

      const assignments = assignmentResult.data ?? []
      const availability = availabilityResult.data ?? []

      if (assignments.length === 0) {
        setMessage('Add an assignment first.')
        return
      }

      if (availability.length === 0) {
        setMessage('Save at least one study availability window first.')
        return
      }

      setSchedule(generateSchedule(assignments, availability))
    } catch (error) {
      const details = error as { message?: string }
      setMessage(details.message ?? 'Could not generate your schedule.')
    } finally {
      setBusy(false)
    }
  }

  function formatTime(value: string) {
    return new Date(value).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return (
    <section>
      <h2>Your Study Schedule</h2>

      <p>
        Schedule assignments into your availability over the next seven
        days. Deadlines are treated as the end of their selected day.
      </p>

      <button
        type="button"
        disabled={busy}
        onClick={() => void handleGenerate()}
      >
        {busy ? 'Generating…' : 'Generate Schedule'}
      </button>

      <p role="status">{message}</p>

      {schedule && (
        <>
          {schedule.blocks.length === 0 ? (
            <p>
              No study blocks could fit. Check your deadlines and upcoming
              availability.
            </p>
          ) : (
            <ul>
              {schedule.blocks.map((block) => (
                <li key={`${block.assignmentId}-${block.start}`}>
                  <strong>{block.title}</strong>
                  {' — '}
                  {new Date(block.start).toLocaleDateString([], {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                  {' · '}
                  {formatTime(block.start)}–{formatTime(block.end)}
                </li>
              ))}
            </ul>
          )}

          {schedule.unscheduled.length > 0 && (
            <>
              <h3>Work That Couldn’t Fit</h3>

              <ul>
                {schedule.unscheduled.map((task) => (
                  <li key={task.assignmentId}>
                    {task.title}: {task.remainingMinutes} minutes remaining
                  </li>
                ))}
              </ul>

              <p>
                Add availability before the deadline or review your effort
                estimates, then generate again.
              </p>
            </>
          )}
        </>
      )}
    </section>
  )
}
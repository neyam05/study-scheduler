'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const days = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

type Availability = {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
}

export default function StudyAvailability() {
  const [day, setDay] = useState('0')
  const [startTime, setStartTime] = useState('14:00')
  const [endTime, setEndTime] = useState('16:00')
  const [windows, setWindows] = useState<Availability[]>([])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function fetchWindows(userId: string) {
    const { data, error } = await supabase
      .from('availability')
      .select('id, day_of_week, start_time, end_time')
      .eq('user_id', userId)
      .order('day_of_week')
      .order('start_time')

    if (error) throw error

    setWindows(data ?? [])
  }

  async function handleAvailability(save: boolean) {
    setMessage('')

    if (save && (!startTime || !endTime || endTime <= startTime)) {
      setMessage('Choose an end time later than the start time.')
      return
    }

    setBusy(true)

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        setWindows([])
        setMessage('Please log in first.')
        return
      }

      if (save) {
        const { error } = await supabase
          .from('availability')
          .insert({
            user_id: user.id,
            day_of_week: Number(day),
            start_time: startTime,
            end_time: endTime,
          })

        if (error) throw error
      }

      await fetchWindows(user.id)
      setMessage(save ? 'Availability saved.' : 'Availability loaded.')
    } catch (error) {
      const details = error as { message?: string }
      setMessage(details.message ?? 'Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section>
      <h2>Study Availability</h2>
      <p>Add the times you can study each week.</p>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          void handleAvailability(true)
        }}
      >
        <fieldset disabled={busy}>
          <legend>Add a weekly study window</legend>

          <label>
            Day
            <select
              value={day}
              onChange={(event) => setDay(event.target.value)}
            >
              {days.map((name, index) => (
                <option key={name} value={index}>
                  {name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Start time
            <input
              type="time"
              required
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
            />
          </label>

          <label>
            End time
            <input
              type="time"
              required
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
            />
          </label>

          <button type="submit">Save availability</button>

          <button
            type="button"
            onClick={() => void handleAvailability(false)}
          >
            Load saved availability
          </button>
        </fieldset>
      </form>

      <p role="status">{busy ? 'Working…' : message}</p>

      <h3>Saved Study Windows</h3>

      {windows.length === 0 ? (
        <p>No windows loaded yet.</p>
      ) : (
        <ul>
          {windows.map((window) => (
            <li key={window.id}>
              {days[window.day_of_week]}:{' '}
              {window.start_time.slice(0, 5)}–{window.end_time.slice(0, 5)}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
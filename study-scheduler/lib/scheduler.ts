export type StudyAssignment = {
  id: string | number
  title: string
  due_date: string
  effort_hours: number
}

export type AvailabilityWindow = {
  day_of_week: number
  start_time: string
  end_time: string
}

export type StudyBlock = {
  assignmentId: string | number
  title: string
  start: string
  end: string
}

export type ScheduleResult = {
  blocks: StudyBlock[]
  unscheduled: {
    assignmentId: string | number
    title: string
    remainingMinutes: number
  }[]
}

// Date-only deadlines are treated as due at the end of that local day.
function getDeadline(dueDate: string): number {
  // Preserve the selected calendar date from Supabase's timestamp.
  const dateOnly = dueDate.split('T')[0]
  const date = new Date(`${dateOnly}T00:00:00`)

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid deadline: ${dueDate}`)
  }

  // Treat the assignment as due at the end of that local day.
  date.setDate(date.getDate() + 1)

  return date.getTime()
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

export function generateSchedule(
  assignments: StudyAssignment[],
  availability: AvailabilityWindow[],
  now: Date = new Date()
): ScheduleResult {
  const blocks: StudyBlock[] = []
  const unscheduled: ScheduleResult['unscheduled'] = []

  // A Map removes duplicate slots from overlapping availability windows.
  const slots = new Map<number, number>()

  for (let offset = 0; offset < 7; offset++) {
    const day = new Date(now)
    day.setHours(0, 0, 0, 0)
    day.setDate(day.getDate() + offset)

    // JavaScript uses Sunday = 0.
    // Our availability table uses Monday = 0.
    const dayOfWeek = (day.getDay() + 6) % 7

    const windows = availability.filter(
      (window) => window.day_of_week === dayOfWeek
    )

    for (const window of windows) {
      const startMinutes = timeToMinutes(window.start_time)
      const endMinutes = timeToMinutes(window.end_time)

      // Start on a half-hour boundary, such as 14:00 or 14:30.
      const firstSlot = Math.ceil(startMinutes / 30) * 30

      for (
        let minute = firstSlot;
        minute + 30 <= endMinutes;
        minute += 30
      ) {
        const start = new Date(day)
        start.setMinutes(minute)

        const end = new Date(day)
        end.setMinutes(minute + 30)

        // Skip past slots and abnormal intervals around clock changes.
        if (
          start.getTime() >= now.getTime() &&
          end.getTime() - start.getTime() === 30 * 60 * 1000
        ) {
          slots.set(start.getTime(), end.getTime())
        }
      }
    }
  }

  const availableSlots = [...slots.entries()]
    .map(([start, end]) => ({ start, end }))
    .sort((a, b) => a.start - b.start)

  const tasks = assignments
    .map((assignment) => {
      const hours = Number(assignment.effort_hours)

      if (!Number.isFinite(hours) || hours <= 0) {
        throw new Error(
          `Enter a positive effort estimate for "${assignment.title}".`
        )
      }

      return {
        ...assignment,
        deadline: getDeadline(assignment.due_date),
        requiredMinutes: Math.ceil(hours * 60),
      }
    })
    .sort((a, b) => a.deadline - b.deadline)

  const usedSlots = new Set<number>()

  for (const task of tasks) {
    let remainingMinutes = task.requiredMinutes

    for (const slot of availableSlots) {
      if (remainingMinutes === 0) break
      if (usedSlots.has(slot.start)) continue

      const duration = Math.min(30, remainingMinutes)
      const end = slot.start + duration * 60 * 1000

      if (end > task.deadline) continue

      blocks.push({
        assignmentId: task.id,
        title: task.title,
        start: new Date(slot.start).toISOString(),
        end: new Date(end).toISOString(),
      })

      usedSlots.add(slot.start)
      remainingMinutes -= duration
    }

    if (remainingMinutes > 0) {
      unscheduled.push({
        assignmentId: task.id,
        title: task.title,
        remainingMinutes,
      })
    }
  }

  blocks.sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  )

  return { blocks, unscheduled }
}
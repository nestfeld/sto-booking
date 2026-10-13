'use client'

import { useState } from 'react'

type DateCalendarProps = {
  value: string
  min: string
  max: string
  onChange: (value: string) => void
}

type CalendarMonth = {
  year: number
  month: number
}

const monthNames = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
]

const monthNamesGenitive = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
]

const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

function parseDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return { year, month: month - 1, day }
}

function toIsoDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function monthIndex({ year, month }: CalendarMonth) {
  return year * 12 + month
}

function moveMonth(current: CalendarMonth, offset: number): CalendarMonth {
  const next = current.month + offset
  return {
    year: current.year + Math.floor(next / 12),
    month: ((next % 12) + 12) % 12,
  }
}

export function DateCalendar({ value, min, max, onChange }: DateCalendarProps) {
  const selectedDate = parseDate(value)
  const minDate = parseDate(min)
  const maxDate = parseDate(max)
  const [visibleMonth, setVisibleMonth] = useState<CalendarMonth>({
    year: selectedDate.year,
    month: selectedDate.month,
  })

  const firstWeekDay = (new Date(visibleMonth.year, visibleMonth.month, 1).getDay() + 6) % 7
  const daysInMonth = new Date(visibleMonth.year, visibleMonth.month + 1, 0).getDate()
  const cells = Array.from(
    { length: Math.ceil((firstWeekDay + daysInMonth) / 7) * 7 },
    (_, index) => {
      const day = index - firstWeekDay + 1
      return day > 0 && day <= daysInMonth ? day : null
    },
  )

  const currentMonthIndex = monthIndex(visibleMonth)
  const canGoBack = currentMonthIndex > monthIndex(minDate)
  const canGoForward = currentMonthIndex < monthIndex(maxDate)

  return (
    <div className="booking-calendar" aria-label="Календарь даты визита">
      <div className="booking-calendar__header">
        <button
          type="button"
          aria-label="Предыдущий месяц"
          disabled={!canGoBack}
          onClick={() => setVisibleMonth((current) => moveMonth(current, -1))}
        >
          ←
        </button>
        <strong>
          {monthNames[visibleMonth.month]} <span>{visibleMonth.year}</span>
        </strong>
        <button
          type="button"
          aria-label="Следующий месяц"
          disabled={!canGoForward}
          onClick={() => setVisibleMonth((current) => moveMonth(current, 1))}
        >
          →
        </button>
      </div>

      <div className="booking-calendar__weekdays" aria-hidden="true">
        {weekDays.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="booking-calendar__days">
        {cells.map((day, index) => {
          if (!day) return <span key={`empty-${index}`} aria-hidden="true" />

          const isoDate = toIsoDate(visibleMonth.year, visibleMonth.month, day)
          const isDisabled = isoDate < min || isoDate > max
          const isSelected = isoDate === value
          const isToday = isoDate === min

          return (
            <button
              type="button"
              key={isoDate}
              className={`${isSelected ? 'is-selected' : ''} ${isToday ? 'is-today' : ''}`.trim()}
              aria-label={`${day} ${monthNamesGenitive[visibleMonth.month]} ${visibleMonth.year}`}
              aria-pressed={isSelected}
              disabled={isDisabled}
              onClick={() => onChange(isoDate)}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}

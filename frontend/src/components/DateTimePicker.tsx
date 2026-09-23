import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, X } from 'lucide-react';

const weekdays = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];
const pad = (value: number) => String(value).padStart(2, '0');

function formatTimeInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
}

function isValidTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function parseValue(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function monthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function sameDay(left: Date | null, right: Date) {
  return !!left &&
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate();
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function formatMonth(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date);
}

function toLocalIso(date: Date, hour: number, minute: number) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hour,
    minute,
  ).toISOString();
}

function calendarDays(month: Date) {
  const first = monthStart(month);
  const mondayOffset = (first.getDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, index) =>
    new Date(month.getFullYear(), month.getMonth(), index - mondayOffset + 1),
  );
}

export function DateTimePicker({
  id,
  label,
  value,
  onChange,
  onBlur,
  controlRef,
}: {
  id: string;
  label: string;
  value?: string | null;
  onChange: (value: string | null) => void;
  onBlur?: () => void;
  controlRef?: (element: HTMLButtonElement | null) => void;
}) {
  const selected = parseValue(value);
  const [open, setOpen] = useState(false);
  const [timeDraft, setTimeDraft] = useState('');
  const [visibleMonth, setVisibleMonth] = useState(() => monthStart(selected ?? new Date()));
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const days = useMemo(() => calendarDays(visibleMonth), [visibleMonth]);
  const selectedTime = selected ? `${pad(selected.getHours())}:${pad(selected.getMinutes())}` : '';
  const today = new Date();

  useEffect(() => {
    if (!open) return;
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (event.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled)',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (document.activeElement === dialogRef.current) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', keyboard);
    dialogRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', keyboard);
    };
  }, [open]);

  function openPicker() {
    if (!open) {
      setVisibleMonth(monthStart(selected ?? new Date()));
      setTimeDraft(selectedTime);
    }
    setOpen(true);
  }

  function chooseDay(day: Date) {
    const draftMatches = isValidTime(timeDraft)
      ? /^(\d{2}):(\d{2})$/.exec(timeDraft)
      : null;
    const hour = draftMatches ? Number(draftMatches[1]) : selected?.getHours() ?? 0;
    const minute = draftMatches ? Number(draftMatches[2]) : selected?.getMinutes() ?? 0;
    setTimeDraft(`${pad(hour)}:${pad(minute)}`);
    onChange(toLocalIso(day, hour, minute));
    setVisibleMonth(monthStart(day));
  }

  function chooseTime(time: string) {
    if (!selected || !isValidTime(time)) return;
    const [hour, minute] = time.split(':').map(Number);
    onChange(toLocalIso(selected, hour, minute));
  }

  const validTimeDraft = isValidTime(timeDraft);

  return (
    <div className={`admin-datetime ${open ? 'is-open' : ''}`} ref={rootRef}>
      <div className="admin-datetime-trigger">
        <button
          ref={(element) => {
            triggerRef.current = element;
            controlRef?.(element);
          }}
          className="admin-datetime-date"
          type="button"
          aria-label={`${label}: ${selected ? formatDate(selected) : 'escolher data'}`}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={`${id}-calendar`}
          onClick={openPicker}
          onBlur={onBlur}
        >
          <CalendarDays size={18} aria-hidden="true" />
          <span>{selected ? formatDate(selected) : 'Escolher data'}</span>
        </button>
        <button
          className="admin-datetime-time"
          type="button"
          aria-label={`${label}: horário ${selectedTime || 'não definido'}, abrir seletor`}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={`${id}-calendar`}
          onClick={openPicker}
          onBlur={onBlur}
        >
          <Clock3 size={17} aria-hidden="true" />
          <span>{selectedTime || 'Horário'}</span>
        </button>
      </div>
      {open && (
        createPortal(
          <>
          <button
            className="admin-datetime-backdrop"
            type="button"
            aria-label="Fechar seletor de data e hora"
            tabIndex={-1}
            onClick={() => {
              setOpen(false);
              triggerRef.current?.focus();
            }}
          />
          <div
            className="admin-datetime-popover"
            id={`${id}-calendar`}
            role="dialog"
            aria-label={`Selecionar data e hora: ${label}`}
            aria-modal="true"
            tabIndex={-1}
            ref={dialogRef}
          >
            <section className="admin-datetime-calendar" aria-label="Calendário">
            <header className="admin-datetime-month">
              <button
                type="button"
                aria-label="Mês anterior"
                onClick={() =>
                  setVisibleMonth(
                    (month) => new Date(month.getFullYear(), month.getMonth() - 1, 1),
                  )
                }
              >
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
              <h3>{formatMonth(visibleMonth)}</h3>
              <button
                type="button"
                aria-label="Próximo mês"
                onClick={() =>
                  setVisibleMonth(
                    (month) => new Date(month.getFullYear(), month.getMonth() + 1, 1),
                  )
                }
              >
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </header>
            <div className="admin-datetime-weekdays" aria-hidden="true">
              {weekdays.map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
            <div className="admin-datetime-days">
              {days.map((day) => {
                const isCurrentMonth = day.getMonth() === visibleMonth.getMonth();
                const isSelected = sameDay(selected, day);
                const isToday = sameDay(today, day);
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    className={[
                      'admin-datetime-day',
                      isCurrentMonth ? '' : 'is-outside',
                      isSelected ? 'is-selected' : '',
                      isToday ? 'is-today' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    aria-label={new Intl.DateTimeFormat('pt-BR', {
                      dateStyle: 'full',
                    }).format(day)}
                    aria-pressed={isSelected}
                    aria-current={isToday ? 'date' : undefined}
                    onClick={() => chooseDay(day)}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              className="admin-datetime-clear"
              onClick={() => {
                onChange(null);
                setOpen(false);
                triggerRef.current?.focus();
              }}
            >
              <X size={14} aria-hidden="true" />
              Limpar data
            </button>
            </section>
            <section className="admin-datetime-times" aria-label="Horário">
              <h3>Horário</h3>
              {selected ? (
                <>
                  <label className="admin-datetime-time-entry">
                    <Clock3 size={17} aria-hidden="true" />
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={5}
                      placeholder="HH:MM"
                      value={timeDraft}
                      aria-label="Horário"
                      aria-invalid={!validTimeDraft}
                      onBlur={onBlur}
                      onFocus={(event) => event.currentTarget.select()}
                      onChange={(event) => {
                        const nextTime = formatTimeInput(event.currentTarget.value);
                        setTimeDraft(nextTime);
                        chooseTime(nextTime);
                      }}
                    />
                  </label>
                  {timeDraft && !validTimeDraft && (
                    <p className="admin-datetime-time-error" role="status">
                      Use o formato 24 horas, como 21:30.
                    </p>
                  )}
                  <button
                    className="admin-datetime-done"
                    type="button"
                    disabled={!validTimeDraft}
                    onClick={() => {
                      setOpen(false);
                      triggerRef.current?.focus();
                    }}
                  >
                    Concluir
                  </button>
                </>
              ) : (
                <p>Escolha uma data para definir o horário.</p>
              )}
            </section>
          </div>
          </>,
          document.body,
        )
      )}
    </div>
  );
}

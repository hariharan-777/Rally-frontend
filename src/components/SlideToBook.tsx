import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'

type Props = {
  onComplete: () => void
}

const KNOB_SIZE = 32 // px — keep in sync with .slide-to-book__knob in index.css
const TRACK_PADDING = 4 // px gap between the knob and the track edge
const COMPLETE_AT = 0.9 // drag at least 90% of the way to confirm

// "Slide to book": drag the knob to the right end to confirm. A fire trail fills the track
// behind the knob as it moves, and the "Book now" label fades out as it goes.
// Keyboard users can press Enter/Space on the knob instead of dragging.
export function SlideToBook({ onComplete }: Props) {
  const track = useRef<HTMLDivElement>(null)
  const [offset, setOffset] = useState(0) // how far the knob has moved, in px
  const [dragging, setDragging] = useState(false)
  const [done, setDone] = useState(false)
  const dragStart = useRef(0) // pointer x minus knob offset when the drag began
  // The knob's full travel distance, measured when a drag starts. Kept in state (not read from the
  // ref while rendering) so the label's fade can use it — React wants render to use only props/state.
  const [travel, setTravel] = useState(0)

  // The furthest the knob can travel: track width minus the knob and the padding on both sides.
  const maxOffset = () => (track.current ? track.current.clientWidth - KNOB_SIZE - TRACK_PADDING * 2 : 0)

  function finish() {
    const max = maxOffset()
    setTravel(max)
    setOffset(max)
    setDone(true)
    setTimeout(onComplete, 250) // let the knob settle at the end before moving on
  }

  function onPointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (done) return
    // Keep receiving move/up events even if the finger slides off the knob.
    event.currentTarget.setPointerCapture(event.pointerId)
    dragStart.current = event.clientX - offset
    setTravel(maxOffset())
    setDragging(true)
  }

  function onPointerMove(event: PointerEvent<HTMLButtonElement>) {
    if (!dragging) return
    const next = event.clientX - dragStart.current
    setOffset(Math.min(maxOffset(), Math.max(0, next))) // stay inside the track
  }

  function onPointerUp() {
    if (!dragging) return
    setDragging(false)
    if (offset >= maxOffset() * COMPLETE_AT) finish()
    else setOffset(0) // not far enough → spring back (the CSS transition animates it)
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (!done && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault()
      finish()
    }
  }

  return (
    <div ref={track} className={`slide-to-book${dragging ? ' is-dragging' : ''}${done ? ' is-done' : ''}`}>
      {/* Fire trail: always as wide as the distance the knob has travelled (+ the knob itself). */}
      <div className="slide-to-book__fire" style={{ width: offset + KNOB_SIZE + TRACK_PADDING }} />

      {/* Fades out as the knob moves: fully visible at the start, gone at the end.
          progress = how far along the knob is, from 0 to 1. */}
      <span className="slide-to-book__label" aria-hidden="true" style={{ opacity: travel ? 1 - offset / travel : 1 }}>
        Book now
      </span>

      <button
        type="button"
        className="slide-to-book__knob"
        style={{ transform: `translateX(${offset}px)` }}
        aria-label="Book now — slide right, or press Enter"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path d="M6 6 L12 12 L6 18 M12 6 L18 12 L12 18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  )
}

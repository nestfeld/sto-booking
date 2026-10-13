'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export function useCarousel(itemCount: number) {
  const trackRef = useRef<HTMLDivElement>(null)
  const scrollTimeoutRef = useRef<number | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(
    () => () => {
      if (scrollTimeoutRef.current !== null) {
        window.clearTimeout(scrollTimeoutRef.current)
      }
    },
    [],
  )

  const goToSlide = useCallback(
    (index: number) => {
      if (itemCount === 0) return

      const normalizedIndex = (index + itemCount) % itemCount
      const slide = trackRef.current?.children.item(normalizedIndex)

      slide?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' })
      setActiveIndex(normalizedIndex)
    },
    [itemCount],
  )

  const updateActiveSlide = useCallback(() => {
    if (scrollTimeoutRef.current !== null) {
      window.clearTimeout(scrollTimeoutRef.current)
    }

    scrollTimeoutRef.current = window.setTimeout(() => {
      const track = trackRef.current
      if (!track || track.children.length === 0) return

      const slides = Array.from(track.children) as HTMLElement[]
      const closestIndex = slides.reduce((closest, slide, index) => {
        const currentDistance = Math.abs(slide.offsetLeft - track.scrollLeft)
        const closestDistance = Math.abs(slides[closest].offsetLeft - track.scrollLeft)

        return currentDistance < closestDistance ? index : closest
      }, 0)

      setActiveIndex((currentIndex) =>
        currentIndex === closestIndex ? currentIndex : closestIndex,
      )
      scrollTimeoutRef.current = null
    }, 100)
  }, [])

  const safeActiveIndex = itemCount === 0 ? 0 : Math.min(activeIndex, itemCount - 1)

  return {
    activeIndex: safeActiveIndex,
    goToSlide,
    trackRef,
    updateActiveSlide,
  }
}

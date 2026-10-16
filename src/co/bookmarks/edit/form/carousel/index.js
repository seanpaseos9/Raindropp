import s from './carousel.module.styl'
import React, { useState, useRef, useCallback, useEffect } from 'react'

function CarouselSlide({ item, index, onOpenLightbox }) {
    const [loading, setLoading] = useState(true)
    const [hasError, setHasError] = useState(false)
    const [src, setSrc] = useState(item.url)

    const onLoad = useCallback(() => {
        setLoading(false)
        setHasError(false)
    }, [])

    const onError = useCallback(() => {
        if (item.fallbackUrl && src !== item.fallbackUrl) {
            setSrc(item.fallbackUrl)
            setLoading(true)
        } else {
            setLoading(false)
            setHasError(true)
        }
    }, [item.fallbackUrl, src])

    const handleClick = useCallback(() => {
        onOpenLightbox && onOpenLightbox(index)
    }, [onOpenLightbox, index])

    return (
        <div 
            className={s.slide} 
            onClick={handleClick}
            role='button'
            tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter') handleClick() }}
            title={item.alt || 'Click to enlarge image'}>
            
            {loading && <div className={s.shimmer} />}

            {hasError ? (
                <div className={s.errorCard}>
                    <svg viewBox='0 0 24 24'>
                        <path d='M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z' />
                    </svg>
                    <span>Image preview unavailable</span>
                </div>
            ) : (
                <img
                    className={s.image}
                    src={src}
                    alt={item.alt || 'Bookmark image'}
                    loading='lazy'
                    onLoad={onLoad}
                    onError={onError}
                    draggable={false}
                />
            )}

            <div className={s.enlargeHint}>
                <svg viewBox='0 0 24 24'>
                    <path d='M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zm.5-7v2h2v1h-2v2h-1v-2h-2V9h2V7h1z' />
                </svg>
                <span>Tap to enlarge</span>
            </div>
        </div>
    )
}

export default function NoteCarousel({ images = [], onOpenLightbox }) {
    const [currentIndex, setCurrentIndex] = useState(0)
    const trackRef = useRef(null)
    const isScrollingRef = useRef(false)
    const total = images.length

    // Scroll listener to update active index indicator smoothly
    const onScroll = useCallback(() => {
        if (!trackRef.current) return
        const { scrollLeft, clientWidth } = trackRef.current
        if (clientWidth === 0) return

        const newIndex = Math.round(scrollLeft / clientWidth)
        if (newIndex >= 0 && newIndex < total && newIndex !== currentIndex) {
            setCurrentIndex(newIndex)
        }
    }, [total, currentIndex])

    const scrollToIndex = useCallback((index) => {
        if (!trackRef.current) return
        const width = trackRef.current.clientWidth
        trackRef.current.scrollTo({
            left: index * width,
            behavior: 'smooth'
        })
        setCurrentIndex(index)
    }, [])

    const handlePrev = useCallback((e) => {
        e.stopPropagation()
        const targetIndex = (currentIndex - 1 + total) % total
        scrollToIndex(targetIndex)
    }, [currentIndex, total, scrollToIndex])

    const handleNext = useCallback((e) => {
        e.stopPropagation()
        const targetIndex = (currentIndex + 1) % total
        scrollToIndex(targetIndex)
    }, [currentIndex, total, scrollToIndex])

    // Mouse drag support on desktop for intuitive swiping
    const isDownRef = useRef(false)
    const startXRef = useRef(0)
    const scrollLeftRef = useRef(0)
    const hasDraggedRef = useRef(false)

    const onMouseDown = useCallback((e) => {
        if (!trackRef.current) return
        isDownRef.current = true
        hasDraggedRef.current = false
        startXRef.current = e.pageX - trackRef.current.offsetLeft
        scrollLeftRef.current = trackRef.current.scrollLeft
    }, [])

    const onMouseMove = useCallback((e) => {
        if (!isDownRef.current || !trackRef.current) return
        e.preventDefault()
        const x = e.pageX - trackRef.current.offsetLeft
        const walk = (x - startXRef.current) * 1.5
        if (Math.abs(walk) > 5) {
            hasDraggedRef.current = true
        }
        trackRef.current.scrollLeft = scrollLeftRef.current - walk
    }, [])

    const onMouseUp = useCallback(() => {
        isDownRef.current = false
    }, [])

    if (!images || images.length === 0) return null

    return (
        <div className={s.container}>
            {/* Top-right pagination pill (e.g., "1 / 4") */}
            {total > 1 && (
                <div className={s.badge}>
                    {currentIndex + 1} / {total}
                </div>
            )}

            {/* Desktop Previous Button */}
            {total > 1 && (
                <button
                    type='button'
                    className={`${s.arrow} ${s.arrowPrev}`}
                    onClick={handlePrev}
                    title='Previous image'>
                    <svg viewBox='0 0 24 24'>
                        <path d='M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z' />
                    </svg>
                </button>
            )}

            {/* Horizontal Scrollable Track */}
            <div
                ref={trackRef}
                className={s.track}
                onScroll={onScroll}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseUp}>
                {images.map((item, i) => (
                    <CarouselSlide
                        key={item.url + '_' + i}
                        item={item}
                        index={i}
                        onOpenLightbox={(idx) => {
                            // Only trigger lightbox if not actively dragging
                            if (!hasDraggedRef.current) {
                                onOpenLightbox && onOpenLightbox(idx)
                            }
                        }}
                    />
                ))}
            </div>

            {/* Desktop Next Button */}
            {total > 1 && (
                <button
                    type='button'
                    className={`${s.arrow} ${s.arrowNext}`}
                    onClick={handleNext}
                    title='Next image'>
                    <svg viewBox='0 0 24 24'>
                        <path d='M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z' />
                    </svg>
                </button>
            )}

            {/* Bottom Progress Dots */}
            {total > 1 && (
                <div className={s.dots}>
                    {images.map((_, i) => (
                        <button
                            key={i}
                            type='button'
                            className={`${s.dot} ${i === currentIndex ? s.dotActive : ''}`}
                            onClick={(e) => {
                                e.stopPropagation()
                                scrollToIndex(i)
                            }}
                            title={`Go to image ${i + 1}`}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

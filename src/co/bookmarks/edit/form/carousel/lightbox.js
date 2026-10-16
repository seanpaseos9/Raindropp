import s from './lightbox.module.styl'
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Portal } from 'react-portal'

export default function Lightbox({ images = [], initialIndex = 0, onClose }) {
    const [index, setIndex] = useState(initialIndex)
    const [isZoomed, setIsZoomed] = useState(false)
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
    const [isDragging, setIsDragging] = useState(false)
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
    const [loading, setLoading] = useState(true)
    const [hasError, setHasError] = useState(false)
    const [currentSrc, setCurrentSrc] = useState('')

    const total = images.length
    const currentImage = images[index] || {}

    // Reset zoom and pan on slide change
    useEffect(() => {
        setIsZoomed(false)
        setPanOffset({ x: 0, y: 0 })
        setLoading(true)
        setHasError(false)
        setCurrentSrc(currentImage.url || '')
    }, [index, currentImage.url])

    const nextSlide = useCallback(() => {
        if (total <= 1) return
        setIndex(i => (i + 1) % total)
    }, [total])

    const prevSlide = useCallback(() => {
        if (total <= 1) return
        setIndex(i => (i - 1 + total) % total)
    }, [total])

    const toggleZoom = useCallback((e) => {
        if (e && e.stopPropagation) e.stopPropagation()
        setIsZoomed(z => {
            if (z) setPanOffset({ x: 0, y: 0 })
            return !z
        })
    }, [])

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault()
                onClose && onClose()
            } else if (e.key === 'ArrowRight') {
                e.preventDefault()
                nextSlide()
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault()
                prevSlide()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [onClose, nextSlide, prevSlide])

    // Lock body scroll while lightbox is open
    useEffect(() => {
        const originalOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = originalOverflow
        }
    }, [])

    // Touch gesture handling: swipe to navigate or pull-down to close
    const touchStartRef = useRef(null)

    const onTouchStart = useCallback((e) => {
        if (isZoomed) return
        if (e.touches && e.touches.length === 1) {
            touchStartRef.current = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY,
                time: Date.now()
            }
        }
    }, [isZoomed])

    const onTouchEnd = useCallback((e) => {
        if (isZoomed || !touchStartRef.current) return
        if (e.changedTouches && e.changedTouches.length === 1) {
            const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x
            const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y
            const deltaTime = Date.now() - touchStartRef.current.time

            // Horizontal swipe to navigate
            if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) && deltaTime < 400) {
                if (deltaX < 0) {
                    nextSlide()
                } else {
                    prevSlide()
                }
            }
            // Vertical swipe down to close
            else if (deltaY > 80 && Math.abs(deltaY) > Math.abs(deltaX) * 1.5 && deltaTime < 500) {
                onClose && onClose()
            }
        }
        touchStartRef.current = null
    }, [isZoomed, nextSlide, prevSlide, onClose])

    // Pan handling when zoomed
    const onMouseDown = useCallback((e) => {
        if (!isZoomed) return
        setIsDragging(true)
        setDragStart({
            x: e.clientX - panOffset.x,
            y: e.clientY - panOffset.y
        })
    }, [isZoomed, panOffset])

    const onMouseMove = useCallback((e) => {
        if (!isDragging || !isZoomed) return
        setPanOffset({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        })
    }, [isDragging, isZoomed, dragStart])

    const onMouseUp = useCallback(() => {
        setIsDragging(false)
    }, [])

    // Handle image load error: try fallback URL if available
    const handleImageError = useCallback(() => {
        if (currentImage.fallbackUrl && currentSrc !== currentImage.fallbackUrl) {
            setCurrentSrc(currentImage.fallbackUrl)
            setLoading(true)
        } else {
            setLoading(false)
            setHasError(true)
        }
    }, [currentImage.fallbackUrl, currentSrc])

    const handleImageLoaded = useCallback(() => {
        setLoading(false)
        setHasError(false)
    }, [])

    return (
        <Portal>
            <div 
                className={s.overlay} 
                onClick={onClose}
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}>
                
                {/* Header bar */}
                <div className={s.header} onClick={e => e.stopPropagation()}>
                    <div className={s.counter}>
                        <span>{index + 1} / {total}</span>
                    </div>

                    <div className={s.actions}>
                        {/* Zoom toggle button */}
                        <button 
                            type='button' 
                            className={`${s.btn} ${isZoomed ? s.btnActive : ''}`} 
                            onClick={toggleZoom}
                            title={isZoomed ? 'Zoom Out' : 'Zoom In'}>
                            <svg viewBox='0 0 24 24'>
                                {isZoomed ? (
                                    <path d='M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zM7 9h5v1H7z' />
                                ) : (
                                    <path d='M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zm.5-7v2h2v1h-2v2h-1v-2h-2V9h2V7h1z' />
                                )}
                            </svg>
                        </button>

                        {/* Open in new tab button */}
                        <a 
                            className={s.btn} 
                            href={currentImage.originalUrl || currentSrc} 
                            target='_blank' 
                            rel='noopener noreferrer'
                            title='Open image in new tab'
                            onClick={e => e.stopPropagation()}>
                            <svg viewBox='0 0 24 24'>
                                <path d='M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z' />
                            </svg>
                        </a>

                        {/* Close button */}
                        <button 
                            type='button' 
                            className={s.btn} 
                            onClick={onClose}
                            title='Close (Esc)'>
                            <svg viewBox='0 0 24 24'>
                                <path d='M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z' />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Viewport Stage */}
                <div 
                    className={s.stage} 
                    data-zoomed={isZoomed} 
                    data-dragging={isDragging}
                    onClick={e => {
                        // Clicking stage background closes; clicking image toggles zoom
                        if (e.target === e.currentTarget) {
                            onClose && onClose()
                        }
                    }}>
                    
                    {/* Previous button */}
                    {total > 1 && (
                        <button 
                            type='button' 
                            className={`${s.navBtn} ${s.navPrev}`} 
                            onClick={e => { e.stopPropagation(); prevSlide() }}
                            title='Previous image (Left Arrow)'>
                            <svg viewBox='0 0 24 24'>
                                <path d='M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z' />
                            </svg>
                        </button>
                    )}

                    {/* Image or Loading / Error */}
                    {loading && <div className={s.loadingSpinner} />}

                    {hasError ? (
                        <div className={s.errorState} onClick={e => e.stopPropagation()}>
                            <p>Unable to load preview for this image.</p>
                            <a 
                                href={currentImage.originalUrl || currentSrc} 
                                target='_blank' 
                                rel='noopener noreferrer'>
                                Open original link
                            </a>
                        </div>
                    ) : (
                        <div 
                            className={s.imageWrap}
                            onMouseDown={onMouseDown}
                            onClick={toggleZoom}>
                            <img
                                key={currentSrc}
                                className={s.image}
                                src={currentSrc}
                                alt={currentImage.alt || 'Bookmark image'}
                                style={{
                                    transform: isZoomed 
                                        ? `scale(2.2) translate(${panOffset.x / 2.2}px, ${panOffset.y / 2.2}px)`
                                        : 'none',
                                    cursor: isZoomed ? 'grab' : 'zoom-in'
                                }}
                                onLoad={handleImageLoaded}
                                onError={handleImageError}
                                draggable={false}
                            />
                        </div>
                    )}

                    {/* Next button */}
                    {total > 1 && (
                        <button 
                            type='button' 
                            className={`${s.navBtn} ${s.navNext}`} 
                            onClick={e => { e.stopPropagation(); nextSlide() }}
                            title='Next image (Right Arrow)'>
                            <svg viewBox='0 0 24 24'>
                                <path d='M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z' />
                            </svg>
                        </button>
                    )}
                </div>

                {/* Footer caption */}
                {currentImage.alt && currentImage.alt !== 'Bookmark image' && (
                    <div className={s.footer} onClick={e => e.stopPropagation()}>
                        <span className={s.altText}>{currentImage.alt}</span>
                    </div>
                )}
            </div>
        </Portal>
    )
}

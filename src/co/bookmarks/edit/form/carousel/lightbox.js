import React, { useState, useEffect, useCallback, useRef } from 'react'
import ReactDOM from 'react-dom'
import s from './lightbox.module.styl'
import StarRating from './rating'
import { handleImageLoadError } from './helper'

export default function Lightbox({ images = [], initialIndex = 0, onClose, onUpdateRating, onUpdateCaption, onDeleteImage }) {
    const [index, setIndex] = useState(initialIndex)
    const [zoom, setZoom] = useState(1)
    const [offset, setOffset] = useState({ x: 0, y: 0 })
    const [isDragging, setIsDragging] = useState(false)
    const [isEditingCaption, setIsEditingCaption] = useState(false)
    const [editCaptionValue, setEditCaptionValue] = useState('')

    const dragStartRef = useRef({ x: 0, y: 0 })
    const touchStartRef = useRef({ x: 0, y: 0, time: 0 })
    const pinchDistanceRef = useRef(null)

    const total = images.length
    const current = images[index] || {}

    // Reset zoom and caption editing when switching images
    useEffect(() => {
        setZoom(1)
        setOffset({ x: 0, y: 0 })
        setIsEditingCaption(false)
    }, [index])

    const goPrev = useCallback((e) => {
        if (e) e.stopPropagation()
        setIndex(i => (i > 0 ? i - 1 : total - 1))
    }, [total])

    const goNext = useCallback((e) => {
        if (e) e.stopPropagation()
        setIndex(i => (i < total - 1 ? i + 1 : 0))
    }, [total])

    const zoomIn = useCallback((e) => {
        if (e) e.stopPropagation()
        setZoom(z => Math.min(3, +(z + 0.5).toFixed(1)))
    }, [])

    const zoomOut = useCallback((e) => {
        if (e) e.stopPropagation()
        setZoom(z => {
            const next = Math.max(1, +(z - 0.5).toFixed(1))
            if (next === 1) setOffset({ x: 0, y: 0 })
            return next
        })
    }, [])

    const resetZoom = useCallback((e) => {
        if (e) e.stopPropagation()
        setZoom(1)
        setOffset({ x: 0, y: 0 })
    }, [])

    // Keyboard navigation
    useEffect(() => {
        const onKeyDown = (e) => {
            if (isEditingCaption) {
                if (e.key === 'Escape') setIsEditingCaption(false)
                return
            }
            if (e.key === 'Escape') {
                onClose()
            } else if (e.key === 'ArrowLeft') {
                goPrev()
            } else if (e.key === 'ArrowRight') {
                goNext()
            } else if (e.key === '+' || e.key === '=') {
                zoomIn()
            } else if (e.key === '-') {
                zoomOut()
            }
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [onClose, goPrev, goNext, zoomIn, zoomOut, isEditingCaption])

    // Touch events for mobile pinch-to-zoom and swiping left/right
    const onTouchStart = (e) => {
        if (e.touches.length === 2) {
            // Prevent whole-page zooming on mobile
            if (e.cancelable) e.preventDefault()
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            )
            pinchDistanceRef.current = { dist, initialZoom: zoom }
            return
        }

        if (e.touches.length === 1) {
            touchStartRef.current = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY,
                time: Date.now()
            }
            if (zoom > 1) {
                dragStartRef.current = {
                    x: e.touches[0].clientX - offset.x,
                    y: e.touches[0].clientY - offset.y
                }
            }
        }
    }

    const onTouchMove = (e) => {
        // Pinch-to-zoom scaling
        if (e.touches.length === 2 && pinchDistanceRef.current) {
            if (e.cancelable) e.preventDefault()
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            )
            const factor = dist / (pinchDistanceRef.current.dist || 1)
            const nextZoom = Math.min(3.5, Math.max(1, +(pinchDistanceRef.current.initialZoom * factor).toFixed(2)))
            setZoom(nextZoom)
            return
        }

        // Dragging when zoomed
        if (zoom > 1 && e.touches.length === 1) {
            setOffset({
                x: e.touches[0].clientX - dragStartRef.current.x,
                y: e.touches[0].clientY - dragStartRef.current.y
            })
        }
    }

    const onTouchEnd = (e) => {
        if (pinchDistanceRef.current) {
            pinchDistanceRef.current = null
            if (zoom <= 1) setOffset({ x: 0, y: 0 })
            return
        }

        if (zoom === 1 && e.changedTouches.length === 1) {
            const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x
            const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y
            const deltaTime = Date.now() - touchStartRef.current.time

            if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) && deltaTime < 400) {
                if (deltaX < 0) {
                    goNext()
                } else {
                    goPrev()
                }
            } else if (deltaY > 100 && Math.abs(deltaY) > Math.abs(deltaX) * 1.5) {
                onClose()
            }
        }
    }

    // Mouse drag for zoomed image
    const onMouseDown = (e) => {
        if (zoom > 1) {
            e.preventDefault()
            setIsDragging(true)
            dragStartRef.current = {
                x: e.clientX - offset.x,
                y: e.clientY - offset.y
            }
        }
    }

    const onMouseMove = (e) => {
        if (isDragging && zoom > 1) {
            setOffset({
                x: e.clientX - dragStartRef.current.x,
                y: e.clientY - dragStartRef.current.y
            })
        }
    }

    const onMouseUp = () => {
        setIsDragging(false)
    }

    // Double click to toggle zoom
    const onDoubleClick = (e) => {
        e.stopPropagation()
        if (zoom > 1) {
            resetZoom()
        } else {
            setZoom(2)
        }
    }

    const handleSaveCaption = (e) => {
        if (e) {
            e.preventDefault()
            e.stopPropagation()
        }
        if (onUpdateCaption) {
            onUpdateCaption(current, editCaptionValue.trim())
        }
        setIsEditingCaption(false)
    }

    if (typeof document === 'undefined') return null

    return ReactDOM.createPortal(
        <div 
            className={s.overlay} 
            onClick={onClose}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}>
            
            {/* Top Bar */}
            <div className={s.topbar} onClick={e => e.stopPropagation()}>
                <div className={s.titleArea}>
                    <span className={s.counter}>{index + 1} / {total}</span>
                    
                    {!isEditingCaption ? (
                        <>
                            <span 
                                className={s.alt} 
                                title={current.caption || current.title || current.url}>
                                {current.caption ? `“${current.caption}”` : (current.title || current.source || 'Photo')}
                            </span>
                            {onUpdateCaption && (
                                <button
                                    type='button'
                                    className={s.inlineEditBtn}
                                    onClick={() => {
                                        setEditCaptionValue(current.caption || '')
                                        setIsEditingCaption(true)
                                    }}
                                    title='Edit caption or title'>
                                    ✏️
                                </button>
                            )}
                        </>
                    ) : (
                        <form className={s.lightboxCaptionForm} onSubmit={handleSaveCaption}>
                            <input
                                type='text'
                                autoFocus
                                value={editCaptionValue}
                                onChange={e => setEditCaptionValue(e.target.value)}
                                placeholder='Photo title or caption...'
                            />
                            <button type='submit' className={s.captionSaveBtn}>Save</button>
                            <button type='button' className={s.captionCancelBtn} onClick={() => setIsEditingCaption(false)}>✕</button>
                        </form>
                    )}

                    {/* Star Rating in Lightbox Header */}
                    <div style={{ marginLeft: '10px' }}>
                        <StarRating
                            rating={current.rating || 0}
                            size='small'
                            showText={true}
                            onChange={(score) => onUpdateRating && onUpdateRating(current, score)}
                        />
                    </div>
                </div>

                <div className={s.actions}>
                    {onDeleteImage && (
                        <button
                            type='button'
                            className={s.toolButton}
                            onClick={(e) => {
                                e.stopPropagation()
                                if (window.confirm('Delete this photo attachment? (🗑️)')) {
                                    onDeleteImage(current)
                                    if (total <= 1) {
                                        onClose()
                                    } else {
                                        goNext()
                                    }
                                }
                            }}
                            title='Delete photo (🗑️)'
                            style={{ color: '#ff3b30' }}>
                            🗑️ Delete
                        </button>
                    )}
                    <a
                        href={current.originalUrl || current.url}
                        target='_blank'
                        rel='noreferrer'
                        className={s.toolButton}
                        title='Open original in new tab'>
                        ↗ Open Original
                    </a>
                    <button
                        type='button'
                        className={s.closeButton}
                        onClick={onClose}
                        title='Close (Esc)'>
                        ✕
                    </button>
                </div>
            </div>

            {/* Main Stage */}
            <div 
                className={s.body} 
                onClick={e => {
                    if (e.target === e.currentTarget && zoom === 1) onClose()
                }}>
                {total > 1 && (
                    <button
                        type='button'
                        className={s.navPrev}
                        onClick={goPrev}
                        title='Previous Image'>
                        ‹
                    </button>
                )}

                <div 
                    className={s.stage}
                    onMouseDown={onMouseDown}
                    onDoubleClick={onDoubleClick}>
                    <img
                        key={current.url}
                        src={current.url}
                        alt={current.caption || current.title || 'Note Image'}
                        className={s.image}
                        referrerPolicy='no-referrer'
                            crossOrigin='anonymous'
                        style={{
                            transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${zoom})`,
                            cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in'
                        }}
                        onError={(e) => handleImageLoadError(e, current)}
                    />
                </div>

                {total > 1 && (
                    <button
                        type='button'
                        className={s.navNext}
                        onClick={goNext}
                        title='Next Image'>
                        ›
                    </button>
                )}
            </div>

            {/* Bottom Controls */}
            <div className={s.bottombar} onClick={e => e.stopPropagation()}>
                <button
                    type='button'
                    className={s.toolButton}
                    onClick={zoomOut}
                    disabled={zoom <= 1}
                    title='Zoom Out (-)'>
                    −
                </button>
                <span className={s.zoomBadge}>{Math.round(zoom * 100)}%</span>
                <button
                    type='button'
                    className={s.toolButton}
                    onClick={zoomIn}
                    disabled={zoom >= 3}
                    title='Zoom In (+)'>
                    +
                </button>
                {zoom > 1 && (
                    <button
                        type='button'
                        className={s.toolButton}
                        onClick={resetZoom}
                        title='Reset Zoom'>
                        Reset
                    </button>
                )}
                {/* Interactive Star Rating in Bottombar */}
                <div style={{ marginLeft: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '12px', opacity: 0.8 }}>Rate:</span>
                    <StarRating
                        rating={current.rating || 0}
                        size='medium'
                        showText={true}
                        onChange={(score) => onUpdateRating && onUpdateRating(current, score)}
                    />
                </div>
            </div>
        </div>,
        document.body
    )
}

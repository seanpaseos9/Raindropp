import React, { useState, useRef, useCallback, useEffect } from 'react'
import s from './index.module.styl'
import Lightbox from './lightbox'
import StarRating from './rating'
import { formatMultipleImageEntries, handleImageLoadError } from './helper'

export default function NoteImageCarousel({ images = [], onAddImage, onUpdateCaption, onUpdateRating }) {
    const [activeIndex, setActiveIndex] = useState(0)
    const [lightboxIndex, setLightboxIndex] = useState(null)
    const [showAddInput, setShowAddInput] = useState(false)
    const [newImageUrl, setNewImageUrl] = useState('')
    const [newImageCaption, setNewImageCaption] = useState('')
    const [newImageRating, setNewImageRating] = useState(0)
    const [editingCaptionIdx, setEditingCaptionIdx] = useState(null)
    const [editCaptionValue, setEditCaptionValue] = useState('')
    const [addFeedback, setAddFeedback] = useState('')

    const trackRef = useRef(null)
    const isProgrammaticScroll = useRef(false)
    const scrollTimeoutRef = useRef(null)

    // Mouse drag state
    const dragRef = useRef({
        isDown: false,
        startX: 0,
        startScrollLeft: 0,
        hasDragged: false,
        movedDistance: 0
    })

    const count = images.length

    // Scroll to specific index programmatically without feedback loop
    const scrollToIndex = useCallback((targetIndex) => {
        const track = trackRef.current
        if (!track) return

        const clampedIndex = Math.max(0, Math.min(count - 1, targetIndex))
        isProgrammaticScroll.current = true
        setActiveIndex(clampedIndex)

        const width = track.clientWidth || 1
        track.scrollTo({
            left: clampedIndex * width,
            behavior: 'smooth'
        })

        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
        scrollTimeoutRef.current = setTimeout(() => {
            isProgrammaticScroll.current = false
        }, 350)
    }, [count])

    // Track scroll listener to update active dot/index when user scrolls manually (touch swipe or trackpad)
    const handleScroll = useCallback(() => {
        if (isProgrammaticScroll.current || dragRef.current.isDown) return
        const track = trackRef.current
        if (!track) return

        const width = track.clientWidth || 1
        const scrollPos = track.scrollLeft
        const newIndex = Math.round(scrollPos / width)

        if (newIndex >= 0 && newIndex < count && newIndex !== activeIndex) {
            setActiveIndex(newIndex)
        }
    }, [count, activeIndex])

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
        }
    }, [])

    const goPrev = (e) => {
        if (e) {
            e.preventDefault()
            e.stopPropagation()
        }
        const prev = activeIndex > 0 ? activeIndex - 1 : count - 1
        scrollToIndex(prev)
    }

    const goNext = (e) => {
        if (e) {
            e.preventDefault()
            e.stopPropagation()
        }
        const next = activeIndex < count - 1 ? activeIndex + 1 : 0
        scrollToIndex(next)
    }

    // Desktop Mouse Drag Handlers: smooth dragging with window mouseup listener and disabled snap during drag
    const handleMouseDown = (e) => {
        if (e.button !== 0) return
        // Ignore clicks on buttons, inputs, links, or caption editor
        if (e.target.closest('button, input, textarea, a, form')) return

        const track = trackRef.current
        if (!track) return

        dragRef.current = {
            isDown: true,
            startX: e.clientX,
            startScrollLeft: track.scrollLeft,
            hasDragged: false,
            movedDistance: 0
        }

        // Disable CSS scroll-snap while dragging to eliminate jitter/rubberbanding
        track.style.scrollSnapType = 'none'
        track.style.scrollBehavior = 'auto'

        const onMouseMove = (moveEvent) => {
            if (!dragRef.current.isDown) return
            const dx = moveEvent.clientX - dragRef.current.startX
            dragRef.current.movedDistance = dx

            if (Math.abs(dx) > 5) {
                dragRef.current.hasDragged = true
                isProgrammaticScroll.current = true
                track.scrollLeft = dragRef.current.startScrollLeft - dx
            }
        }

        const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove)
            window.removeEventListener('mouseup', onMouseUp)

            if (!dragRef.current.isDown) return
            dragRef.current.isDown = false

            // Re-enable smooth snap
            track.style.scrollSnapType = 'x mandatory'
            track.style.scrollBehavior = 'smooth'

            if (dragRef.current.hasDragged) {
                const width = track.clientWidth || 1
                const dx = dragRef.current.movedDistance
                let target = activeIndex

                // Fast threshold: swipe threshold of 45px
                if (dx < -45 && activeIndex < count - 1) {
                    target = activeIndex + 1
                } else if (dx > 45 && activeIndex > 0) {
                    target = activeIndex - 1
                } else {
                    target = Math.round(track.scrollLeft / width)
                }

                isProgrammaticScroll.current = false
                scrollToIndex(target)

                setTimeout(() => {
                    dragRef.current.hasDragged = false
                }, 50)
            } else {
                dragRef.current.hasDragged = false
                isProgrammaticScroll.current = false
            }
        }

        window.addEventListener('mousemove', onMouseMove)
        window.addEventListener('mouseup', onMouseUp)
    }

    // Add Image submit (supports 1, 2, or more photos at once via newlines/commas)
    const handleAddSubmit = (e) => {
        if (e) e.preventDefault()
        const trimmedUrl = newImageUrl.trim()
        const trimmedCaption = newImageCaption.trim()
        if (!trimmedUrl || !onAddImage) return

        // Count how many valid image entries will be created
        const entries = formatMultipleImageEntries(trimmedUrl, trimmedCaption, newImageRating)
        if (!entries || !entries.length) {
            setAddFeedback('⚠️ No valid image URLs detected. Please paste a direct image URL or Google Drive link.')
            return
        }

        onAddImage(trimmedUrl, trimmedCaption, newImageRating)

        // Show feedback, clear form, then close
        const msg = entries.length > 1
            ? `✅ ${entries.length} photos added!`
            : '✅ Photo added!'
        setAddFeedback(msg)
        setNewImageUrl('')
        setNewImageCaption('')
        setNewImageRating(0)

        setTimeout(() => {
            setAddFeedback('')
            setShowAddInput(false)
        }, 1200)

        setTimeout(() => {
            const track = trackRef.current
            if (track) {
                track.scrollTo({ left: track.scrollWidth, behavior: 'smooth' })
            }
        }, 300)
    }

    // Caption edit save
    const handleSaveCaption = (img, e) => {
        if (e) {
            e.preventDefault()
            e.stopPropagation()
        }
        if (onUpdateCaption) {
            onUpdateCaption(img, editCaptionValue.trim())
        }
        setEditingCaptionIdx(null)
    }

    if (count === 0) return null

    return (
        <div className={s.wrapper}>
            {/* Header: Title, Add Button, Counter Badge */}
            <div className={s.header}>
                <div className={s.headerTitle}>
                    <span>📷 Attached Photos</span>
                </div>
                <div className={s.headerActions}>
                    {onAddImage && (
                        <button
                            type='button'
                            className={s.addBtn}
                            onClick={() => setShowAddInput(prev => !prev)}
                            title='Add 1 or more photos with optional caption and rating'>
                            {showAddInput ? '✕ Close' : '➕ Add Photo(s)'}
                        </button>
                    )}
                    <div className={s.badge}>
                        {activeIndex + 1} / {count}
                    </div>
                </div>
            </div>

            {/* Expandable Add Image Form */}
            {showAddInput && (
                <form className={s.addForm} onSubmit={handleAddSubmit}>
                    <div className={s.addFormTitle}>Add Photo(s) to Carousel</div>
                    <div className={s.addInputs}>
                        <textarea
                            autoFocus
                            rows={3}
                            className={s.urlTextarea}
                            placeholder={'Paste 1 or more image URLs (one per line, or separated by commas):\n\nhttps://example.com/photo.jpg\nhttps://pbs.twimg.com/media/... (copy image address)\nhttps://drive.google.com/file/d/... (Google Drive)'}
                            value={newImageUrl}
                            onChange={e => {
                                setNewImageUrl(e.target.value)
                                setAddFeedback('')
                            }}
                        />
                        <input
                            type='text'
                            className={s.captionInput}
                            placeholder='Title / caption for all photos (optional)...'
                            value={newImageCaption}
                            onChange={e => setNewImageCaption(e.target.value)}
                        />
                    </div>
                    {/* Star Rating for newly added images */}
                    <div className={s.addRatingRow}>
                        <span className={s.addRatingLabel}>Rating:</span>
                        <StarRating
                            rating={newImageRating}
                            onChange={setNewImageRating}
                            size='small'
                            showText={true}
                            light={true}
                        />
                    </div>
                    {/* Feedback message */}
                    {addFeedback && (
                        <div className={s.addFeedback}>{addFeedback}</div>
                    )}
                    <div className={s.addFormActions}>
                        <button
                            type='button'
                            className={s.cancelAddBtn}
                            onClick={() => { setShowAddInput(false); setAddFeedback('') }}>
                            Cancel
                        </button>
                        <button
                            type='submit'
                            className={s.confirmAddBtn}
                            disabled={!newImageUrl.trim()}>
                            ➕ Add All Photos
                        </button>
                    </div>
                </form>
            )}

            {/* Slider Container with Smooth Touch & Drag */}
            <div 
                className={s.sliderContainer}
                onMouseDown={handleMouseDown}>
                
                {count > 1 && (
                    <button
                        type='button'
                        className={`${s.navButton} ${s.prevButton}`}
                        onClick={goPrev}
                        title='Previous Photo'>
                        ‹
                    </button>
                )}

                <div 
                    ref={trackRef}
                    className={s.track}
                    onScroll={handleScroll}>
                    {images.map((item, idx) => {
                        const isEditingThisCaption = editingCaptionIdx === idx
                        return (
                            <div
                                key={item.url + idx}
                                className={s.slide}
                                onClick={() => {
                                    if (!dragRef.current.hasDragged && !isEditingThisCaption) {
                                        setLightboxIndex(idx)
                                    }
                                }}>
                                <img
                                    src={item.url}
                                    alt={item.caption || item.title || `Photo ${idx + 1}`}
                                    className={s.image}
                                    loading='lazy'
                                    referrerPolicy='no-referrer'
                                    onError={(e) => handleImageLoadError(e, item)}
                                />

                                {/* Caption & Rating Overlay Bar */}
                                {!isEditingThisCaption ? (
                                    <div className={s.captionBar} onClick={e => e.stopPropagation()}>
                                        <div className={s.captionTitle} title={item.caption || item.title || 'Attached Image'}>
                                            {item.caption ? `“${item.caption}”` : (item.title || 'Attached Photo')}
                                        </div>
                                        <div className={s.captionSubrow}>
                                            <div className={s.captionMeta}>
                                                <StarRating
                                                    rating={item.rating || 0}
                                                    onChange={(score) => onUpdateRating && onUpdateRating(item, score)}
                                                    size='small'
                                                    showText={true}
                                                />
                                                <span className={s.captionSource}>• {item.source}</span>
                                            </div>
                                            <div className={s.captionActions}>
                                                {onUpdateCaption && (
                                                    <button
                                                        type='button'
                                                        className={s.captionEditBtn}
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setEditingCaptionIdx(idx)
                                                            setEditCaptionValue(item.caption || '')
                                                        }}
                                                        title='Edit caption or title'>
                                                        ✏️ {item.caption ? 'Edit' : 'Title'}
                                                    </button>
                                                )}
                                                <button
                                                    type='button'
                                                    className={s.zoomBtn}
                                                    onClick={() => setLightboxIndex(idx)}
                                                    title='View fullscreen lightbox'>
                                                    🔍 Zoom
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    /* In-place Caption Editor */
                                    <div className={s.captionEditor} onClick={e => e.stopPropagation()}>
                                        <input
                                            type='text'
                                            autoFocus
                                            placeholder='Enter caption or title for this photo...'
                                            value={editCaptionValue}
                                            onChange={e => setEditCaptionValue(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') handleSaveCaption(item, e)
                                                if (e.key === 'Escape') setEditingCaptionIdx(null)
                                            }}
                                        />
                                        <button
                                            type='button'
                                            className={s.saveCaptionBtn}
                                            onClick={(e) => handleSaveCaption(item, e)}>
                                            Save
                                        </button>
                                        <button
                                            type='button'
                                            className={s.cancelCaptionBtn}
                                            onClick={() => setEditingCaptionIdx(null)}>
                                            Cancel
                                        </button>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>

                {count > 1 && (
                    <button
                        type='button'
                        className={`${s.navButton} ${s.nextButton}`}
                        onClick={goNext}
                        title='Next Photo'>
                        ›
                    </button>
                )}
            </div>

            {/* Dots Pagination */}
            {count > 1 && (
                <div className={s.footer}>
                    {images.map((_, idx) => (
                        <button
                            key={idx}
                            type='button'
                            className={`${s.dot} ${idx === activeIndex ? s.activeDot : ''}`}
                            onClick={() => scrollToIndex(idx)}
                            title={`Go to photo ${idx + 1}`}
                        />
                    ))}
                </div>
            )}

            {/* Fullscreen Lightbox Modal */}
            {lightboxIndex !== null && (
                <Lightbox
                    images={images}
                    initialIndex={lightboxIndex}
                    onClose={() => setLightboxIndex(null)}
                    onUpdateRating={onUpdateRating}
                    onUpdateCaption={onUpdateCaption}
                />
            )}
        </div>
    )
}

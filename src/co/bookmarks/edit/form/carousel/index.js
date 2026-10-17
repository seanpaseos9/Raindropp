import React, { useState, useRef, useCallback } from 'react'
import s from './index.module.styl'
import Lightbox from './lightbox'
import StarRating from './rating'

export default function NoteImageCarousel({ images = [], onAddImage, onUpdateCaption, onUpdateRating }) {
    const [activeIndex, setActiveIndex] = useState(0)
    const [lightboxIndex, setLightboxIndex] = useState(null)
    const [showAddInput, setShowAddInput] = useState(false)
    const [newImageUrl, setNewImageUrl] = useState('')
    const [newImageCaption, setNewImageCaption] = useState('')
    const [newImageRating, setNewImageRating] = useState(0)
    const [editingCaptionIdx, setEditingCaptionIdx] = useState(null)
    const [editCaptionValue, setEditCaptionValue] = useState('')

    const trackRef = useRef(null)
    const isProgrammaticScroll = useRef(false)
    const scrollTimeoutRef = useRef(null)

    // Mouse drag state for smooth desktop drag-scroll
    const dragRef = useRef({
        isDown: false,
        startX: 0,
        scrollLeft: 0,
        hasDragged: false
    })

    const count = images.length
    if (count === 0) return null

    // Scroll to specific index programmatically without feedback loop
    const scrollToIndex = useCallback((targetIndex) => {
        const track = trackRef.current
        if (!track) return

        isProgrammaticScroll.current = true
        setActiveIndex(targetIndex)

        const width = track.clientWidth || 1
        track.scrollTo({
            left: targetIndex * width,
            behavior: 'smooth'
        })

        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
        scrollTimeoutRef.current = setTimeout(() => {
            isProgrammaticScroll.current = false
        }, 350)
    }, [])

    // Track scroll listener to update active dot/index when user scrolls manually
    const handleScroll = useCallback(() => {
        if (isProgrammaticScroll.current) return
        const track = trackRef.current
        if (!track) return

        const width = track.clientWidth || 1
        const scrollPos = track.scrollLeft
        const newIndex = Math.round(scrollPos / width)

        if (newIndex >= 0 && newIndex < count && newIndex !== activeIndex) {
            setActiveIndex(newIndex)
        }
    }, [count, activeIndex])

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

    // Desktop Mouse Drag Handlers
    const handleMouseDown = (e) => {
        const track = trackRef.current
        if (!track) return
        dragRef.current = {
            isDown: true,
            startX: e.pageX - track.offsetLeft,
            scrollLeft: track.scrollLeft,
            hasDragged: false
        }
    }

    const handleMouseMove = (e) => {
        if (!dragRef.current.isDown) return
        const track = trackRef.current
        if (!track) return

        const x = e.pageX - track.offsetLeft
        const walk = (x - dragRef.current.startX)
        if (Math.abs(walk) > 5) {
            dragRef.current.hasDragged = true
            isProgrammaticScroll.current = true
            track.scrollLeft = dragRef.current.scrollLeft - walk
        }
    }

    const handleMouseUpOrLeave = () => {
        if (!dragRef.current.isDown) return
        dragRef.current.isDown = false

        const track = trackRef.current
        if (!track) return

        if (dragRef.current.hasDragged) {
            const width = track.clientWidth || 1
            const newIndex = Math.max(0, Math.min(count - 1, Math.round(track.scrollLeft / width)))
            isProgrammaticScroll.current = false
            scrollToIndex(newIndex)
        }
    }

    // Add Image submit
    const handleAddSubmit = (e) => {
        if (e) e.preventDefault()
        const trimmedUrl = newImageUrl.trim()
        const trimmedCaption = newImageCaption.trim()
        if (trimmedUrl && onAddImage) {
            onAddImage(trimmedUrl, trimmedCaption, newImageRating)
            setNewImageUrl('')
            setNewImageCaption('')
            setNewImageRating(0)
            setShowAddInput(false)
            setTimeout(() => scrollToIndex(count), 100)
        }
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

    return (
        <div className={s.wrapper}>
            {/* Header: Title, Add Button, Counter Badge */}
            <div className={s.header}>
                <div className={s.headerTitle}>
                    <span>📷 Attached Images</span>
                </div>
                <div className={s.headerActions}>
                    {onAddImage && (
                        <button
                            type='button'
                            className={s.addBtn}
                            onClick={() => setShowAddInput(prev => !prev)}
                            title='Add another image with optional caption and rating'>
                            {showAddInput ? '✕ Close' : '➕ Add Image'}
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
                    <div className={s.addInputs}>
                        <input
                            type='text'
                            autoFocus
                            className={s.urlInput}
                            placeholder='Image URL or Google Drive link (required)...'
                            value={newImageUrl}
                            onChange={e => setNewImageUrl(e.target.value)}
                        />
                        <input
                            type='text'
                            className={s.captionInput}
                            placeholder='Image title / caption (optional)...'
                            value={newImageCaption}
                            onChange={e => setNewImageCaption(e.target.value)}
                        />
                    </div>
                    {/* Star Rating for newly added image */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '2px 0' }}>
                        <span style={{ fontSize: '11px', opacity: 0.8 }}>Rate:</span>
                        <StarRating
                            rating={newImageRating}
                            onChange={setNewImageRating}
                            size='small'
                            showText={true}
                        />
                    </div>
                    <div className={s.addFormActions}>
                        <button
                            type='button'
                            className={s.cancelAddBtn}
                            onClick={() => setShowAddInput(false)}>
                            Cancel
                        </button>
                        <button
                            type='submit'
                            className={s.confirmAddBtn}
                            disabled={!newImageUrl.trim()}>
                            Add to Carousel
                        </button>
                    </div>
                </form>
            )}

            {/* Slider Container with Smooth Touch & Drag */}
            <div 
                className={s.sliderContainer}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUpOrLeave}
                onMouseLeave={handleMouseUpOrLeave}>
                
                {count > 1 && (
                    <button
                        type='button'
                        className={`${s.navButton} ${s.prevButton}`}
                        onClick={goPrev}
                        title='Previous Image'>
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
                                    alt={item.title || item.caption || `Image ${idx + 1}`}
                                    className={s.image}
                                    loading='lazy'
                                    onError={(e) => {
                                        if (item.fallbackUrl && e.target.src !== item.fallbackUrl) {
                                            e.target.src = item.fallbackUrl
                                        }
                                    }}
                                />

                                {/* Caption & Rating Overlay Bar */}
                                {!isEditingThisCaption ? (
                                    <div className={s.captionBar} onClick={e => e.stopPropagation()}>
                                        <div className={s.captionTextGroup}>
                                            <div className={s.captionTitle} title={item.title || item.caption}>
                                                {item.caption ? `“${item.caption}”` : (item.title || 'Attached Image')}
                                            </div>
                                            {/* Photo Star Rating Widget */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                                                <StarRating
                                                    rating={item.rating || 0}
                                                    onChange={(score) => onUpdateRating && onUpdateRating(item, score)}
                                                    size='small'
                                                    showText={true}
                                                />
                                                <span className={s.captionSource}>• {item.source}</span>
                                            </div>
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
                                                🔍 Fullscreen
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    /* In-place Caption Editor */
                                    <div className={s.captionEditor} onClick={e => e.stopPropagation()}>
                                        <input
                                            type='text'
                                            autoFocus
                                            placeholder='Enter caption or title for this image...'
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
                        title='Next Image'>
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
                            title={`Go to image ${idx + 1}`}
                        />
                    ))}
                </div>
            )}

            {/* Fullscreen Lightbox Modal with Star Ratings & Captions */}
            {lightboxIndex !== null && (
                <Lightbox
                    images={images}
                    initialIndex={lightboxIndex}
                    onClose={() => setLightboxIndex(null)}
                    onUpdateRating={onUpdateRating}
                />
            )}
        </div>
    )
}

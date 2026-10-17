import s from './rating.module.styl'
import React, { useState, useCallback } from 'react'
import { Label } from '~co/common/form'

export default function BookmarkEditFormRating({ item = {}, onChange, onSave }) {
    const { _id, rating = 0 } = item
    const [hoverRating, setHoverRating] = useState(0)

    const currentScore = hoverRating || rating

    const onRate = useCallback((star, e) => {
        if (e) {
            e.preventDefault()
            e.stopPropagation()
        }
        const nextRating = rating === star ? 0 : star

        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                if (nextRating > 0) {
                    window.localStorage.setItem(`raindrop_rating_${_id}`, nextRating)
                } else {
                    window.localStorage.removeItem(`raindrop_rating_${_id}`)
                }
            }
        } catch (err) {}

        onChange({ rating: nextRating })
        if (onSave) onSave()
    }, [rating, _id, onChange, onSave])

    const onClear = useCallback((e) => {
        if (e) {
            e.preventDefault()
            e.stopPropagation()
        }
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.removeItem(`raindrop_rating_${_id}`)
            }
        } catch (err) {}

        onChange({ rating: 0 })
        if (onSave) onSave()
    }, [_id, onChange, onSave])

    return (
        <>
            <Label>Rating</Label>
            <div className={s.ratingContainer}>
                <div className={s.starGroup}>
                    {[1, 2, 3, 4, 5].map(star => {
                        const filled = star <= currentScore
                        return (
                            <button
                                key={star}
                                type='button'
                                className={`${s.starBtn} ${filled ? s.filled : ''}`}
                                onMouseEnter={() => setHoverRating(star)}
                                onMouseLeave={() => setHoverRating(0)}
                                onClick={(e) => onRate(star, e)}
                                title={rating === star ? 'Click to clear rating' : `Rate ${star} star${star > 1 ? 's' : ''}`}>
                                ★
                            </button>
                        )
                    })}
                </div>

                <span className={s.scoreLabel}>
                    {currentScore > 0 ? `${currentScore} / 5` : 'Unrated'}
                </span>

                {rating > 0 && (
                    <button
                        type='button'
                        className={s.clearBtn}
                        onClick={onClear}
                        title='Clear rating'>
                        ✕ Clear
                    </button>
                )}
            </div>
        </>
    )
}

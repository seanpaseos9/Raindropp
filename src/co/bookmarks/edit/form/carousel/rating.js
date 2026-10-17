import React, { useState } from 'react'
import s from './rating.module.styl'

export default function StarRating({
    rating = 0,
    onChange,
    readonly = false,
    size = 'small',
    light = false,
    showText = false
}) {
    const [hoverRating, setHoverRating] = useState(0)

    const currentScore = hoverRating || rating

    const handleClick = (star, e) => {
        if (e) {
            e.stopPropagation()
            e.preventDefault()
        }
        if (readonly || !onChange) return
        // Click same star to clear rating
        if (rating === star) {
            onChange(0)
        } else {
            onChange(star)
        }
    }

    return (
        <div 
            className={`${s.starGroup} ${light ? s.lightTheme : ''}`} 
            onClick={e => e.stopPropagation()}>
            {[1, 2, 3, 4, 5].map(star => {
                const filled = star <= currentScore
                return (
                    <button
                        key={star}
                        type='button'
                        className={`${s.starBtn} ${s[size]} ${filled ? s.starFilled : s.starEmpty}`}
                        disabled={readonly}
                        onMouseEnter={() => !readonly && setHoverRating(star)}
                        onMouseLeave={() => !readonly && setHoverRating(0)}
                        onClick={e => handleClick(star, e)}
                        title={readonly ? `Rating: ${rating}/5` : (rating === star ? 'Click to clear rating' : `Rate ${star} star${star > 1 ? 's' : ''}`)}>
                        ★
                    </button>
                )
            })}
            {showText && currentScore > 0 && (
                <span className={s.ratingText}>
                    {currentScore}/5
                </span>
            )}
        </div>
    )
}

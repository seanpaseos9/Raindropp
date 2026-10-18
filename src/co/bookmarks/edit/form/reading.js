import s from './reading.module.styl'
import React, { useCallback } from 'react'
import { Label } from '~co/common/form'

export default function BookmarkEditFormReading({ item = {}, onChange, onSave }) {
    const { _id, read = false, lastChapter = '' } = item

    const onToggleRead = useCallback((e) => {
        const nextRead = e.target.checked

        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.setItem(`raindrop_read_${_id}`, String(nextRead))
            }
        } catch (err) {}

        onChange({ read: nextRead })
        if (onSave) onSave()
    }, [_id, onChange, onSave])

    const onChangeChapter = useCallback((e) => {
        const val = e.target.value

        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.setItem(`raindrop_chapter_${_id}`, val)
            }
        } catch (err) {}

        onChange({ lastChapter: val })
    }, [_id, onChange])

    const onBlurChapter = useCallback(() => {
        if (onSave) onSave()
    }, [onSave])

    const onRestartChapter = useCallback((e) => {
        if (e) {
            e.preventDefault()
            e.stopPropagation()
        }

        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.removeItem(`raindrop_chapter_${_id}`)
            }
        } catch (err) {}

        onChange({ lastChapter: '' })
        if (onSave) onSave()
    }, [_id, onChange, onSave])

    return (
        <>
            <Label>Reading Progress</Label>
            <div className={s.container}>
                <label className={s.readCheckbox}>
                    <input 
                        type='checkbox' 
                        checked={read} 
                        onChange={onToggleRead} 
                    />
                    <span>{read ? '✓ Read' : 'Unread'}</span>
                </label>

                <div className={s.chapterGroup}>
                    <span className={s.chapterLabel}>📖 Last Chapter:</span>
                    <input
                        type='text'
                        className={s.chapterInput}
                        placeholder='e.g. Chapter 45'
                        value={lastChapter}
                        onChange={onChangeChapter}
                        onBlur={onBlurChapter}
                    />
                    {Boolean(lastChapter) && (
                        <button
                            type='button'
                            className={s.restartBtn}
                            onClick={onRestartChapter}
                            title='Restart reading progress (🔄)'>
                            🔄
                        </button>
                    )}
                </div>
            </div>
        </>
    )
}

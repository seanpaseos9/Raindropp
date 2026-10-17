import s from './note.module.styl'
import t from '~t'
import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react'
import links from '~config/links'

import { Text, Label } from '~co/common/form'
import Icon from '~co/common/icon'
import Button from '~co/common/button'
import { Confirm } from '~co/overlay/dialog'

import NoteImageCarousel from './carousel'
import { 
    extractImageUrls, 
    formatMultipleImageEntries, 
    updateImageCaptionInNote, 
    updateImageRatingInNote 
} from './carousel/helper'

export default function BookmarkEditFormNote({ autoFocus, item = {}, onCommit, onChange, onSave }) {    
    const [editingRaw, setEditingRaw] = useState(autoFocus === 'note')
    const note = item.note || ''

    // Always keep a ref to the latest note to avoid stale closures during rapid or sequential additions
    const noteRef = useRef(note)
    useEffect(() => {
        noteRef.current = note
    }, [note])

    // Parse image links, titles, captions, and ratings from note and attached bookmark item
    const { hasImages, images, cleanText } = useMemo(() => {
        return extractImageUrls(note || '', item)
    }, [note, item])

    const onChangeField = useCallback(e => {
        const val = e.target.value
        noteRef.current = val
        onChange({ [e.target.getAttribute('name')]: val })
    }, [onChange])

    const onMarkdownClick = useCallback(e => {
        e.preventDefault()
        Confirm(t.s('note'), {
            description: t.s('markdownSupported'),
            cancel: t.s('howToUse')
        }).then(ok => {
            if (!ok) window.open(links.help['add-note'])
        })
    }, [])

    const handleBlur = useCallback((e) => {
        if (onCommit) onCommit(e)
        if (onSave) onSave()
        if (hasImages) {
            setEditingRaw(false)
        }
    }, [onCommit, onSave, hasImages])

    // Save and commit note changes immediately to Redux & storage/API
    const saveNote = useCallback((newNote) => {
        noteRef.current = newNote
        onChange({ note: newNote })
        if (onSave) onSave()
        if (onCommit) onCommit()
    }, [onChange, onSave, onCommit])

    // Add 1, 2, or more photos simultaneously or sequentially
    const onAddImage = useCallback((urlInput, caption = '', rating = 0) => {
        const entries = formatMultipleImageEntries(urlInput, caption, rating)
        if (!entries || !entries.length) return

        const currentNote = noteRef.current || ''
        const appended = entries.join('\n')
        const newNote = currentNote.trim() ? `${currentNote.trim()}\n${appended}` : appended
        saveNote(newNote)
    }, [saveNote])

    // Update caption of an existing image
    const onUpdateCaption = useCallback((image, newCaption) => {
        const currentNote = noteRef.current || ''
        const newNote = updateImageCaptionInNote(currentNote, image, newCaption)
        saveNote(newNote)
    }, [saveNote])

    // Update star rating of an existing image
    const onUpdateRating = useCallback((image, newRating) => {
        const currentNote = noteRef.current || ''
        const newNote = updateImageRatingInNote(currentNote, image, newRating)
        saveNote(newNote)
    }, [saveNote])

    const handlePromptAddImage = useCallback(() => {
        const url = window.prompt('Paste image URL(s) or Google Drive link (separate multiple with newlines or commas):')
        if (url) {
            const caption = window.prompt('Optional title or caption for the photo(s):') || ''
            onAddImage(url, caption)
        }
    }, [onAddImage])

    return (
        <>
            {/* Standard label to maintain Raindrop grid layout */}
            <Label>{t.s('note')}</Label>

            <div className={s.noteContainer}>
                {/* Note actions toolbar */}
                <div className={s.topBar}>
                    {hasImages ? (
                        <button
                            type='button'
                            className={s.actionBtn}
                            onClick={() => setEditingRaw(prev => !prev)}
                            title='Switch between visual carousel and raw Markdown'>
                            {editingRaw ? '🖼️ View Carousel' : '✏️ Edit Raw Note'}
                        </button>
                    ) : (
                        <button
                            type='button'
                            className={s.actionBtn}
                            onClick={handlePromptAddImage}
                            title='Attach image links or Google Drive photos'>
                            📷 Attach Image(s)
                        </button>
                    )}
                </div>

                {/* Touch-swipeable carousel with captions, star ratings, and smooth scrolling */}
                {hasImages && (
                    <NoteImageCarousel 
                        images={images} 
                        onAddImage={onAddImage}
                        onUpdateCaption={onUpdateCaption}
                        onUpdateRating={onUpdateRating} />
                )}

                {/* Note text field or preview */}
                {hasImages && !editingRaw ? (
                    <div 
                        className={s.cleanNoteCard}
                        onClick={() => setEditingRaw(true)}
                        title='Click to edit note text'>
                        {cleanText ? (
                            <div className={s.cleanTextContent}>{cleanText}</div>
                        ) : (
                            <span className={s.emptyCleanText}>
                                (Photos only in note — click here to add text)
                            </span>
                        )}
                        <div className={s.collapsedBanner}>
                            <span>📷 {images.length} {images.length === 1 ? 'photo' : 'photos'} in carousel</span>
                            <span className={s.inlineEditBtn}>Click to edit text</span>
                        </div>
                    </div>
                ) : (
                    <Text 
                        className={s.note}
                        type='text'
                        autoFocus={autoFocus === 'note' || editingRaw}
                        name='note'
                        value={note}
                        autoSize={true}
                        multiline={true}
                        minRows={3}
                        placeholder={t.s('note')}
                        onChange={onChangeField}
                        onBlur={handleBlur}>
                        <Button 
                            className={s.button} 
                            onClick={onMarkdownClick}
                            tabIndex='-1'
                            size='small'
                            title={t.s('markdownSupported')}>
                            <Icon name='markdown' />
                        </Button>
                    </Text>
                )}
            </div>
        </>
    )
}
import s from './note.module.styl'
import t from '~t'
import React, { useCallback, useMemo, useState } from 'react'
import links from '~config/links'

import { Text, Label } from '~co/common/form'
import Icon from '~co/common/icon'
import Button from '~co/common/button'
import { Confirm } from '~co/overlay/dialog'

import NoteImageCarousel from './carousel'
import { extractImageUrls, formatImageNoteEntry, updateImageCaptionInNote, updateImageRatingInNote } from './carousel/helper'

export default function BookmarkEditFormNote({ autoFocus, item: { note = '' }, onCommit, onChange }) {    
    const [editingRaw, setEditingRaw] = useState(autoFocus === 'note')

    // Parse image links, titles, captions, and ratings from note
    const { hasImages, images, cleanText } = useMemo(() => {
        return extractImageUrls(note || '')
    }, [note])

    const onChangeField = useCallback(e => {
        onChange({ [e.target.getAttribute('name')]: e.target.value })
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
        onCommit && onCommit(e)
        if (hasImages) {
            setEditingRaw(false)
        }
    }, [onCommit, hasImages])

    // Add image with optional caption and rating
    const onAddImage = useCallback((url, caption = '', rating = 0) => {
        const entry = formatImageNoteEntry(url, caption, rating)
        if (!entry) return
        const newNote = note ? `${note.trim()}\n${entry}` : entry
        onChange({ note: newNote })
        onCommit && onCommit()
    }, [note, onChange, onCommit])

    // Update caption of an existing image
    const onUpdateCaption = useCallback((image, newCaption) => {
        const newNote = updateImageCaptionInNote(note, image, newCaption)
        onChange({ note: newNote })
        onCommit && onCommit()
    }, [note, onChange, onCommit])

    // Update star rating of an existing image
    const onUpdateRating = useCallback((image, newRating) => {
        const newNote = updateImageRatingInNote(note, image, newRating)
        onChange({ note: newNote })
        onCommit && onCommit()
    }, [note, onChange, onCommit])

    const handlePromptAddImage = useCallback(() => {
        const url = window.prompt('Paste an image URL or Google Drive share link:')
        if (url) {
            const caption = window.prompt('Optional title or caption for this image:') || ''
            onAddImage(url, caption)
        }
    }, [onAddImage])

    return (
        <>
            {/* Standard label to keep grid alignment intact */}
            <Label>{t.s('note')}</Label>

            <div className={s.noteContainer}>
                {/* Note actions toolbar */}
                <div className={s.topBar}>
                    <button
                        type='button'
                        className={s.actionBtn}
                        onClick={handlePromptAddImage}
                        title='Attach an image link with optional title'>
                        ➕ Add Image
                    </button>
                    {hasImages && (
                        <button
                            type='button'
                            className={s.actionBtn}
                            onClick={() => setEditingRaw(prev => !prev)}>
                            {editingRaw ? '✓ Done Editing' : '✏️ Edit Raw Note'}
                        </button>
                    )}
                </div>

                {/* Touch-swipeable carousel with captions and smooth scrolling */}
                {hasImages && (
                    <NoteImageCarousel 
                        images={images} 
                        onAddImage={onAddImage}
                        onUpdateCaption={onUpdateCaption}
                        onUpdateRating={onUpdateRating} />
                )}

                {/* Note text field */}
                {hasImages && !editingRaw ? (
                    <div 
                        className={s.cleanNoteCard}
                        onClick={() => setEditingRaw(true)}
                        title='Click to edit note text'>
                        {cleanText ? (
                            cleanText
                        ) : (
                            <span className={s.emptyCleanText}>
                                (Images only in note — click here to add text)
                            </span>
                        )}
                        <div className={s.collapsedBanner}>
                            <span>📷 {images.length} {images.length === 1 ? 'image' : 'images'} attached with captions</span>
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
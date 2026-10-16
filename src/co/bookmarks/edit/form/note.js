import s from './note.module.styl'
import t from '~t'
import React, { useState, useMemo, useCallback } from 'react'
import links from '~config/links'

import { Text, Label } from '~co/common/form'
import Icon from '~co/common/icon'
import Button from '~co/common/button'
import { Confirm } from '~co/overlay/dialog'
import SafeMarkdown from '~co/common/safeMarkdown'

import { extractImageLinks } from './carousel/extractImageLinks'
import NoteCarousel from './carousel'
import Lightbox from './carousel/lightbox'

export default function BookmarkEditFormNote({ autoFocus, item: { note = '' }, onCommit, onChange }) {
    // Extract image links and clean note text
    const { images, cleanText, hasImages } = useMemo(() => extractImageLinks(note), [note])

    // Lightbox modal state
    const [lightboxIndex, setLightboxIndex] = useState(null)

    // Editing mode state (when images are present, allow toggling between clean view and raw editing)
    const [isEditing, setIsEditing] = useState(() => autoFocus === 'note')

    const onChangeField = useCallback(e =>
        onChange({ [e.target.getAttribute('name')]: e.target.value }),
        [onChange]
    )

    const onMarkdownClick = useCallback(e => {
        e.preventDefault()
        Confirm(t.s('note'), {
            description: t.s('markdownSupported'),
            cancel: t.s('howToUse')
        }).then(ok => {
            if (!ok)
                window.open(links.help['add-note'])
        })
    }, [])

    const handleStartEditing = useCallback(() => {
        setIsEditing(true)
    }, [])

    const handleFinishEditing = useCallback(() => {
        setIsEditing(false)
        onCommit && onCommit()
    }, [onCommit])

    // Standard plain-text note (when no image links detected in note)
    if (!hasImages) {
        return (
            <>
                <Label>{t.s('note')}</Label>
                <Text 
                    className={s.note}
                    type='text'
                    autoFocus={autoFocus === 'note'}
                    name='note'
                    value={note}
                    autoSize={true}
                    multiline={true}
                    minRows={3}
                    onChange={onChangeField}
                    onBlur={onCommit}>
                    <Button 
                        className={s.button} 
                        onClick={onMarkdownClick}
                        tabIndex='-1'
                        size='small'
                        title={t.s('markdownSupported')}>
                        <Icon name='markdown' />
                    </Button>
                </Text>
            </>
        )
    }

    // Bookmark note with image links: carousel + clean/collapsed note body + lightbox
    return (
        <>
            <Label>{t.s('note')}</Label>
            
            <div className={s.noteContainer}>
                {/* Touch-swipeable horizontal image carousel */}
                <NoteCarousel 
                    images={images} 
                    onOpenLightbox={setLightboxIndex} 
                />

                {/* Note Body: Clean preview or editable Textarea */}
                {!isEditing ? (
                    <div 
                        className={s.cleanCard} 
                        onClick={handleStartEditing}
                        title='Click to edit note'>
                        {cleanText ? (
                            <SafeMarkdown className={s.cleanBody} markdown={cleanText} />
                        ) : (
                            <div className={s.placeholder}>{t.s('addNote')}…</div>
                        )}

                        <div className={s.metaRow}>
                            <span className={s.urlBadge} title='Image URLs are collapsed and displayed in the carousel above'>
                                <svg viewBox='0 0 24 24'>
                                    <path d='M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z' />
                                </svg>
                                {images.length} {images.length === 1 ? 'image' : 'images'} in carousel
                            </span>

                            <button 
                                type='button' 
                                className={s.editActionBtn}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    handleStartEditing()
                                }}>
                                <Icon name='edit' size='micro' />
                                <span>{t.s('edit')}</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    <div>
                        <Text 
                            className={s.note}
                            type='text'
                            autoFocus={true}
                            name='note'
                            value={note}
                            autoSize={true}
                            multiline={true}
                            minRows={3}
                            onChange={onChangeField}
                            onBlur={handleFinishEditing}>
                            <Button 
                                className={s.button} 
                                onClick={onMarkdownClick}
                                tabIndex='-1'
                                size='small'
                                title={t.s('markdownSupported')}>
                                <Icon name='markdown' />
                            </Button>
                        </Text>

                        <div className={s.editingBar}>
                            <span className={s.urlBadge}>
                                📷 {images.length} {images.length === 1 ? 'image' : 'images'} detected
                            </span>

                            <button 
                                type='button' 
                                className={s.doneBtn}
                                onMouseDown={(e) => {
                                    // Prevent blur before click executes
                                    e.preventDefault()
                                    handleFinishEditing()
                                }}>
                                Done
                            </button>
                        </div>
                    </div>
                )}

                {/* Full-screen Lightbox Overlay */}
                {lightboxIndex !== null && (
                    <Lightbox 
                        images={images} 
                        initialIndex={lightboxIndex} 
                        onClose={() => setLightboxIndex(null)} 
                    />
                )}
            </div>
        </>
    )
}
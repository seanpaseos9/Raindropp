import s from './view.module.styl'
import React from 'react'
import t from '~t'

import DragItem from '~co/bookmarks/dnd/drag/item'
import SuperLink from '~co/common/superLink'
import SafeHtml from '~co/common/safeHtml'
import SafeMarkdown from '~co/common/safeMarkdown'
import Cover from './cover'
import Tags from './tags'
import Highlights from './highlights'
import Reminder from './reminder'
import Info from './info'
import Actions from './actions'
import { PreloadPreviewLink } from '~routes/my/item/tab/preview'
import { getRatingColor } from '~co/bookmarks/edit/form/ratingColors'
import { extractImageUrls } from '~co/bookmarks/edit/form/carousel/helper'

export default function BookmarkItemView(props) {
    const { innerRef, isDragging } = props
    const { _id, link, title, excerpt, highlight, cover, domain, tags, note, highlights, reminder, view, access, spaceId, rating = 0, read = false, lastChapter = '' } = props
    const { active, selected, selectModeEnabled, selectDisabled, important, broken, coverSize } = props
    const { onClick, onDoubleClick, onSelectClick, onContextMenu, onKeyUp, onToggleRead, onUpdateChapter, onRestartChapter } = props

    // Strip image markdown (![...](data:...)) from note so base64 blobs don't pollute card text
    const { cleanText: noteCleanText } = extractImageUrls(note || '', props)

    return (
        <DragItem 
            {...props}
            ghostClassName={s.dragGhost}>{drag=>(
            <article 
                ref={innerRef}
                role='listitem'
                className={`
                    ${s.element}
                    ${active&&s.active}
                    ${selected&&s.checked}
                    ${important&&s.important}
                    ${broken&&s.broken}
                    ${isDragging&&s.isDragging}
                    ${s[view]}
                    ${selectModeEnabled&&s.selectModeEnabled}
                `}
                data-id={_id}
                {...drag}>
                <Cover
                    cover={cover}
                    domain={domain}
                    link={link}
                    view={view}
                    coverSize={coverSize} />

                <div className={s.about}>
                    {/* Text */}
                    <SafeHtml className={s.title} html={highlight.title || title} />
                    
                    <div className={s.description}>
                        {noteCleanText ? (
                            <SafeMarkdown className={s.note} markdown={highlight.note || noteCleanText} />
                        ) : null}
                        {highlight.body || highlight.excerpt ? (
                            <SafeHtml className={s.body} html={highlight.body || highlight.excerpt} />
                        ) : (
                            excerpt ? (
                                <SafeHtml className={s.excerpt} html={excerpt} />
                            ) : null
                        )}
                        <Reminder reminder={reminder} />
                        <Highlights className={s.highlights} highlights={highlights} />
                        <Tags tags={tags} spaceId={spaceId} />
                    </div>

                    {rating > 0 ? (
                        <div 
                            className={s.ratingBadge} 
                            title={`Rating: ${rating}/5`}
                            style={{ color: getRatingColor(rating) }}>
                            <span className={s.ratingStars} style={{ color: getRatingColor(rating) }}>
                                {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
                            </span>
                            <span className={s.ratingScore} style={{ color: getRatingColor(rating), fontWeight: 700 }}>
                                {rating}/5
                            </span>
                        </div>
                    ) : null}

                    {/* Reading Progress: Read checkbox and Last Chapter with restart button (🔄) */}
                    <div className={s.readingRow}>
                        <label 
                            className={`${s.readBadge} ${read ? s.isRead : ''}`}
                            onClick={e => e.stopPropagation()}
                            title={read ? 'Marked as Read (click to toggle)' : 'Mark as Read'}>
                            <input
                                type='checkbox'
                                checked={read}
                                onChange={onToggleRead}
                                className={s.readCardCheckbox}
                            />
                            <span>{read ? 'Read' : 'Unread'}</span>
                        </label>

                        <div 
                            className={s.chapterBadge}
                            onClick={e => e.stopPropagation()}
                            title='Last Chapter reading progress'>
                            <span className={s.chapterIcon}>📖</span>
                            <input
                                type='text'
                                className={s.chapterCardInput}
                                placeholder='Last Ch.'
                                value={lastChapter}
                                onChange={e => onUpdateChapter && onUpdateChapter(e.target.value)}
                            />
                            {Boolean(lastChapter) && (
                                <button
                                    type='button'
                                    className={s.chapterRestartBtn}
                                    onClick={onRestartChapter}
                                    title='Restart reading progress (🔄)'>
                                    🔄
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Info */}
                    <Info 
                        {...props}
                        className={s.info} />
                </div>

                <Actions 
                    {...props}
                    className={s.actions} />

                {access && access.level >= 3 ? (
                    <label
                        className={`${s.select} ${selected ? s.active : s.default}`}
                        title={t.s('select')}>
                        <input type='checkbox' readOnly checked={selected} disabled={selectDisabled} onClick={onSelectClick} />
                    </label>
                ) : null}

                <SuperLink
                    href={link}
                    rel='noopener'

                    className={s.permalink}

                    active={active}
                    tabIndex='0'

                    onClick={onClick}
                    onDoubleClick={onDoubleClick}
                    onContextMenu={onContextMenu}
                    onKeyUp={onKeyUp}>
                    {title}
                </SuperLink>

                <PreloadPreviewLink item={props} />
            </article>
        )}</DragItem>
    )
}
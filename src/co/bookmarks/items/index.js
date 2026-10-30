import React, { useRef, useCallback, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { makeCollection } from '~data/selectors/collections'
import { bookmarksIds } from '~data/selectors/bookmarks'
import { SPACE_PER_PAGE } from '~data/constants/bookmarks'

import View from './view'
import Lazy from '~co/virtual/lazy'
import Sortable from './sortable'
import Item from '../item'
import Empty from './empty'
import s from './duplicates.module.styl'

const initialNumToRender = parseInt(SPACE_PER_PAGE / 2)

export default function BookmarksItems(props) {
    const { spaceId, activeId, compact, compactLimit, events } = props

    //collection
    const getCollection = useRef(makeCollection()).current
    const { view, access } = useSelector(state=>getCollection(state, spaceId))

    //bookmarks
    const ids = useSelector(state=>bookmarksIds(state, spaceId))
    const duplicateSections = useSelector(state=>{
        if (parseInt(spaceId) !== -9) return null
        const elements = state.bookmarks.elements || {}
        const groups = { link: new Map(), title: new Map() }
        ids.forEach(id => {
            const item = elements[id]
            if (!item || !groups[item.duplicateKind]) return
            const groupKey = item.duplicateGroupKey || String(id)
            if (!groups[item.duplicateKind].has(groupKey)) {
                groups[item.duplicateKind].set(groupKey, { key: groupKey, ids: [] })
            }
            groups[item.duplicateKind].get(groupKey).ids.push(id)
        })
        return {
            link: [...groups.link.values()],
            title: [...groups.title.values()]
        }
    })
    const items = useMemo(
        ()=>!compact ? ids : ids.slice(0, compactLimit), 
        [ids, compact, compactLimit]
    )
    const keyExtractor = useCallback(_id=>_id, [])

    if (!items.length)
        return <Empty {...props} />

    if (duplicateSections) {
        const renderSection = (key, title, kind, groups) => {
            const pairs = groups.flatMap(group => {
                if (group.ids.length < 2) return []
                const [leftId, ...otherIds] = group.ids
                return otherIds.map(rightId => ({
                    key: `${group.key}:${rightId}`,
                    leftId,
                    rightId
                }))
            })
            if (!pairs.length) return null

            return (
            <section className={s.section} key={key}>
                <h2 className={s.heading}>{title} ({pairs.length})</h2>
                <Lazy
                    data={pairs}
                    keyExtractor={pair=>pair.key}
                    initialNumToRender={initialNumToRender}
                    mode='height'>
                    {pair=>(
                        <div className={s.pair}>
                            <div className={kind === 'link' ? s.linkReason : s.titleReason}>
                                {kind === 'link' ? 'Same destination link' : 'Titles look similar'}
                            </div>
                            <Item
                                _id={pair.leftId}
                                spaceId={spaceId}
                                view='grid'
                                access={access}
                                active={activeId == pair.leftId}
                                events={events} />
                            <Item
                                _id={pair.rightId}
                                spaceId={spaceId}
                                view='grid'
                                access={access}
                                active={activeId == pair.rightId}
                                events={events} />
                        </div>
                    )}
                </Lazy>
            </section>
            )
        }

        return (
            <div className={s.groups}>
                {renderSection('links', 'Duplicate links', 'link', duplicateSections.link)}
                {renderSection('titles', 'Similar titles', 'title', duplicateSections.title)}
            </div>
        )
    }

    return (
        <View 
            spaceId={spaceId} 
            view={view}>
            <Sortable 
                data={items}
                spaceId={spaceId}>
                <Lazy
                    data={items}
                    keyExtractor={keyExtractor}
                    initialNumToRender={initialNumToRender}

                    scrollToItem={activeId}

                    mode={view == 'masonry' ? 'row-end-span' : 'height'}
                    gridCellSize={31} //grid-gap + grid-auto-rows
                    >
                    {_id=>
                        <Item
                            _id={_id}
                            //collection
                            spaceId={spaceId}
                            view={view}
                            access={access}
                            //listing specififc
                            active={activeId == _id}
                            events={events} />
                    }
                </Lazy>
            </Sortable>
        </View>
    )
}

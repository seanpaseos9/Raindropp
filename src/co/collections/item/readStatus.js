import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { nextPage } from '~data/actions/bookmarks'

export default function CollectionReadStatus({ collectionId, active }) {
    const dispatch = useDispatch()
    const status = useSelector(state => {
        const space = state.bookmarks?.spaces?.[collectionId]
        if (!space || space.status?.main !== 'loaded' || space.query?.search || !space.count || !space.ids.length)
            return 'not-read'

        const elements = state.bookmarks?.elements || {}
        const allLoadedRead = space.ids.every(id => {
            const item = elements[id]
            if (!item) return false
            if (item.read) return true
            try {
                return window.localStorage?.getItem(`raindrop_read_${id}`) === 'true'
            } catch (e) {
                return false
            }
        })

        if (!allLoadedRead) return 'not-read'
        const complete = space.ids.length === space.count || space.status?.nextPage === 'noMore'
        if (complete) return 'read'
        return space.status?.nextPage === 'idle' ? 'load-next' : 'not-read'
    })

    useEffect(() => {
        if (active && status === 'load-next')
            dispatch(nextPage(collectionId))
    }, [active, collectionId, dispatch, status])

    if (status !== 'read') return null

    return <span
        aria-label='All bookmarks read'
        title='All bookmarks in this folder are read'
        style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: '6px',
            color: '#248a3d',
            fontWeight: 700,
            lineHeight: 1
        }}>
        ✓
    </span>
}

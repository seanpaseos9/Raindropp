import s from './gallery.module.styl'
import React from 'react'
import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { getCoverSize } from '~data/selectors/bookmarks'
import itemCoverSize from '~co/bookmarks/item/cover/size'

export default function BookmarksItemsGallery({ className='', children }) {
    const coverSize = useSelector(state=>getCoverSize(state, 'gallery'))
    const style = useMemo(()=>({
        '--gallery-card-width': itemCoverSize('gallery', coverSize).width+'px'
    }), [coverSize])

    return (
        <div className={`${s.gallery} ${className}`} style={style}>
            {children}
        </div>
    )
}

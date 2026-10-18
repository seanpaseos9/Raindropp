import s from './preview.module.styl'
import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import { API_ENDPOINT_URL } from '~data/constants/app'
import { handleImageLoadError } from '~co/bookmarks/edit/form/carousel/helper'

import useWithWebView from '~co/highlights/useWithWebView'
import Preloader from '~co/common/webview/preloader'

function getPreviewLink(_id) {
    return `${API_ENDPOINT_URL}raindrop/preview/${_id}`
}

export function PreloadPreviewLink({ item }) {
    if (item.type != 'link')
        return <link rel='prefetch' crossOrigin='use-credentials' href={getPreviewLink(item._id)} />
    return null
}

export default function PageMyItemTabPreview({ item = {}, webViewRef }) {
    const { _id, type, link, cover, media } = item

    //highlights
	useWithWebView(webViewRef, _id)

    //article style
    const { font_color, font_family, font_size } = useSelector(state=>state.config)
    const theme = useSelector(state=>state.local.theme)

    // Image detection
    const isImage = type === 'image' ||
        (item.fileType && item.fileType.startsWith('image')) ||
        (link && /\.(jpe?g|png|gif|webp|svg|avif|bmp|tiff)(?:[?#].*)?$/i.test(link))

    const imageUrl = link || cover || (media && media[0] && media[0].link) || ''

    //loading & zoom state
    const [loading, setLoading] = useState(true)
    const [zoom, setZoom] = useState(1)

    const onLoad = useCallback(()=>{ setLoading(false) }, [setLoading])
    useEffect(()=>{
        setLoading(true)
        setZoom(1)
    }, [_id])

    const zoomIn = useCallback(() => setZoom(z => Math.min(3, +(z + 0.5).toFixed(1))), [])
    const zoomOut = useCallback(() => setZoom(z => Math.max(0.5, +(z - 0.5).toFixed(1))), [])
    const resetZoom = useCallback(() => setZoom(1), [])
    const pinchRef = useRef(null)

    const onTouchStart = (e) => {
        if (e.touches.length === 2) {
            if (e.cancelable) e.preventDefault()
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            )
            pinchRef.current = { dist, initialZoom: zoom }
        }
    }

    const onTouchMove = (e) => {
        if (e.touches.length === 2 && pinchRef.current) {
            if (e.cancelable) e.preventDefault()
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            )
            const factor = dist / (pinchRef.current.dist || 1)
            const nextZoom = Math.min(3, Math.max(0.5, +(pinchRef.current.initialZoom * factor).toFixed(2)))
            setZoom(nextZoom)
        }
    }

    const onTouchEnd = () => {
        if (pinchRef.current) pinchRef.current = null
    }

    if (isImage && imageUrl) {
        return (
            <div className={s.imageViewer}>
                {loading && (
                    <Preloader className={s.preloader} />
                )}

                <div 
                    className={s.imageStage}
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}>
                    <img
                        key={imageUrl}
                        src={imageUrl}
                        alt={item.title || 'Attached Image'}
                        className={s.previewImage}
                        referrerPolicy='no-referrer'
                        style={{ transform: `scale(${zoom})` }}
                        onLoad={onLoad}
                        onError={(e) => {
                            setLoading(false)
                            handleImageLoadError(e, { url: imageUrl, originalUrl: imageUrl })
                        }}
                    />
                </div>

                <div className={s.toolbar}>
                    <button type='button' className={s.toolBtn} onClick={zoomOut} disabled={zoom <= 0.5} title='Zoom Out'>−</button>
                    <span className={s.zoomText} onClick={resetZoom} title='Reset Zoom' style={{ cursor: 'pointer' }}>
                        {Math.round(zoom * 100)}%
                    </span>
                    <button type='button' className={s.toolBtn} onClick={zoomIn} disabled={zoom >= 3} title='Zoom In'>+</button>
                    <a
                        href={imageUrl}
                        target='_blank'
                        rel='noreferrer'
                        className={s.toolBtn}
                        style={{ textDecoration: 'none' }}
                        title='Open original in new tab'>
                        ↗ Open Original
                    </a>
                </div>
            </div>
        )
    }

    return (
        <>
            {loading && (
                <Preloader className={s.preloader} />
            )}
            
            <iframe 
                key={_id}
                ref={webViewRef}
                role='article'
                className={s.embed}
                allow='fullscreen; clipboard-write'
                loading='eager'
                referrerPolicy='no-referrer'
                src={`${getPreviewLink(_id)}#solid-bg=false&theme=${font_color||theme.app}&font-family=${font_family}&font-size=${font_size}`}
                onLoad={onLoad} />
        </>
    )
}
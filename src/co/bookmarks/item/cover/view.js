import s from './view.module.styl'
import React from 'react'
import getThumbUri from '~data/modules/format/thumb'
import getScreenshotUri from '~data/modules/format/screenshot'
import getFaviconUri from '~data/modules/format/favicon'
import size from './size'
import Preloader from '~co/common/preloader'
import { transformImageUrl } from '~co/bookmarks/edit/form/carousel/helper'

//cache thumb/screenshot uri
const thumbs = {}
const getUri = (uri, mode='', domain)=>{
    if (!thumbs[uri])
        switch (mode) {
            case 'screenshot':
                thumbs[uri] = getScreenshotUri(uri)
                break

            case 'favicon':
                thumbs[uri] = domain ? getFaviconUri(domain) : getThumbUri(uri)
                break
        
            default:
                thumbs[uri] = getThumbUri(uri)
                break
        }
    return thumbs[uri]
}

//pixel density
const dpr = {
    grid: (window.devicePixelRatio||1)+1,
    masonry: (window.devicePixelRatio||1)+1,
    default: window.devicePixelRatio||1
}

//main component
export default class BookmarkItemCover extends React.PureComponent {
    static defaultProps = {
        cover:  '',
        link:   '', //required
        view:   'list',
        indicator:false
    }

    state = {
        loaded: this.props.indicator ? false : true
    }

    onImageLoadStart = ()=>
        this.setState({ loaded: false })

    onImageLoadSuccess = ()=>
        this.setState({ loaded: true })

    onImageError = (e) => {
        const { cover } = this.props
        const img = e.target
        if (!img) return

        // 1. Try raw direct cover if it was routed through rdl.ink
        if (cover && cover !== '<screenshot>' && !img.dataset.triedDirect) {
            img.dataset.triedDirect = 'true'
            let directUrl = cover
            const match = cover.match(/https?:\/\/[^\s<>"]+/i)
            if (match) directUrl = match[0]
            const transformed = transformImageUrl(directUrl, true)
            img.src = transformed ? transformed.url : directUrl
            return
        }

        // 2. Try weserv image proxy
        if (cover && cover.startsWith('http') && !img.dataset.triedProxy) {
            img.dataset.triedProxy = 'true'
            const clean = cover.match(/https?:\/\/[^\s<>"]+/i)?.[0] || cover
            img.src = `https://images.weserv.nl/?url=${encodeURIComponent(clean)}`
            return
        }

        if (this.props.indicator) {
            this.onImageLoadSuccess()
        }
    }

    renderImage = ()=>{
        const { cover, view, link, domain, coverSize, indicator, ...etc } = this.props
        let { width, height, ar } = size(view, coverSize) //use height only for img element
        let uri

        switch(view){
            //simple always have a favicon
            case 'simple':
                if (link)
                    uri = getUri(link, 'favicon', domain)
                break

            //in other view modes we show a thumbnail or screenshot
            default:
                if (cover && cover!='<screenshot>') {
                    let cleanCover = cover
                    const match = cover.match(/https?:\/\/[^\s<>"]+/i)
                    if (match) cleanCover = match[0]
                    const transformed = transformImageUrl(cleanCover, true)
                    const finalCover = transformed ? transformed.url : cleanCover
                    // For data: URLs or already-CDN URLs, skip the rdl.ink proxy
                    if (finalCover.startsWith('data:') || finalCover.includes('images.weserv.nl') || finalCover.includes('drive.google.com/thumbnail')) {
                        uri = finalCover
                    } else {
                        uri = getUri(finalCover)
                    }
                }
                else if (link)
                    uri = getUri(link, 'screenshot')
                break
        }

        let mode
        switch(view) {
            case 'grid':
                mode = 'fillmax'
                break

            default:
                mode = 'crop'
                break
        }

        // Check if uri is a direct image (data: or non-rdl.ink CDN) — skip thumb query params
        const isDirectUri = uri && (uri.startsWith('data:') || uri.includes('images.weserv.nl') || uri.includes('drive.google.com/thumbnail'))
        const srcUrl = isDirectUri ? uri : (uri && `${uri}?mode=${mode}&fill=solid&width=${width||''}&ar=${ar||''}&dpr=${dpr[view]||dpr.default}`)
        const srcSetUrl = isDirectUri ? uri : (uri && `${uri}?mode=${mode}&fill=solid&format=webp&width=${width||''}&ar=${ar||''}&dpr=${dpr[view]||dpr.default}`)

        return (
            <>
                <source
                    srcSet={srcSetUrl}
                    type='image/webp' />

                <img 
                    tabIndex='-1'
                    className={s.image}
                    data-ar={ar}
                    width={width}
                    height={height}
                    alt=' '
                    referrerPolicy='no-referrer'
                    {...etc}
                    src={srcUrl}
                    //type='image/jpeg'
                    onLoadStart={indicator ? this.onImageLoadStart : undefined}
                    onLoad={indicator ? this.onImageLoadSuccess : undefined}
                    onError={this.onImageError} />
            </>
        )
    }

    render() {
        const { className='', view, indicator } = this.props
        const { loaded } = this.state

        return (
            <picture 
                role='img'
                className={s.wrap+' '+s[view]+' '+className}>
                {this.renderImage()}
                {!loaded && indicator && <div className={s.preloader}><Preloader /></div>}
            </picture>
        )
    }
}
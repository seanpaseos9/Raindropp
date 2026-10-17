/**
 * Duplicate bookmark links detection helper.
 * Normalizes bookmark URLs (ignoring protocol variations, trailing slashes, www, tracking params)
 * and detects duplicate links across all bookmarks.
 */

export function normalizeBookmarkLink(rawLink = '') {
    if (!rawLink || typeof rawLink !== 'string') return ''
    try {
        let url = rawLink.trim()
        if (!url) return ''
        
        // Ensure protocol for URL parsing
        if (!/^https?:\/\//i.test(url)) {
            url = 'https://' + url
        }

        const parsed = new URL(url)
        const host = parsed.hostname.toLowerCase().replace(/^www\./, '')
        const pathname = (parsed.pathname || '').replace(/\/+$/, '')

        // Remove tracking / analytics parameters
        const searchParams = new URLSearchParams(parsed.search)
        const trackingParams = [
            'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
            'fbclid', 'gclid', 'msclkid', 'mc_cid', 'mc_eid', 'ref', 'source', 'feature'
        ]
        trackingParams.forEach(p => searchParams.delete(p))

        // Sort remaining query params for consistent matching
        searchParams.sort()
        const search = searchParams.toString() ? `?${searchParams.toString()}` : ''

        return `${host}${pathname}${search}`
    } catch (e) {
        return (rawLink || '').trim().toLowerCase().replace(/\/+$/, '')
    }
}

export function findDuplicateBookmarks(bookmarks = []) {
    if (!Array.isArray(bookmarks) || !bookmarks.length) return []

    const linkCounts = new Map()
    for (const b of bookmarks) {
        if (!b || !b.link) continue
        const key = normalizeBookmarkLink(b.link)
        if (key) {
            linkCounts.set(key, (linkCounts.get(key) || 0) + 1)
        }
    }

    return bookmarks.filter(b => {
        if (!b || !b.link) return false
        const key = normalizeBookmarkLink(b.link)
        return key && (linkCounts.get(key) || 0) > 1
    })
}

export function getDuplicatesCount(bookmarks = []) {
    return findDuplicateBookmarks(bookmarks).length
}

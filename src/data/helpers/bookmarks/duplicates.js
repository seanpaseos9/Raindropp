/**
 * Detect exact duplicate links and lower-confidence similar bookmark titles.
 */

export function normalizeBookmarkLink(rawLink = '') {
    if (!rawLink || typeof rawLink !== 'string') return ''
    try {
        let url = rawLink.trim()
        if (!url) return ''
        if (!/^https?:\/\//i.test(url)) url = 'https://' + url

        const parsed = new URL(url)
        const host = parsed.hostname.toLowerCase().replace(/^www\./, '')
        const pathname = (parsed.pathname || '').replace(/\/+$/, '')
        const searchParams = new URLSearchParams(parsed.search)
        const trackingParams = [
            'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
            'fbclid', 'gclid', 'msclkid', 'mc_cid', 'mc_eid', 'ref', 'source', 'feature'
        ]
        trackingParams.forEach(param => searchParams.delete(param))
        searchParams.sort()
        const search = searchParams.toString() ? `?${searchParams.toString()}` : ''

        return `${host}${pathname}${search}`
    } catch (e) {
        return rawLink.trim().toLowerCase().replace(/\/+$/, '')
    }
}

function normalizeTitle(title = '') {
    return String(title)
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\b(copy|duplicate|\d{1,3})\b/g, ' ')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
        .replace(/\s+/g, ' ')
}

function titleTokens(title = '') {
    return [...new Set(normalizeTitle(title).split(' ').filter(token => token.length > 2))]
}

function titleSimilarity(left, right) {
    const leftTokens = titleTokens(left)
    const rightTokens = titleTokens(right)
    if (leftTokens.length < 2 || rightTokens.length < 2) return 0
    const rightSet = new Set(rightTokens)
    const intersection = leftTokens.filter(token => rightSet.has(token)).length
    const union = new Set([...leftTokens, ...rightTokens]).size
    return union ? intersection / union : 0
}

/** Returns annotated duplicate entries for the Duplicates collection. */
export function findDuplicateEntries(bookmarks = []) {
    if (!Array.isArray(bookmarks) || !bookmarks.length) return []

    const byId = new Map()
    const linkGroups = new Map()
    const titleGroups = new Map()

    bookmarks.forEach((bookmark, index) => {
        if (!bookmark) return
        const id = bookmark._id ?? `index:${index}`
        byId.set(id, { bookmark, id, kind: '', matchId: null, size: 0 })

        const linkKey = normalizeBookmarkLink(bookmark.link)
        if (linkKey) {
            if (!linkGroups.has(linkKey)) linkGroups.set(linkKey, [])
            linkGroups.get(linkKey).push(id)
        }

        const titleKey = normalizeTitle(bookmark.title)
        if (titleKey.length >= 8) {
            if (!titleGroups.has(titleKey)) titleGroups.set(titleKey, [])
            titleGroups.get(titleKey).push(id)
        }
    })

    const markGroup = (ids, kind) => {
        ids.forEach(id => {
            const entry = byId.get(id)
            if (!entry) return
            if (kind === 'link' || !entry.kind) {
                entry.kind = kind
                entry.matchId = ids.find(otherId => otherId !== id) ?? null
                entry.size = ids.length
            }
        })
    }

    linkGroups.forEach(ids => {
        if (ids.length > 1) markGroup(ids, 'link')
    })

    // Exact normalized titles are useful even when links differ.
    titleGroups.forEach(ids => {
        if (ids.length > 1) markGroup(ids, 'title')
    })

    // Find close title variants through shared, non-rare words. This avoids an
    // all-pairs comparison for large bookmark collections.
    const titleCandidates = [...byId.values()].filter(entry =>
        entry.bookmark.title && normalizeTitle(entry.bookmark.title).length >= 12
    )
    const tokenCounts = new Map()
    titleCandidates.forEach(entry => titleTokens(entry.bookmark.title).forEach(token => {
        tokenCounts.set(token, (tokenCounts.get(token) || 0) + 1)
    }))

    const tokenIndex = new Map()
    titleCandidates.forEach(entry => {
        titleTokens(entry.bookmark.title)
            .filter(token => (tokenCounts.get(token) || 0) <= 50)
            .forEach(token => {
                if (!tokenIndex.has(token)) tokenIndex.set(token, [])
                tokenIndex.get(token).push(entry)
            })
    })

    const similarPairs = new Set()
    tokenIndex.forEach(entries => {
        for (let i = 0; i < entries.length; i++) {
            for (let j = i + 1; j < entries.length; j++) {
                const left = entries[i]
                const right = entries[j]
                const pairKey = [String(left.id), String(right.id)].sort().join('|')
                if (similarPairs.has(pairKey)) continue
                similarPairs.add(pairKey)

                const leftLink = normalizeBookmarkLink(left.bookmark.link)
                const rightLink = normalizeBookmarkLink(right.bookmark.link)
                if (leftLink && leftLink === rightLink) continue
                if (titleSimilarity(left.bookmark.title, right.bookmark.title) < 0.8) continue

                for (const [entry, other] of [[left, right], [right, left]]) {
                    const annotated = byId.get(entry.id)
                    if (annotated && !annotated.kind) {
                        annotated.kind = 'title'
                        annotated.matchId = other.id
                        annotated.size = 2
                    }
                }
            }
        }
    })

    return [...byId.values()]
        .filter(entry => entry.kind)
        .map(({ bookmark, kind, matchId, size }) => ({
            ...bookmark,
            duplicateKind: kind,
            duplicateMatchId: typeof matchId === 'number' ? matchId : null,
            duplicateGroupSize: size
        }))
}

export function findDuplicateBookmarks(bookmarks = []) {
    return findDuplicateEntries(bookmarks).filter(bookmark => bookmark.duplicateKind === 'link')
}

export function getDuplicatesCount(bookmarks = []) {
    return findDuplicateEntries(bookmarks).length
}

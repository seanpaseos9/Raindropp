/**
 * Helper to scan bookmark note string and extract valid image URLs,
 * including direct image files (.jpg, .jpeg, .png, .gif, .webp, .svg, .avif)
 * and Google Drive / Google Photos share links transformed into direct viewable URLs,
 * with full support for image captions, titles, star ratings, and note persistence.
 */

export function transformImageUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return null

    const trimmed = rawUrl.trim()

    // 1. Google Drive share links
    const driveFileMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i)
    if (driveFileMatch) {
        const fileId = driveFileMatch[1]
        return {
            url: `https://lh3.googleusercontent.com/d/${fileId}`,
            fallbackUrl: `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`,
            defaultTitle: 'Google Drive Image',
            source: 'Google Drive'
        }
    }

    const driveIdMatch = trimmed.match(/drive\.google\.com\/(?:open|uc|thumbnail)\?(?:[^\s]*&)?id=([a-zA-Z0-9_-]+)/i)
    if (driveIdMatch) {
        const fileId = driveIdMatch[1]
        return {
            url: `https://lh3.googleusercontent.com/d/${fileId}`,
            fallbackUrl: `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`,
            defaultTitle: 'Google Drive Image',
            source: 'Google Drive'
        }
    }

    const shareGoogleDrive = trimmed.match(/share\.google(?:\.com)?\/(?:d\/|file\/d\/)?([a-zA-Z0-9_-]{20,})/i)
    if (shareGoogleDrive) {
        const fileId = shareGoogleDrive[1]
        return {
            url: `https://lh3.googleusercontent.com/d/${fileId}`,
            fallbackUrl: `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`,
            defaultTitle: 'Google Drive Image',
            source: 'Google Drive'
        }
    }

    // 2. Google Photos / Google user content direct
    if (/lh3\.googleusercontent\.com/i.test(trimmed)) {
        return {
            url: trimmed,
            fallbackUrl: trimmed,
            defaultTitle: 'Google Photos Image',
            source: 'Google Photos'
        }
    }

    // 3. Direct image extensions (.jpg, .jpeg, .png, .gif, .webp, .svg, .avif)
    const directExtMatch = trimmed.match(/\.(jpg|jpeg|png|gif|webp|svg|avif)(?:\?[^\s<>"')]*)?(?:#[^\s<>"')]*)?$/i)
    if (directExtMatch) {
        const pathname = trimmed.split('?')[0].split('#')[0]
        const rawFilename = pathname.split('/').pop() || 'Image'
        const cleanName = decodeURIComponent(rawFilename)
            .replace(/[-_]+/g, ' ')
            .replace(/\.[a-zA-Z0-9]+$/, '')
        return {
            url: trimmed,
            fallbackUrl: trimmed,
            defaultTitle: cleanName || 'Image',
            source: 'Image'
        }
    }

    return null
}

/**
 * Extracts rating (0-5) from caption or title attribute and returns clean text.
 */
export function parseRatingAndCleanCaption(rawCaption = '', rawTitle = '') {
    let rating = 0
    let clean = (rawCaption || '').trim()

    // 1. Check title attribute first (e.g. "rating:4" or "Sunset rating:5")
    if (rawTitle) {
        const rMatch = rawTitle.match(/rating[:=]\s*([0-5])/i)
        if (rMatch) {
            rating = parseInt(rMatch[1], 10)
        }
    }

    // 2. Check caption text if rating was not found in title
    if (!rating && clean) {
        const rMatch = clean.match(/rating[:=]\s*([0-5])/i)
        if (rMatch) {
            rating = parseInt(rMatch[1], 10)
        } else {
            // Check for ★ symbols
            const starCount = (clean.match(/★/g) || []).length
            if (starCount > 0 && starCount <= 5) {
                rating = starCount
            } else {
                const numStarMatch = clean.match(/★\s*([1-5])/)
                if (numStarMatch) rating = parseInt(numStarMatch[1], 10)
            }
        }
    }

    // Clean out rating tags from displayed caption
    clean = clean
        .replace(/rating[:=]\s*[0-5]/gi, '')
        .replace(/[★☆]+/g, '')
        .replace(/\[\s*\]/g, '')
        .replace(/\s+/g, ' ')
        .trim()

    return {
        rating: Math.max(0, Math.min(5, rating)),
        cleanCaption: clean
    }
}

export function extractImageUrls(text = '') {
    if (!text || typeof text !== 'string') {
        return {
            hasImages: false,
            images: [],
            cleanText: text || ''
        }
    }

    const images = []
    const seenUrls = new Set()

    // 1. Scan for Markdown image syntax: ![caption/title](url "optional title")
    const mdRegex = /!\[([^\]]*)\]\((https?:\/\/[^\s)"]+)(?:\s+"([^"]*)")?\)/gi
    let match
    while ((match = mdRegex.exec(text)) !== null) {
        const [fullMatch, alt, rawUrl, optionalTitle] = match
        const info = transformImageUrl(rawUrl)
        if (info && !seenUrls.has(info.url)) {
            seenUrls.add(info.url)
            const { rating, cleanCaption } = parseRatingAndCleanCaption(alt, optionalTitle)
            images.push({
                originalUrl: rawUrl,
                url: info.url,
                fallbackUrl: info.fallbackUrl,
                title: cleanCaption || info.defaultTitle,
                caption: cleanCaption,
                rating: rating,
                source: info.source,
                rawMatch: fullMatch
            })
        }
    }

    // 2. Scan for URLs followed by quotes: https://... "My Caption" or - My Caption
    const quotedUrlRegex = /(https?:\/\/[^\s<>"')]+)\s+(?:"([^"]+)"|'([^']+)'|[-–—]\s*([^\n\r]+))/gi
    while ((match = quotedUrlRegex.exec(text)) !== null) {
        const [fullMatch, rawUrl, q1, q2, dashCaption] = match
        const cleanRaw = rawUrl.replace(/[.,!?;:]+$/, '')
        const info = transformImageUrl(cleanRaw)
        if (info && !seenUrls.has(info.url)) {
            seenUrls.add(info.url)
            const rawCap = (q1 || q2 || dashCaption || '').trim()
            const { rating, cleanCaption } = parseRatingAndCleanCaption(rawCap)
            images.push({
                originalUrl: cleanRaw,
                url: info.url,
                fallbackUrl: info.fallbackUrl,
                title: cleanCaption || info.defaultTitle,
                caption: cleanCaption,
                rating: rating,
                source: info.source,
                rawMatch: fullMatch
            })
        }
    }

    // 3. Scan for standalone URLs in the text
    const urlRegex = /(https?:\/\/[^\s<>"')]+)/gi
    while ((match = urlRegex.exec(text)) !== null) {
        const rawUrl = match[1]
        const cleanRaw = rawUrl.replace(/[.,!?;:]+$/, '')
        const info = transformImageUrl(cleanRaw)
        if (info && !seenUrls.has(info.url)) {
            seenUrls.add(info.url)
            images.push({
                originalUrl: cleanRaw,
                url: info.url,
                fallbackUrl: info.fallbackUrl,
                title: info.defaultTitle,
                caption: '',
                rating: 0,
                source: info.source,
                rawMatch: cleanRaw
            })
        }
    }

    // 4. Build clean text by removing/collapsing the raw image markup
    let cleanText = text
    for (const img of images) {
        if (img.rawMatch) {
            cleanText = cleanText.split(img.rawMatch).join('')
        }
    }

    // Clean up leftover empty lines and whitespaces
    cleanText = cleanText
        .split('\n')
        .map(line => line.trim())
        .filter((line, i, arr) => line !== '' || (i > 0 && arr[i - 1] !== ''))
        .join('\n')
        .trim()

    return {
        hasImages: images.length > 0,
        images,
        cleanText
    }
}

/**
 * Formats a new image link entry for the note with an optional caption and rating.
 */
export function formatImageNoteEntry(url, caption = '', rating = 0) {
    const trimmedUrl = (url || '').trim()
    const trimmedCaption = (caption || '').trim()
    if (!trimmedUrl) return ''

    const ratingAttr = rating > 0 ? ` "rating:${rating}"` : ''
    if (trimmedCaption || rating > 0) {
        return `![${trimmedCaption}](${trimmedUrl}${ratingAttr})`
    }
    return trimmedUrl
}

/**
 * Updates or sets the caption of an existing image in the raw note string while preserving rating.
 */
export function updateImageCaptionInNote(note = '', image, newCaption = '') {
    const trimmedCaption = (newCaption || '').trim()
    const newEntry = formatImageNoteEntry(
        image.originalUrl || image.url,
        trimmedCaption,
        image.rating || 0
    )
    if (image.rawMatch && note.includes(image.rawMatch)) {
        return note.replace(image.rawMatch, newEntry)
    }
    return `${note.trim()}\n${newEntry}`
}

/**
 * Updates or sets the star rating (0-5) of an existing image in the raw note string.
 */
export function updateImageRatingInNote(note = '', image, newRating = 0) {
    const newEntry = formatImageNoteEntry(
        image.originalUrl || image.url,
        image.caption || '',
        newRating
    )
    if (image.rawMatch && note.includes(image.rawMatch)) {
        return note.replace(image.rawMatch, newEntry)
    }
    return `${note.trim()}\n${newEntry}`
}

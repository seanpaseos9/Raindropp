/**
 * Helper to scan bookmark note string and extract valid image URLs,
 * including direct image files (.jpg, .jpeg, .png, .gif, .webp, .svg, .avif)
 * and Google Drive / Google Photos share links transformed into direct viewable URLs,
 * with full support for image captions, titles, star ratings, and note persistence.
 */

function getTitleFromUrl(url) {
    try {
        const parsed = new URL(url.startsWith('http') ? url : `https://${url}`)
        const pathname = parsed.pathname || ''
        const rawFilename = pathname.split('/').filter(Boolean).pop() || ''
        if (rawFilename && !/^[0-9a-f]{20,}$/i.test(rawFilename)) {
            const clean = decodeURIComponent(rawFilename)
                .replace(/[-_]+/g, ' ')
                .replace(/\.[a-zA-Z0-9]+$/, '')
                .trim()
            if (clean.length > 1 && clean.length < 50) return clean
        }
        const domain = parsed.hostname.replace(/^www\./, '')
        return `${domain} Image`
    } catch (e) {
        return 'Attached Photo'
    }
}

export function transformImageUrl(rawUrl, isExplicit = false) {
    if (!rawUrl || typeof rawUrl !== 'string') return null

    const trimmed = rawUrl.trim()
    if (!trimmed) return null

    // 1. Google Drive share links
    const driveFileMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i)
    if (driveFileMatch) {
        const fileId = driveFileMatch[1]
        return {
            url: `https://lh3.googleusercontent.com/d/${fileId}`,
            fallbackUrl: `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`,
            defaultTitle: 'Google Drive Photo',
            source: 'Google Drive'
        }
    }

    const driveIdMatch = trimmed.match(/drive\.google\.com\/(?:open|uc|thumbnail)\?(?:[^\s]*&)?id=([a-zA-Z0-9_-]+)/i)
    if (driveIdMatch) {
        const fileId = driveIdMatch[1]
        return {
            url: `https://lh3.googleusercontent.com/d/${fileId}`,
            fallbackUrl: `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`,
            defaultTitle: 'Google Drive Photo',
            source: 'Google Drive'
        }
    }

    const shareGoogleDrive = trimmed.match(/share\.google(?:\.com)?\/(?:d\/|file\/d\/)?([a-zA-Z0-9_-]{20,})/i)
    if (shareGoogleDrive) {
        const fileId = shareGoogleDrive[1]
        return {
            url: `https://lh3.googleusercontent.com/d/${fileId}`,
            fallbackUrl: `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`,
            defaultTitle: 'Google Drive Photo',
            source: 'Google Drive'
        }
    }

    // 2. Google Photos / Google user content direct
    if (/lh[0-9]?\.googleusercontent\.com|yt3\.ggpht\.com/i.test(trimmed)) {
        return {
            url: trimmed,
            fallbackUrl: trimmed,
            defaultTitle: 'Google Photos Image',
            source: 'Google Photos'
        }
    }

    // 3. Direct image extensions (.jpg, .jpeg, .png, .gif, .webp, .svg, .avif, .bmp, .tiff, .ico, .heic)
    const directExtMatch = trimmed.match(/\.(jpe?g|png|gif|webp|svg|avif|bmp|tiff|ico|heic)(?:[?#&][^\s<>"')]*)?$/i)
    if (directExtMatch) {
        const pathname = trimmed.split('?')[0].split('#')[0]
        const rawFilename = pathname.split('/').pop() || 'Photo'
        const cleanName = decodeURIComponent(rawFilename)
            .replace(/[-_]+/g, ' ')
            .replace(/\.[a-zA-Z0-9]+$/, '')
        return {
            url: trimmed,
            fallbackUrl: trimmed,
            defaultTitle: cleanName || 'Photo',
            source: 'Image'
        }
    }

    // 4. Image format in query parameters (common in "Copy Image Address", CDNs, Twitter/X, Reddit)
    // e.g. ?format=jpg, ?fmt=webp, ?fm=png, ?ext=jpg, ?auto=format, ?mime=image/jpeg
    if (/[?&](?:format|fmt|fm|ext)=(?:jpe?g|png|gif|webp|avif)/i.test(trimmed) ||
        /[?&]auto=format/i.test(trimmed) ||
        /[?&](?:mime|type)=image/i.test(trimmed)) {
        return {
            url: trimmed,
            fallbackUrl: trimmed,
            defaultTitle: getTitleFromUrl(trimmed),
            source: 'Web Image'
        }
    }

    // 5. Common image hosts and CDNs where "Copy Image Address" often lacks standard file extensions
    const isImageHost = /(?:images\.unsplash\.com|unsplash\.com\/photos|pbs\.twimg\.com|twimg\.com|i\.redd\.it|preview\.redd\.it|external-preview\.redd\.it|cdn\.discordapp\.com|media\.discordapp\.net|blogger\.googleusercontent\.com|cdninstagram\.com|instagram\.f[a-z0-9-]+\.net|i\.pinimg\.com|pinimg\.com|cloudinary\.com|staticflickr\.com|flickr\.com|i\.imgur\.com|imgur\.com|media\.giphy\.com|giphy\.com|c\.tenor\.com|tenor\.com|upload\.wikimedia\.org|user-images\.githubusercontent\.com|raw\.githubusercontent\.com|avatars\.githubusercontent\.com|i[0-9]\.wp\.com|gravatar\.com|cdn\.shopify\.com|imagedelivery\.net|cloudfront\.net|fbcdn\.net|freepik\.com|pexels\.com|pixabay\.com|alamy\.com|gettyimages\.com|istockphoto\.com|wixstatic\.com|squarespace-cdn\.com)/i.test(trimmed)
    if (isImageHost) {
        return {
            url: trimmed,
            fallbackUrl: trimmed,
            defaultTitle: getTitleFromUrl(trimmed),
            source: 'Web Photo'
        }
    }

    // 6. Path heuristics (URLs containing image-specific path segments)
    // e.g. /image/123, /photos/abc, /uploads/2024/05/xyz, /attachments/...
    if (/\/(?:images?|imgs?|photos?|pics?|pictures?|media|attachments|thumbnails?|avatars?|uploads|assets\/images?)\//i.test(trimmed)) {
        return {
            url: trimmed,
            fallbackUrl: trimmed,
            defaultTitle: getTitleFromUrl(trimmed),
            source: 'Image'
        }
    }

    // 7. Base64 data image URIs
    if (/^data:image\/(?:jpe?g|png|gif|webp|svg\+xml);base64,/i.test(trimmed)) {
        return {
            url: trimmed,
            fallbackUrl: trimmed,
            defaultTitle: 'Embedded Image',
            source: 'Image'
        }
    }

    // 8. Explicit Image Links (inserted via "Add Photo(s)" or Markdown ![...](url))
    // If the user explicitly declared or inserted this as an image, accept ANY valid HTTP/HTTPS URL
    if (isExplicit && /^https?:\/\/[^\s<>"')]+/i.test(trimmed)) {
        return {
            url: trimmed,
            fallbackUrl: trimmed,
            defaultTitle: getTitleFromUrl(trimmed),
            source: 'Web Image'
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
    const matchedRanges = []

    // 1. Scan for Markdown image syntax: ![caption/title](url "optional title")
    const mdRegex = /!\[([^\]]*)\]\((https?:\/\/[^\s)"]+|data:image\/[^\s)"]+)(?:\s+"([^"]*)")?\)/gi
    let match
    while ((match = mdRegex.exec(text)) !== null) {
        const [fullMatch, alt, rawUrl, optionalTitle] = match
        const info = transformImageUrl(rawUrl, true)
        if (info) {
            matchedRanges.push(fullMatch)
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

    // 2. Scan for URLs followed by quotes: https://... "My Caption"
    const quotedUrlRegex = /(https?:\/\/[^\s<>"')]+)\s+(?:"([^"]+)"|'([^']+)'|[-–—]\s*([^\n\r]+))/gi
    while ((match = quotedUrlRegex.exec(text)) !== null) {
        const [fullMatch, rawUrl, q1, q2, dashCaption] = match
        const cleanRaw = rawUrl.replace(/[.,!?;:]+$/, '')
        // Skip if this part was already matched inside markdown
        if (matchedRanges.some(m => m.includes(cleanRaw))) continue

        const info = transformImageUrl(cleanRaw, true)
        if (info) {
            matchedRanges.push(fullMatch)
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
    const urlRegex = /(https?:\/\/[^\s<>"')]+|data:image\/[^\s<>"')]+)/gi
    while ((match = urlRegex.exec(text)) !== null) {
        const rawUrl = match[1]
        const cleanRaw = rawUrl.replace(/[.,!?;:]+$/, '')
        if (matchedRanges.some(m => m.includes(cleanRaw))) continue

        const info = transformImageUrl(cleanRaw, false)
        if (info) {
            matchedRanges.push(cleanRaw)
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

    // 4. Build clean text by removing the raw image markup
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
 * Formats a single image link entry for the note with an optional caption and rating.
 * Always formats as Markdown image so it's guaranteed to be treated as an attached photo.
 */
export function formatImageNoteEntry(url, caption = '', rating = 0) {
    const trimmedUrl = (url || '').trim()
    const trimmedCaption = (caption || '').trim()
    if (!trimmedUrl) return ''

    const ratingAttr = rating > 0 ? ` "rating:${rating}"` : ''
    const altText = trimmedCaption || 'Photo'
    return `![${altText}](${trimmedUrl}${ratingAttr})`
}

/**
 * Formats one or multiple image entries from user input.
 * Supports pasting multiple URLs separated by newlines, commas, or spaces.
 */
export function formatMultipleImageEntries(rawInput = '', caption = '', rating = 0) {
    if (!rawInput || typeof rawInput !== 'string') return []

    // Match all http/https, data:image, or Google Drive URLs in the input
    const urlMatches = rawInput.match(/https?:\/\/[^\s,;"'<>]+|data:image\/[^\s,;"'<>]+|drive\.google\.com\/[^\s,;"'<>]+/gi) || []

    const candidates = urlMatches.length > 0
        ? urlMatches
        : rawInput.split(/[\r\n,]+/).map(s => s.trim()).filter(Boolean)

    const entries = []
    candidates.forEach((rawUrl, idx) => {
        let cleanUrl = rawUrl.trim().replace(/[.,;]+$/, '')
        if (!cleanUrl) return
        if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://') && !cleanUrl.startsWith('data:image/')) {
            cleanUrl = 'https://' + cleanUrl
        }
        const itemCaption = candidates.length > 1 && caption ? `${caption} ${idx + 1}` : caption
        const entry = formatImageNoteEntry(cleanUrl, itemCaption, rating)
        if (entry) entries.push(entry)
    })

    return entries
}

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Updates or sets the caption of an existing image in the raw note string while preserving rating.
 */
export function updateImageCaptionInNote(note = '', image = {}, newCaption = '') {
    const trimmedCaption = (newCaption || '').trim()
    const targetUrl = image.originalUrl || image.url || ''
    const rating = typeof image.rating === 'number' ? image.rating : 0
    const newEntry = formatImageNoteEntry(targetUrl, trimmedCaption, rating)

    if (image.rawMatch && note.includes(image.rawMatch)) {
        return note.replace(image.rawMatch, newEntry)
    }

    if (targetUrl && note.includes(targetUrl)) {
        const regex = new RegExp(`!\\[[^\\]]*\\]\\(${escapeRegex(targetUrl)}[^)]*\\)|${escapeRegex(targetUrl)}`, 'g')
        if (regex.test(note)) {
            return note.replace(regex, newEntry)
        }
    }

    return note ? `${note.trim()}\n${newEntry}` : newEntry
}

/**
 * Updates or sets the star rating (0-5) of an existing image in the raw note string.
 */
export function updateImageRatingInNote(note = '', image = {}, newRating = 0) {
    const targetUrl = image.originalUrl || image.url || ''
    const caption = (image.caption || '').trim()
    const newEntry = formatImageNoteEntry(targetUrl, caption, newRating)

    if (image.rawMatch && note.includes(image.rawMatch)) {
        return note.replace(image.rawMatch, newEntry)
    }

    if (targetUrl && note.includes(targetUrl)) {
        const regex = new RegExp(`!\\[[^\\]]*\\]\\(${escapeRegex(targetUrl)}[^)]*\\)|${escapeRegex(targetUrl)}`, 'g')
        if (regex.test(note)) {
            return note.replace(regex, newEntry)
        }
    }

    return note ? `${note.trim()}\n${newEntry}` : newEntry
}

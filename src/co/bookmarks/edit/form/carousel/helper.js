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

    let trimmed = rawUrl.trim()
    if (!trimmed) return null

    // Unescape XML/HTML entities like &amp;
    trimmed = trimmed.replace(/&amp;/g, '&')

    // 1. Google Drive share links
    const driveMatch = trimmed.match(/drive\.google\.com\/(?:file\/d\/|(?:open|uc|thumbnail)\?(?:[^\s]*&)?id=|file\/u\/\d+\/d\/)([a-zA-Z0-9_-]{15,})/i) ||
                       trimmed.match(/share\.google(?:\.com)?\/(?:d\/|file\/d\/)?([a-zA-Z0-9_-]{15,})/i) ||
                       trimmed.match(/drive\.usercontent\.google\.com\/download\?(?:[^\s]*&)?id=([a-zA-Z0-9_-]{15,})/i)
    if (driveMatch) {
        const fileId = driveMatch[1]
        return {
            url: `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`,
            fallbackUrl: `https://drive.usercontent.google.com/download?id=${fileId}&export=view`,
            defaultTitle: 'Google Drive Photo',
            source: 'Google Drive'
        }
    }

    // 2. Google Photos / Google user content direct
    if (/lh[0-9]?\.googleusercontent\.com|yt3\.ggpht\.com/i.test(trimmed)) {
        return {
            url: trimmed,
            fallbackUrl: `https://images.weserv.nl/?url=${encodeURIComponent(trimmed)}`,
            defaultTitle: 'Google Photos Image',
            source: 'Google Photos'
        }
    }

    // 3. Imgur links (convert page/gallery links to direct images)
    const imgurMatch = trimmed.match(/(?:i\.)?imgur\.com\/(?:gallery\/|a\/)?([a-zA-Z0-9]{5,})(?:\.[a-zA-Z0-9]+)?/i)
    if (imgurMatch) {
        const id = imgurMatch[1]
        const direct = `https://i.imgur.com/${id}.jpg`
        return {
            url: direct,
            fallbackUrl: `https://images.weserv.nl/?url=${encodeURIComponent(direct)}`,
            defaultTitle: 'Imgur Image',
            source: 'Imgur'
        }
    }

    // 4. Dropbox links (ensure raw=1 to bypass HTML viewer)
    if (/dropbox\.com\//i.test(trimmed)) {
        const cleanDropbox = trimmed.replace(/[?&](?:dl|raw)=[01]/g, '')
        const direct = cleanDropbox + (cleanDropbox.includes('?') ? '&raw=1' : '?raw=1')
        return {
            url: direct,
            fallbackUrl: `https://images.weserv.nl/?url=${encodeURIComponent(direct)}`,
            defaultTitle: getTitleFromUrl(trimmed),
            source: 'Dropbox'
        }
    }

    // 5. Raindrop API file / upload or numeric ID
    const raindropFileMatch = trimmed.match(/(?:raindrop(?:\.io)?(?:\/rest\/v1)?\/file\/([0-9a-zA-Z_-]+)|up\.raindrop\.io\/([0-9a-zA-Z_-]+)|^\/?(?:rest\/)?v1\/raindrop\/file\/([0-9a-zA-Z_-]+)|^([0-9]{6,12})$)/i)
    if (raindropFileMatch) {
        const fileId = raindropFileMatch[1] || raindropFileMatch[2] || raindropFileMatch[3] || raindropFileMatch[4]
        return {
            url: `https://api.raindrop.io/rest/v1/raindrop/file/${fileId}`,
            fallbackUrl: `https://up.raindrop.io/${fileId}`,
            defaultTitle: `Attached Photo ${fileId}`,
            source: 'Raindrop'
        }
    }

    // 6. Direct image extensions (.jpg, .jpeg, .png, .gif, .webp, .svg, .avif, .bmp, .tiff, .ico, .heic)
    const directExtMatch = trimmed.match(/\.(jpe?g|png|gif|webp|svg|avif|bmp|tiff|ico|heic)(?:[?#&][^\s<>"')]*)?$/i)
    if (directExtMatch) {
        const pathname = trimmed.split('?')[0].split('#')[0]
        const rawFilename = pathname.split('/').pop() || 'Photo'
        const cleanName = decodeURIComponent(rawFilename)
            .replace(/[-_]+/g, ' ')
            .replace(/\.[a-zA-Z0-9]+$/, '')
        return {
            url: trimmed,
            fallbackUrl: `https://images.weserv.nl/?url=${encodeURIComponent(trimmed)}`,
            defaultTitle: cleanName || 'Photo',
            source: 'Image'
        }
    }

    // 7. Image format in query parameters (common in "Copy Image Address", CDNs, Twitter/X, Reddit)
    // e.g. ?format=jpg, ?fmt=webp, ?fm=png, ?ext=jpg, ?auto=format, ?mime=image/jpeg
    if (/[?&](?:format|fmt|fm|ext)=(?:jpe?g|png|gif|webp|avif)/i.test(trimmed) ||
        /[?&]auto=format/i.test(trimmed) ||
        /[?&](?:mime|type)=image/i.test(trimmed)) {
        return {
            url: trimmed,
            fallbackUrl: `https://images.weserv.nl/?url=${encodeURIComponent(trimmed)}`,
            defaultTitle: getTitleFromUrl(trimmed),
            source: 'Web Image'
        }
    }

    // 8. Common image hosts and CDNs where "Copy Image Address" often lacks standard file extensions
    const isImageHost = /(?:images\.unsplash\.com|unsplash\.com\/photos|pbs\.twimg\.com|twimg\.com|i\.redd\.it|preview\.redd\.it|external-preview\.redd\.it|cdn\.discordapp\.com|media\.discordapp\.net|blogger\.googleusercontent\.com|cdninstagram\.com|instagram\.f[a-z0-9-]+\.net|i\.pinimg\.com|pinimg\.com|cloudinary\.com|staticflickr\.com|flickr\.com|media\.giphy\.com|giphy\.com|c\.tenor\.com|tenor\.com|upload\.wikimedia\.org|user-images\.githubusercontent\.com|raw\.githubusercontent\.com|avatars\.githubusercontent\.com|i[0-9]\.wp\.com|gravatar\.com|cdn\.shopify\.com|imagedelivery\.net|cloudfront\.net|fbcdn\.net|freepik\.com|pexels\.com|pixabay\.com|alamy\.com|gettyimages\.com|istockphoto\.com|wixstatic\.com|squarespace-cdn\.com)/i.test(trimmed)
    if (isImageHost) {
        return {
            url: trimmed,
            fallbackUrl: `https://images.weserv.nl/?url=${encodeURIComponent(trimmed)}`,
            defaultTitle: getTitleFromUrl(trimmed),
            source: 'Web Photo'
        }
    }

    // 9. Path heuristics (URLs containing image-specific path segments)
    // e.g. /image/123, /photos/abc, /uploads/2024/05/xyz, /attachments/...
    if (/\/(?:images?|imgs?|photos?|pics?|pictures?|media|attachments|thumbnails?|avatars?|uploads|assets\/images?)\//i.test(trimmed)) {
        return {
            url: trimmed,
            fallbackUrl: `https://images.weserv.nl/?url=${encodeURIComponent(trimmed)}`,
            defaultTitle: getTitleFromUrl(trimmed),
            source: 'Image'
        }
    }

    // 10. Base64 data image URIs
    if (/^data:image\/(?:jpe?g|png|gif|webp|svg\+xml);base64,/i.test(trimmed)) {
        return {
            url: trimmed,
            fallbackUrl: trimmed,
            defaultTitle: 'Embedded Image',
            source: 'Image'
        }
    }

    // 11. Explicit Image Links (inserted via "Add Photo(s)" or Markdown ![...](url))
    // If the user explicitly declared or inserted this as an image, accept ANY valid HTTP/HTTPS URL
    if (isExplicit && /^https?:\/\/[^\s<>"')]+/i.test(trimmed)) {
        return {
            url: trimmed,
            fallbackUrl: `https://images.weserv.nl/?url=${encodeURIComponent(trimmed)}`,
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

export function extractImageUrls(text = '', item = null) {
    const rawText = typeof text === 'string' ? text : ''

    const images = []
    const matchedRanges = []

    // 1. Scan for Markdown image syntax: ![caption/title](url "optional title")
    const mdRegex = /!\[([^\]]*)\]\((https?:\/\/[^\s)"]+|data:image\/[^\s)"]+|[^\s)"]+)(?:\s+"([^"]*)")?\)/gi
    let match
    while ((match = mdRegex.exec(rawText)) !== null) {
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
    while ((match = quotedUrlRegex.exec(rawText)) !== null) {
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
    while ((match = urlRegex.exec(rawText)) !== null) {
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

    // 4. Also include attached images from bookmark item.media
    if (item && Array.isArray(item.media)) {
        for (const m of item.media) {
            const mediaLink = typeof m === 'string' ? m : m?.link
            if (mediaLink && typeof mediaLink === 'string') {
                const info = transformImageUrl(mediaLink, true)
                if (info && !images.some(img => img.originalUrl === mediaLink || img.url === info.url)) {
                    images.push({
                        originalUrl: mediaLink,
                        url: info.url,
                        fallbackUrl: info.fallbackUrl,
                        title: info.defaultTitle || 'Attached Media',
                        caption: '',
                        rating: 0,
                        source: info.source || 'Bookmark Media',
                        rawMatch: ''
                    })
                }
            }
        }
    }

    // 5. If item.type is 'image' and item.link exists, include it
    if (item && item.type === 'image' && item.link) {
        const info = transformImageUrl(item.link, true)
        if (info && !images.some(img => img.originalUrl === item.link || img.url === info.url)) {
            images.unshift({
                originalUrl: item.link,
                url: info.url,
                fallbackUrl: info.fallbackUrl,
                title: item.title || info.defaultTitle || 'Photo',
                caption: item.title || '',
                rating: item.rating || 0,
                source: info.source || 'Bookmark Image',
                rawMatch: ''
            })
        }
    }

    // 6. If still no images and item.cover is a valid URL (not <screenshot>)
    if (images.length === 0 && item && item.cover && typeof item.cover === 'string' && item.cover !== '<screenshot>' && item.cover.startsWith('http')) {
        const info = transformImageUrl(item.cover, true)
        if (info) {
            images.push({
                originalUrl: item.cover,
                url: info.url,
                fallbackUrl: info.fallbackUrl,
                title: item.title || 'Bookmark Cover',
                caption: '',
                rating: item.rating || 0,
                source: 'Cover',
                rawMatch: ''
            })
        }
    }

    // 7. Build clean text by removing the raw image markup
    let cleanText = rawText
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

/**
 * Universal fallback handler for broken image loads.
 * Attempts fallbackUrl, authenticated fetch for Raindrop API tokens, and weserv image proxy.
 */
export function handleImageLoadError(e, item = {}) {
    const img = e.target
    if (!img) return
    const currentSrc = img.src || ''
    const fallback = item.fallbackUrl || ''
    const original = item.originalUrl || item.url || currentSrc

    // 1. Try fallbackUrl if available and not yet tried
    if (fallback && currentSrc !== fallback && !img.dataset.triedFallback) {
        img.dataset.triedFallback = 'true'
        img.src = fallback
        return
    }

    // 2. If it's a Raindrop API or file URL or token exists in localStorage, try authenticated fetch
    const token = typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem('raindrop_token') : null
    if (token && !img.dataset.triedAuth && (currentSrc.includes('raindrop') || currentSrc.includes('/v1/') || currentSrc.includes('/file/'))) {
        img.dataset.triedAuth = 'true'
        const fetchUrl = original.startsWith('http') ? original : `https://api.raindrop.io/rest/v1/${original.replace(/^\/+/, '')}`
        fetch(fetchUrl, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.ok ? res.blob() : null)
        .then(blob => {
            if (blob) {
                img.src = URL.createObjectURL(blob)
            } else {
                tryProxy()
            }
        })
        .catch(() => tryProxy())
        return
    }

    // 3. Try weserv image proxy if not already tried and it's a standard web URL
    function tryProxy() {
        if (!img.dataset.triedProxy && original && original.startsWith('http') && !original.includes('images.weserv.nl')) {
            img.dataset.triedProxy = 'true'
            img.src = `https://images.weserv.nl/?url=${encodeURIComponent(original)}`
        }
    }

    tryProxy()
}


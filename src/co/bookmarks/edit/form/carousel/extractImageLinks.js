/**
 * Helper to scan bookmark note string for valid image links:
 * - Direct image file extensions (.jpg, .jpeg, .png, .gif, .webp)
 * - Google Drive share links (drive.google.com, docs.google.com)
 * - Google Photos / Google share links (photos.google.com, photos.app.goo.gl, share.google, lh*.googleusercontent.com)
 * - Transforms them into direct viewable image URLs
 * - Produces clean note text with raw image URLs hidden/collapsed
 */

/**
 * Transforms any supported image or cloud share link into a direct viewable image URL.
 * Returns null if the URL is not a recognized image link.
 */
export function transformToViewableUrl(url) {
    if (!url || typeof url !== 'string') return null

    // Trim whitespace and trailing punctuation often attached from natural text (e.g., "http://...jpg.")
    let trimmed = url.trim().replace(/[),.;:!]+$/, '')

    // 1. Direct image file extensions (.jpg, .jpeg, .png, .gif, .webp)
    if (/\.(jpe?g|png|gif|webp)($|[?#])/i.test(trimmed)) {
        return trimmed
    }

    // 2. Google Drive share links
    // e.g., drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view?usp=sharing
    const gDriveFileMatch = trimmed.match(/(?:drive|docs)\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i)
    if (gDriveFileMatch && gDriveFileMatch[1]) {
        return `https://drive.google.com/uc?export=view&id=${gDriveFileMatch[1]}`
    }

    // e.g., drive.google.com/open?id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs or uc?id=...
    const gDriveIdMatch = trimmed.match(/(?:drive|docs)\.google\.com\/(?:open|uc|thumbnail)\?(?:[^#\s]*&)?id=([a-zA-Z0-9_-]+)/i)
    if (gDriveIdMatch && gDriveIdMatch[1]) {
        return `https://drive.google.com/uc?export=view&id=${gDriveIdMatch[1]}`
    }

    // 3. share.google links
    // e.g., https://share.google.com/d/FILE_ID or https://share.google/d/FILE_ID
    const shareGoogleMatch = trimmed.match(/share\.google(?:\.com)?\/(?:d\/|file\/d\/)?([a-zA-Z0-9_-]+)/i)
    if (shareGoogleMatch && shareGoogleMatch[1]) {
        return `https://drive.google.com/uc?export=view&id=${shareGoogleMatch[1]}`
    }

    // 4. Google Photos / Drive CDN (lh*.googleusercontent.com)
    if (/lh[0-9]*\.googleusercontent\.com/i.test(trimmed)) {
        return trimmed
    }

    // 5. Google Photos share links (photos.app.goo.gl or photos.google.com)
    if (/photos\.google\.com|photos\.app\.goo\.gl/i.test(trimmed)) {
        return trimmed
    }

    return null
}

/**
 * Returns alternative fallback URL if primary direct URL fails (e.g., Google Drive CDN fallback)
 */
export function getFallbackImageUrl(url) {
    if (!url) return null

    // If Google Drive uc?export=view, fallback to Google lh3 CDN
    const ucMatch = url.match(/drive\.google\.com\/uc\?(?:[^#\s]*&)?id=([a-zA-Z0-9_-]+)/i)
    if (ucMatch && ucMatch[1]) {
        return `https://lh3.googleusercontent.com/d/${ucMatch[1]}`
    }

    return null
}

/**
 * Scans a bookmark note string and extracts all valid image links in document order,
 * while generating a cleaned note body with the raw image URLs collapsed/hidden.
 *
 * @param {string} rawText The bookmark note content
 * @returns {{ images: Array<{url: string, originalUrl: string, alt: string, fallbackUrl: string|null}>, cleanText: string, hasImages: boolean }}
 */
export function extractImageLinks(rawText) {
    if (!rawText || typeof rawText !== 'string') {
        return { images: [], cleanText: '', hasImages: false }
    }

    const images = []
    const seenUrls = new Set()

    // Match markdown images: ![alt](url), markdown links: [alt](url), or standalone URLs: https?://...
    const tokenRegex = /(!?\[([^\]]*)\]\((https?:\/\/[^\s\)]+)\))|(https?:\/\/[^\s<>\"]+)/gi

    let match
    const matches = []

    while ((match = tokenRegex.exec(rawText)) !== null) {
        const fullToken = match[0]
        const altText = match[2] || ''
        const urlCandidate = match[3] || match[4] || ''

        const viewableUrl = transformToViewableUrl(urlCandidate)
        if (viewableUrl) {
            matches.push({
                startIndex: match.index,
                endIndex: match.index + fullToken.length,
                fullToken,
                originalUrl: urlCandidate,
                viewableUrl,
                fallbackUrl: getFallbackImageUrl(viewableUrl),
                alt: altText || 'Bookmark image'
            })
        }
    }

    if (matches.length === 0) {
        return {
            images: [],
            cleanText: rawText,
            hasImages: false
        }
    }

    // Build unique image array in order of appearance
    matches.forEach(m => {
        if (!seenUrls.has(m.viewableUrl)) {
            seenUrls.add(m.viewableUrl)
            images.push({
                url: m.viewableUrl,
                originalUrl: m.originalUrl,
                fallbackUrl: m.fallbackUrl,
                alt: m.alt
            })
        }
    })

    // Clean note text by removing the matched image URLs / markdown tags
    let cleanText = ''
    let lastIndex = 0

    matches.forEach(m => {
        cleanText += rawText.substring(lastIndex, m.startIndex)
        lastIndex = m.endIndex
    })
    cleanText += rawText.substring(lastIndex)

    // Clean up empty lines or stranded bullet/numbering artifacts (e.g. "1. " left after removing URL)
    cleanText = cleanText
        .split('\n')
        .map(line => line.replace(/^\s*(?:[-*+]|\d+\.)\s*$/, '').trimEnd())
        .filter((line, i, arr) => line.trim().length > 0 || (i > 0 && arr[i - 1].trim().length > 0))
        .join('\n')
        .trim()

    return {
        images,
        cleanText,
        hasImages: images.length > 0
    }
}
export default extractImageLinks

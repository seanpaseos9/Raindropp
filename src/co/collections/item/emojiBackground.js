const paletteCache = new Map()

function leadingEmoji(title = '') {
    const text = String(title).trim()
    if (!text) return ''

    try {
        const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
        const first = segmenter.segment(text)[Symbol.iterator]().next().value?.segment || ''
        return /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(first) ? first : ''
    } catch (e) {
        const first = Array.from(text)[0] || ''
        return /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(first) ? first : ''
    }
}

function emojiColors(emoji) {
    if (paletteCache.has(emoji)) return paletteCache.get(emoji)

    let colors = []
    try {
        const canvas = document.createElement('canvas')
        canvas.width = 48
        canvas.height = 48
        const context = canvas.getContext('2d', { willReadFrequently: true })
        context.font = '40px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif'
        context.textAlign = 'center'
        context.textBaseline = 'middle'
        context.fillText(emoji, 24, 25)

        const { data } = context.getImageData(0, 0, 48, 48)
        const buckets = new Map()
        for (let i = 0; i < data.length; i += 16) {
            const [r, g, b, a] = data.slice(i, i + 4)
            if (a < 100) continue
            const max = Math.max(r, g, b)
            const min = Math.min(r, g, b)
            const saturation = max ? (max - min) / max : 0
            if (max < 24) continue
            if (saturation < 0.16) {
                const key = `neutral-${Math.min(3, Math.floor(max / 64))}`
                const bucket = buckets.get(key) || { r: 0, g: 0, b: 0, count: 0 }
                bucket.r += r
                bucket.g += g
                bucket.b += b
                bucket.count++
                buckets.set(key, bucket)
                continue
            }
            const hue = r === max
                ? ((g - b) / (max - min || 1) + 6) % 6 * 60
                : g === max
                    ? ((b - r) / (max - min || 1) + 2) * 60
                    : ((r - g) / (max - min || 1) + 4) * 60
            const key = `hue-${Math.round(hue / 20) % 18}`
            const bucket = buckets.get(key) || { r: 0, g: 0, b: 0, count: 0 }
            bucket.r += r
            bucket.g += g
            bucket.b += b
            bucket.count++
            buckets.set(key, bucket)
        }

        colors = [...buckets.values()]
            .sort((a, b) => b.count - a.count)
            .slice(0, 3)
            .map(({ r, g, b, count }) => `rgba(${Math.round(r / count)}, ${Math.round(g / count)}, ${Math.round(b / count)}, .24)`)
    } catch (e) {}

    paletteCache.set(emoji, colors)
    return colors
}

export function getEmojiBackground(title) {
    const emoji = leadingEmoji(title)
    if (!emoji || typeof document === 'undefined') return undefined
    const colors = emojiColors(emoji)
    if (!colors.length) return undefined
    const stops = colors.length === 1 ? [colors[0], colors[0]] : colors
    return `linear-gradient(110deg, ${stops.join(', ')})`
}

export function getEmojiAccentColor(title) {
    const emoji = leadingEmoji(title)
    if (!emoji || typeof document === 'undefined') return ''

    const first = emojiColors(emoji)[0]
    if (!first) return ''
    const rgb = first.match(/rgba\((\d+),\s*(\d+),\s*(\d+)/)
    if (rgb) {
        return `#${rgb.slice(1, 4).map(value => parseInt(value, 10).toString(16).padStart(2, '0')).join('')}`
    }

    return ''
}

function hex(r, g, b) {
    return `#${[r, g, b].map(value => Math.round(value).toString(16).padStart(2, '0')).join('')}`
}

function mix(base, color, amount) {
    return base.map((value, i) => value * (1 - amount) + color[i] * amount)
}

export function getEmojiTheme(title, theme = 'day') {
    const emoji = leadingEmoji(title)
    if (!emoji || typeof document === 'undefined') return {}

    const colors = emojiColors(emoji).map(value => {
        const match = value.match(/rgba\((\d+),\s*(\d+),\s*(\d+)/)
        return match ? match.slice(1, 4).map(Number) : null
    }).filter(Boolean)
    if (!colors.length) return {}

    const average = colors.reduce((sum, color) => sum.map((value, i) => value + color[i]), [0, 0, 0])
        .map(value => value / colors.length)
    const accent = colors[0]
    const base = theme === 'night' ? [43, 44, 46] : theme === 'sunset' ? [247, 244, 235] : [255, 255, 255]
    const stops = colors.length === 1 ? [colors[0], colors[0]] : colors

    return {
        '--accent-color': hex(...accent),
        '--background-color': hex(...mix(base, average, theme === 'night' ? 0.2 : 0.12)),
        '--sidebar-background-color': hex(...mix(base, average, theme === 'night' ? 0.26 : 0.18)),
        '--active-background-color': hex(...mix(base, accent, theme === 'night' ? 0.32 : 0.22)),
        '--emoji-background': `linear-gradient(110deg, ${stops.map(([r, g, b]) => `rgba(${r}, ${g}, ${b}, .24)`).join(', ')})`
    }
}

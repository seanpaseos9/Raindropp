/**
 * Mock guest storage and API responder for Instant Login / Guest Mode.
 * Ensures the app is 100% usable without hitting external API blocks or unauthorized errors.
 */

const DEFAULT_BOOKMARKS = [
    {
        _id: 101,
        title: "Nature Photography & Scenic Wallpapers",
        excerpt: "A curated collection of scenic landscapes, mountain ranges, and sunsets with attached photos.",
        note: "Here are some of the best high-res wallpapers:\n![Mount Fuji Sunset](https://images.unsplash.com/photo-1578637387939-43c525550085?w=800 \"rating:5\")\n![Alps Mountain Range](https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800 \"rating:4\")\n![Tropical Palm Beach](https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800 \"rating:5\")\n![Misty Autumn Forest](https://images.unsplash.com/photo-1448375240586-882707db888b?w=800 \"rating:4\")\nEnjoy these photos!",
        cover: "https://images.unsplash.com/photo-1578637387939-43c525550085?w=400",
        domain: "unsplash.com",
        collectionId: 0,
        link: "https://unsplash.com",
        type: "link",
        created: new Date().toISOString(),
        tags: ["nature", "wallpaper", "photography"],
        media: []
    },
    {
        _id: 102,
        title: "Design System & UI Components",
        excerpt: "Inspiration and component patterns for modern mobile and web user interfaces.",
        note: "Key mockup references:\n![Mobile App Interface](https://images.unsplash.com/photo-1581291518655-9523c932deb4?w=800 \"rating:4\")\n![Color Palette Exploration](https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800 \"rating:3\")\nCheck out the layout structures.",
        cover: "https://images.unsplash.com/photo-1581291518655-9523c932deb4?w=400",
        domain: "dribbble.com",
        collectionId: 0,
        link: "https://dribbble.com",
        type: "link",
        created: new Date().toISOString(),
        tags: ["design", "ui", "ux"],
        media: []
    },
    {
        _id: 103,
        title: "Photo Gallery & Travel Showcase",
        excerpt: "Demo showcasing photo ratings, touch swiping, and caption editing.",
        note: "Travel memory:\n![Scenic View](https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800 \"rating:5\")\n![Coastal Highway](https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800 \"rating:5\")\nTap any photo to view in fullscreen!",
        cover: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400",
        domain: "travel.com",
        collectionId: 0,
        link: "https://unsplash.com",
        type: "link",
        created: new Date().toISOString(),
        tags: ["travel", "photos"],
        media: []
    }
]

export function isGuestMode() {
    try {
        return typeof window !== 'undefined' && window.localStorage && window.localStorage.getItem('guest_mode') === 'true'
    } catch (e) {
        return false
    }
}

export function enableGuestMode() {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem('guest_mode', 'true')
            if (!window.localStorage.getItem('guest_bookmarks')) {
                window.localStorage.setItem('guest_bookmarks', JSON.stringify(DEFAULT_BOOKMARKS))
            }
        }
    } catch (e) {}
}

export function disableGuestMode() {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.removeItem('guest_mode')
        }
    } catch (e) {}
}

export function getGuestBookmarks() {
    try {
        const stored = window.localStorage.getItem('guest_bookmarks')
        if (stored) return JSON.parse(stored)
    } catch (e) {}
    return DEFAULT_BOOKMARKS
}

export function saveGuestBookmarks(items) {
    try {
        window.localStorage.setItem('guest_bookmarks', JSON.stringify(items))
    } catch (e) {}
}

export function handleGuestRequest(path = '', options = {}) {
    const cleanPath = path.replace(/^\/v1\//, '').replace(/^v1\//, '')
    const method = (options.method || 'GET').toUpperCase()

    // 1. User profile
    if (cleanPath.startsWith('user')) {
        return {
            result: true,
            user: {
                _id: 1,
                name: 'Sean',
                email: 'flopsean229@gmail.com',
                pro: true,
                files: { size: 1000000000, used: 0 }
            }
        }
    }

    // 2. Collections
    if (cleanPath.startsWith('collections')) {
        return {
            result: true,
            items: [
                { _id: 1, title: 'Inspiration', color: '#007aff', count: 2, access: { level: 4 } },
                { _id: 2, title: 'Design Resources', color: '#ff9500', count: 1, access: { level: 4 } }
            ]
        }
    }

    // 2b. Single Collection metadata/lastAction
    if (cleanPath.startsWith('collection/')) {
        return {
            result: true,
            lastAction: new Date().toISOString(),
            version: '1.0',
            item: { _id: 0, title: 'All bookmarks', access: { level: 4 } }
        }
    }

    // 3. Single Bookmark update (PUT /raindrop/:id)
    if (cleanPath.startsWith('raindrop/') && (method === 'PUT' || method === 'POST')) {
        const id = parseInt(cleanPath.split('/')[1], 10)
        let body = {}
        try { body = JSON.parse(options.body || '{}') } catch (e) {}
        const items = getGuestBookmarks()
        const idx = items.findIndex(b => b._id === id)
        if (idx !== -1) {
            items[idx] = { ...items[idx], ...body, lastUpdate: new Date().toISOString() }
            saveGuestBookmarks(items)
            return { result: true, item: items[idx] }
        }
    }

    // 4. Single Bookmark get (GET /raindrop/:id)
    if (cleanPath.startsWith('raindrop/')) {
        const id = parseInt(cleanPath.split('/')[1], 10)
        const items = getGuestBookmarks()
        const found = items.find(b => b._id === id) || items[0]
        return { result: true, item: found }
    }

    // 5. Bookmarks list (GET /raindrops/:collectionId)
    if (cleanPath.startsWith('raindrops')) {
        const items = getGuestBookmarks()
        return {
            result: true,
            items: items,
            count: items.length
        }
    }

    // 6. Tags
    if (cleanPath.startsWith('tags')) {
        return {
            result: true,
            items: [
                { _id: 'nature', count: 1 },
                { _id: 'wallpaper', count: 1 },
                { _id: 'design', count: 1 },
                { _id: 'photos', count: 2 }
            ]
        }
    }

    // 7. Filters
    if (cleanPath.startsWith('filters')) {
        return {
            result: true,
            items: []
        }
    }

    return { result: true }
}

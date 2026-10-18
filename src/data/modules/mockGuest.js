import { normalizeBookmarkLink, findDuplicateBookmarks } from '../helpers/bookmarks/duplicates'

/**
 * Mock guest storage and API responder for Instant Login / Guest Mode.
 * Ensures the app is 100% usable without hitting external API blocks or unauthorized errors.
 */

const DEFAULT_BOOKMARKS = [
    {
        _id: 101,
        title: 'Nature Photography & Scenic Wallpapers',
        excerpt: 'A curated collection of scenic landscapes, mountain ranges, and sunsets with attached photos.',
        note: 'Here are some of the best high-res wallpapers:\n![Mount Fuji Sunset](https://images.unsplash.com/photo-1578637387939-43c525550085?w=800 "rating:5")\n![Alps Mountain Range](https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800 "rating:4")\n![Tropical Palm Beach](https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800 "rating:5")\n![Misty Autumn Forest](https://images.unsplash.com/photo-1448375240586-882707db888b?w=800 "rating:4")\nEnjoy these photos!',
        cover: 'https://images.unsplash.com/photo-1578637387939-43c525550085?w=400',
        domain: 'unsplash.com',
        collectionId: 0,
        link: 'https://unsplash.com',
        type: 'link',
        created: new Date().toISOString(),
        tags: ['nature', 'wallpaper', 'photography'],
        media: [],
        rating: 5,
        read: true,
        lastChapter: 'Ch. 10 (Completed)'
    },
    {
        _id: 102,
        title: 'Design System & UI Components',
        excerpt: 'Inspiration and component patterns for modern mobile and web user interfaces.',
        note: 'Key mockup references:\n![Mobile App Interface](https://images.unsplash.com/photo-1581291518655-9523c932deb4?w=800 "rating:4")\n![Color Palette Exploration](https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800 "rating:3")\nCheck out the layout structures.',
        cover: 'https://images.unsplash.com/photo-1581291518655-9523c932deb4?w=400',
        domain: 'dribbble.com',
        collectionId: 0,
        link: 'https://dribbble.com',
        type: 'link',
        created: new Date().toISOString(),
        tags: ['design', 'ui', 'ux'],
        media: [],
        rating: 4,
        read: false,
        lastChapter: 'Section 4'
    },
    {
        _id: 103,
        title: 'Photo Gallery & Travel Showcase',
        excerpt: 'Demo showcasing photo ratings, touch swiping, and caption editing.',
        note: 'Travel memory:\n![Scenic View](https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800 "rating:5")\n![Coastal Highway](https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800 "rating:5")\nTap any photo to view in fullscreen!',
        cover: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400',
        domain: 'travel.com',
        collectionId: 0,
        link: 'https://unsplash.com',
        type: 'link',
        created: new Date().toISOString(),
        tags: ['travel', 'photos'],
        media: [],
        rating: 5,
        read: false,
        lastChapter: ''
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
    let cleanPath = path
    if (cleanPath.includes('//')) {
        try {
            cleanPath = new URL(cleanPath).pathname
        } catch (e) {
            cleanPath = cleanPath.split('//')[1].split('/').slice(1).join('/')
        }
    }
    cleanPath = cleanPath.replace(/^\/?(rest\/)?v1\//, '').replace(/^\//, '')
    const method = (options.method || 'GET').toUpperCase()

    // 1a. Collection Stats (GET /user/stats)
    if (cleanPath === 'user/stats' || cleanPath.startsWith('user/stats')) {
        const items = getGuestBookmarks()
        const duplicateCount = findDuplicateBookmarks(items).length
        return {
            result: true,
            items: [
                { _id: 0, count: items.length },
                { _id: -1, count: items.filter(b => b.collectionId === -1).length },
                { _id: -9, count: duplicateCount },
                { _id: -99, count: items.filter(b => b.collectionId === -99).length }
            ]
        }
    }

    // 1b. User profile
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
        const id = parseInt(cleanPath.split('/')[1], 10)
        let title = 'All bookmarks'
        if (id === -1) title = 'Unsorted'
        else if (id === -9) title = 'Duplicates'
        else if (id === -99) title = 'Trash'
        return {
            result: true,
            lastAction: new Date().toISOString(),
            version: '1.0',
            item: { _id: id, title, access: { level: 4 } }
        }
    }

    // 3a. Create new Bookmark (POST /raindrop)
    if ((cleanPath === 'raindrop' || cleanPath.startsWith('raindrop?')) && method === 'POST') {
        let body = {}
        try { body = JSON.parse(options.body || '{}') } catch (e) {}
        const items = getGuestBookmarks()
        let domain = ''
        if (body.link) {
            try {
                domain = new URL(body.link.startsWith('http') ? body.link : 'https://' + body.link).hostname.replace(/^www\./, '')
            } catch (e) {}
        }
        const newId = Date.now()
        const newItem = {
            _id: newId,
            title: body.title || body.link || 'New Bookmark',
            excerpt: body.excerpt || '',
            note: body.note || '',
            cover: body.cover || '',
            domain,
            collectionId: typeof body.collectionId !== 'undefined' ? body.collectionId : 0,
            link: body.link || '',
            type: body.type || 'link',
            created: new Date().toISOString(),
            tags: body.tags || [],
            media: body.media || [],
            rating: body.rating || 0,
            read: Boolean(body.read),
            lastChapter: body.lastChapter || ''
        }
        items.unshift(newItem)
        saveGuestBookmarks(items)
        return { result: true, item: newItem }
    }

    // 3b. Delete Bookmark (DELETE /raindrop/:id)
    if (cleanPath.startsWith('raindrop/') && method === 'DELETE') {
        const id = parseInt(cleanPath.split('/')[1], 10)
        let items = getGuestBookmarks()
        items = items.filter(b => b._id !== id)
        saveGuestBookmarks(items)
        return { result: true }
    }

    // 3c. Single Bookmark update (PUT /raindrop/:id or POST /raindrop/:id)
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
        let items = getGuestBookmarks()
        const isDuplicateRequest = cleanPath.includes('-9') || cleanPath.includes('duplicate') || path.includes('duplicate') || path.includes('-9')
        if (isDuplicateRequest) {
            items = findDuplicateBookmarks(items)
        }

        // Support is:read and is:unread filtering
        const reqQuery = cleanPath + ' ' + (path || '')
        if (reqQuery.includes('is:read') || reqQuery.includes('is%3Aread')) {
            items = items.filter(b => Boolean(b.read))
        } else if (reqQuery.includes('is:unread') || reqQuery.includes('is%3Aunread')) {
            items = items.filter(b => !b.read)
        }

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

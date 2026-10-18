import _ from 'lodash'
import { call, put, takeEvery, select } from 'redux-saga/effects'
import Api from '../../modules/api'
import { getUrl, findDuplicateBookmarks } from '../../helpers/bookmarks'
import { COLLECTION_UPDATE_COUNT } from '../../constants/collections'

import {
	SPACE_LOAD_PRE, SPACE_LOAD_REQ, SPACE_LOAD_SUCCESS, SPACE_LOAD_ERROR,
	SPACE_REFRESH_REQ,
	SPACE_NEXTPAGE_REQ, SPACE_NEXTPAGE_SUCCESS, SPACE_NEXTPAGE_ERROR,
	SPACE_CHANGE_SORT,
	SPACE_VIEW_TOGGLE,
	SPACE_VIEW_CONFIG
} from '../../constants/bookmarks'
import { USER_UPDATE_REQ } from '../../constants/user'

//Requests
export default function* () {
	//space
	yield takeEvery([
		SPACE_LOAD_PRE,
		SPACE_REFRESH_REQ
	], preLoadSpace)

	yield takeEvery([
		SPACE_LOAD_REQ,
		SPACE_NEXTPAGE_REQ,
		SPACE_CHANGE_SORT
	], loadSpace)

	yield takeEvery(SPACE_VIEW_TOGGLE, viewToggle)
	yield takeEvery(SPACE_VIEW_CONFIG, viewConfig)
}

function* preLoadSpace(action) {
	if (action.ignore) return

	try{
		const { lastAction, version } = yield call(Api.get, `collection/${parseInt(action.spaceId)}/lastAction`)

		yield put({
			...action,
			type: SPACE_LOAD_REQ,
			lastAction,
			version
		})
	} catch (error) {
		yield put({
			...action,
			type: SPACE_LOAD_ERROR,
			error
		})
	}
}

function* loadSpace({spaceId, query, ignore=false}) {
	if (ignore) return

	try {
		let items = []
		let count = 0

		if (parseInt(spaceId) === -9) {
			// Duplicate detection across ALL bookmarks
			let duplicateItems = []

			try {
				// 1. Fetch from collection 0 (All bookmarks)
				const allRes = yield call(Api.get, 'raindrops/0?perpage=50')
				const fetched = allRes.items || []

				// 2. Combine with any bookmarks already loaded in Redux state
				const state = yield select()
				const existing = Object.values(state.bookmarks?.elements || {})

				const map = new Map()
				for (const b of fetched) {
					if (b && b._id) map.set(b._id, b)
				}
				for (const b of existing) {
					if (b && b._id && !map.has(b._id)) map.set(b._id, b)
				}

				// 3. Detect duplicate links across all bookmarks
				duplicateItems = findDuplicateBookmarks(Array.from(map.values()))
			} catch (e) {}

			// Fallback to server search query if local detection found none
			if (!duplicateItems.length) {
				try {
					const sRes = yield call(Api.get, `raindrops/${getUrl(spaceId, query)}`)
					if (sRes.items && sRes.items.length) {
						duplicateItems = sRes.items
					}
				} catch (e) {}
			}

			// Apply search filter if query has search string
			if (query && query.search) {
				const sLower = query.search
					.replace(/\bis:read\b/gi, '')
					.replace(/\bis:unread\b/gi, '')
					.trim()
					.toLowerCase()

				if (sLower) {
					duplicateItems = duplicateItems.filter(b => 
						((b.title || '') + ' ' + (b.excerpt || '') + ' ' + (b.link || '')).toLowerCase().includes(sLower)
					)
				}

				if (/\bis:read\b/i.test(query.search)) {
					duplicateItems = duplicateItems.filter(b => 
						Boolean(b.read || (typeof window !== 'undefined' && window.localStorage && window.localStorage.getItem(`raindrop_read_${b._id}`) === 'true')) === true
					)
				} else if (/\bis:unread\b/i.test(query.search)) {
					duplicateItems = duplicateItems.filter(b => 
						Boolean(b.read || (typeof window !== 'undefined' && window.localStorage && window.localStorage.getItem(`raindrop_read_${b._id}`) === 'true')) === false
					)
				}
			}

			items = duplicateItems
			count = duplicateItems.length

			// Update Duplicates collection count in sidebar
			yield put({
				type: COLLECTION_UPDATE_COUNT,
				_id: -9,
				count: duplicateItems.length
			})
		} else {
			let isReadFilter = null
			let apiQuery = query
			if (query && query.search) {
				if (/\bis:read\b/i.test(query.search)) {
					isReadFilter = true
				} else if (/\bis:unread\b/i.test(query.search)) {
					isReadFilter = false
				}

				if (isReadFilter !== null) {
					const cleanSearch = query.search
						.replace(/\bis:read\b/gi, '')
						.replace(/\bis:unread\b/gi, '')
						.trim()
					apiQuery = { ...query, search: cleanSearch }
				}
			}

			const res = yield call(Api.get, `raindrops/${getUrl(spaceId, apiQuery)}`)
			let fetchedItems = res.items || []

			if (isReadFilter !== null) {
				const state = yield select()
				const existing = Object.values(state.bookmarks?.elements || {}).filter(b => 
					parseInt(spaceId) === 0 || b.collectionId === parseInt(spaceId)
				)
				const map = new Map()
				for (const b of fetchedItems) {
					if (b && b._id) map.set(b._id, b)
				}
				for (const b of existing) {
					if (b && b._id && !map.has(b._id)) map.set(b._id, b)
				}

				items = Array.from(map.values()).filter(b => {
					const isRead = Boolean(b.read || (typeof window !== 'undefined' && window.localStorage && window.localStorage.getItem(`raindrop_read_${b._id}`) === 'true'))
					return isRead === isReadFilter
				})
				count = items.length
			} else {
				items = fetchedItems
				count = res.count || 0
			}
		}

		yield put({
			type: (query.page ? SPACE_NEXTPAGE_SUCCESS : SPACE_LOAD_SUCCESS),
			spaceId: spaceId,
			items: items,
			count,
			query
		})
	} catch (error) {
		yield put({
			type: (query.page ? SPACE_NEXTPAGE_ERROR : SPACE_LOAD_ERROR),
			spaceId: spaceId,
			error,
			query
		})
	}
}

function* viewToggle({ spaceId, field }) {
	const { config, collections } = yield select()
	const collection = collections.items[parseInt(spaceId)]

	if (!collection) return

	let raindrops_hide = [ ...config.raindrops_hide ]
	let view_field = `${collection.view}_${field}`

	if (raindrops_hide.includes(view_field))
		raindrops_hide = _.without(raindrops_hide, view_field)
	else
		raindrops_hide.push(view_field)

	yield viewConfig({ spaceId, raindrops_hide })
}

function* viewConfig(payload) {
	const config = _.omit(payload, 'spaceId')
	yield put({
		type: USER_UPDATE_REQ,
		user: {
			config
		}
	})
}
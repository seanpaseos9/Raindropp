import _ from 'lodash'
import { all, call, put, takeEvery, select } from 'redux-saga/effects'
import Api from '../../modules/api'
import { getUrl, findDuplicateBookmarks, normalizeBookmark } from '../../helpers/bookmarks'
import { COLLECTION_UPDATE_COUNT } from '../../constants/collections'
import { SPACE_PER_PAGE } from '../../constants/bookmarks'

import {
	SPACE_LOAD_PRE, SPACE_LOAD_REQ, SPACE_LOAD_SUCCESS, SPACE_LOAD_ERROR,
	SPACE_REFRESH_REQ,
	SPACE_NEXTPAGE_REQ, SPACE_NEXTPAGE_SUCCESS, SPACE_NEXTPAGE_ERROR,
	SPACE_CHANGE_SORT,
	SPACE_VIEW_TOGGLE,
	SPACE_VIEW_CONFIG
} from '../../constants/bookmarks'
import { USER_UPDATE_REQ } from '../../constants/user'

function parseSearchFilters(search = '') {
	const filters = []
	const text = String(search).replace(/(?:^|\s)(is:(?:read|unread)|rating:(?:unrated|[0-5]))(?=\s|$)/gi, (token) => {
		filters.push(token.trim().toLowerCase())
		return ' '
	}).replace(/\s+/g, ' ').trim()

	return { filters, text }
}

function matchesSearchFilters(bookmark, filters) {
	const item = normalizeBookmark(bookmark)
	return filters.every(filter => {
		if (filter === 'is:read') return item.read === true
		if (filter === 'is:unread') return item.read !== true
		if (filter === 'rating:unrated' || filter === 'rating:0') return item.rating === 0
		if (filter.startsWith('rating:')) return item.rating === parseInt(filter.slice(7), 10)
		return true
	})
}

function hasSearchFilters(filters) {
	return filters.length > 0
}

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

			const { filters, text } = parseSearchFilters(query?.search || '')

			// Fallback to server search query if local detection found none
			if (!duplicateItems.length) {
				try {
					const sRes = yield call(Api.get, `raindrops/${getUrl(spaceId, { ...query, search: text })}`)
					if (sRes.items && sRes.items.length) {
						duplicateItems = sRes.items
					}
				} catch (e) {}
			}

			if (text) {
				const sLower = text.toLowerCase()
				duplicateItems = duplicateItems.filter(b =>
					((b.title || '') + ' ' + (b.excerpt || '') + ' ' + (b.link || '')).toLowerCase().includes(sLower)
				)
			}
			duplicateItems = duplicateItems.filter(b => matchesSearchFilters(b, filters))

			items = duplicateItems
			count = duplicateItems.length

			// Update Duplicates collection count in sidebar
			yield put({
				type: COLLECTION_UPDATE_COUNT,
				_id: -9,
				count: duplicateItems.length
			})
		} else {
			const { filters, text } = parseSearchFilters(query?.search || '')
			const apiQuery = filters.length ? { ...query, search: text } : query
			let fetchedItems = []
			let res

			if (hasSearchFilters(filters)) {
				// Fetch the first page for the total, then load remaining pages in small batches.
				res = yield call(Api.get, `raindrops/${getUrl(spaceId, { ...apiQuery, page: 0 })}`)
				fetchedItems = res.items || []
				const reportedCount = Number(res.count)
				const totalPages = reportedCount > 0
					? Math.ceil(reportedCount / SPACE_PER_PAGE)
					: (fetchedItems.length < SPACE_PER_PAGE ? 1 : Infinity)
				const pagesPerBatch = 5

				for (let startPage = 1; startPage < totalPages; startPage += pagesPerBatch) {
					const endPage = Math.min(startPage + pagesPerBatch, totalPages)
					const pageResults = yield all(Array.from(
						{ length: endPage - startPage },
						(_, index) => call(Api.get, `raindrops/${getUrl(spaceId, { ...apiQuery, page: startPage + index })}`)
					))
					pageResults.forEach(pageResult => {
						fetchedItems = fetchedItems.concat(pageResult.items || [])
					})
					if (totalPages === Infinity && pageResults.some(pageResult => (pageResult.items || []).length < SPACE_PER_PAGE)) break
				}

				const seenIds = new Set()
				fetchedItems = fetchedItems.filter(item => {
					if (!item?._id) return true
					if (seenIds.has(item._id)) return false
					seenIds.add(item._id)
					return true
				})
			} else {
				res = yield call(Api.get, `raindrops/${getUrl(spaceId, apiQuery)}`)
				fetchedItems = res.items || []
			}

			if (hasSearchFilters(filters)) {
				items = fetchedItems.filter(b => matchesSearchFilters(b, filters))
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

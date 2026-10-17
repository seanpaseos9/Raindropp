import { blankSpace } from './blankSpace'
import {SPACE_PER_PAGE} from '../../constants/bookmarks'
import _ from 'lodash-es'

export const getUrlQuery = (query)=>{
	const entities = _.compact(_.map(query||blankSpace.query, (val,key)=>{
		if (val)
			switch(key){
				case 'page':
				case 'sort':
					return key+'='+encodeURIComponent(val);

				case 'search':
					return key+'='+encodeURIComponent(val);
			}
	}))
	entities.push('perpage='+SPACE_PER_PAGE)

	if (!entities.length)
		return ''

	return '?'+entities.join('&')
}

export const getUrl = (__id, query)=>{
	const id = parseInt(__id) || 0
	if (id === -9) {
		const dupQuery = {
			...(query || {}),
			search: (query && query.search ? `${query.search} duplicate:true` : 'duplicate:true')
		}
		return `0${getUrlQuery(dupQuery)}`
	}
	return `${id}${getUrlQuery(query)}`
}
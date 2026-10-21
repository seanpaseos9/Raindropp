import { createSelector } from 'reselect'

const emptyArray = []

const getMatchOr = createSelector(
    [
        (state, spaceId)=>spaceId,
        (state, spaceId, filter)=>filter,
        (state, spaceId, filter, fullquery)=>fullquery
    ],
    (spaceId, filter, fullquery='')=>{
        const tokens = (fullquery.match(/\s/g) || []).filter(t=>(t||'').trim()).length

        if (tokens <= 1) return emptyArray
        if (fullquery.includes('match:OR')) return emptyArray

        return [
            {
                _id: 'matchor',
                query: 'match:OR ',
                top: true
            }
        ]
	}
)

const READ_OPTIONS = [
    {
        _id: 'is_read',
        query: 'is:read ',
        top: true
    },
    {
        _id: 'is_unread',
        query: 'is:unread ',
        top: true
    }
]

const RATING_OPTIONS = [
	{ _id: 'rating_unrated', query: 'rating:unrated ', top: true },
	...Array.from({ length: 5 }, (_, index) => ({
		_id: `rating_${index + 1}`,
		query: `rating:${index + 1} `,
		top: true
	}))
]

//(state, spaceId, filter, fullquery*) -> []
export const makeOptions = ()=>createSelector(
    [
        (state, spaceId, filter)=>filter,
        getMatchOr
    ],
    (filter, matchOr)=>{
        if (filter) {
            const fLower = filter.toLowerCase()
            return [...READ_OPTIONS, ...RATING_OPTIONS].filter(opt => opt.query.trim().startsWith(fLower))
        }
        
        const options = [...READ_OPTIONS, ...RATING_OPTIONS, ...matchOr]
        if (!options.length) return emptyArray

        return options
    }
)

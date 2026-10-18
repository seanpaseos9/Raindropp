import React from 'react'
import { Link } from 'react-router-dom'
import t from '~t'
import { connect } from 'react-redux'
import { getSearchEmpty, makeCount } from '~data/selectors/bookmarks'
import { makeCollection } from '~data/selectors/collections'

class BookmarksHeaderTitle extends React.Component {
    static defaultProps = {
        spaceId: 0,
        compact: false,
    }

    renderTitle = ()=>{
        const {
            collection: { _id, title='' },
            isSearching,
            compact
        } = this.props

        if (!_id && isSearching)
            if (compact)
                return t.s('interest_other').toLowerCase() + ' ' + t.s('collectionsCount')
            else
                return title.toLowerCase()

        return title
    }

    render() {
        const { isSearching, compact, status, collection: { _id }, count, readCount = 0 } = this.props

        const renderedTitle = isSearching ?
            (
                status.main == 'loading' ? 
                    '' :
                    isSearching ? t.format('bookmarksFound', count) : t.format('bookmarksCount', count)
            ) :
            (
                compact && status.main=='loaded' ? (
                    <Link to={`/my/${_id}/full`}>
                        {this.renderTitle()}
                    </Link>
                ) : this.renderTitle()
            )

        const totalItems = count || 0

        return (
            <span style={{ display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                <span>{renderedTitle}</span>
                {!compact && status.main == 'loaded' && totalItems > 0 && (
                    <span 
                        style={{
                            fontSize: '12px',
                            fontWeight: 500,
                            color: 'var(--secondary-text-color)',
                            opacity: 0.85,
                            marginLeft: '4px'
                        }}>
                        ({totalItems} {totalItems === 1 ? 'item' : 'items'} • {readCount} Read)
                    </span>
                )}
            </span>
        )
    }
}

export default connect(
	() => {
        const getCollection = makeCollection()
        const getCount = makeCount()
    
        return (state, { spaceId })=>{
            const ids = state.bookmarks?.spaces?.[spaceId]?.ids || []
            const elements = state.bookmarks?.elements || {}
            let readCount = 0
            for (const id of ids) {
                const el = elements[id]
                if (el && (el.read || (typeof window !== 'undefined' && window.localStorage && window.localStorage.getItem(`raindrop_read_${id}`) === 'true'))) {
                    readCount++
                }
            }

            return {
                collection: getCollection(state, spaceId),
                isSearching: !getSearchEmpty(state, spaceId),
                count: getCount(state, spaceId),
                readCount
            }
        }
    }
)(BookmarksHeaderTitle)
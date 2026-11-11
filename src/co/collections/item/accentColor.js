import React from 'react'
import { connect } from 'react-redux'
import { makeCollection } from '~data/selectors/collections'
import HexToHsl from '~modules/format/color/hextToHsl'
import { getEmojiTheme } from './emojiBackground'

const emptyObj = {}

export default connect(
	() => {
        const getCollection = makeCollection()
    
        return (state, { _id })=>{
            const { color, title } = getCollection(state, _id)

            return {
                color,
                title,
                theme: state.local.theme
            }
        }
    }
)(function CollectionAccentColor({ color, title, theme, children }) {
    let hsl = ''
    const emojiTheme = getEmojiTheme(title, theme.app)
    const accentColor = emojiTheme['--accent-color'] || color
    try{ hsl = HexToHsl(accentColor) }catch(e){}

    const style = { ...emojiTheme }
    if (accentColor) {
        style['--accent-color'] = accentColor
        style['--accent-hsl'] = hsl
    }

    return children(Object.keys(style).length ? style : emptyObj)
})

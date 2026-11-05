import React, { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '~co/common/button'
import Popover from '~co/overlay/popover'
import { Layout, Radio, Label } from '~co/common/form'

const RATING = /(^|\s)rating:(?:unrated|[1-5])(?=\s|$)/gi

export default function RatingFilter({ spaceId = 0, search = '', fromCid }) {
    const navigate = useNavigate()
    const pin = useRef(null)
    const [menu, setMenu] = useState(false)
    const active = /(?:^|\s)rating:(unrated|[1-5])(?=\s|$)/i.exec(search)?.[1] || ''

    const select = value => {
        const nextSearch = search.replace(RATING, ' ').replace(/\s+/g, ' ').trim()
        const query = [nextSearch, value && `rating:${value}`].filter(Boolean).join(' ')
        const path = `/my/${spaceId}${query ? `/${encodeURIComponent(query)}` : ''}${fromCid ? `/${fromCid}` : ''}`
        navigate(path)
        setMenu(false)
    }

    return <>
        <Button
            ref={pin}
            type='button'
            title='Filter bookmarks by rating'
            aria-label={`Rating filter${active ? `, ${active}` : ''}`}
            aria-haspopup='menu'
            aria-expanded={menu}
            onClick={() => setMenu(open => !open)}>
            <span aria-hidden='true'>★</span>
            <span className='hide-on-small-body'>{active ? (active === 'unrated' ? 'Unrated' : `${active} stars`) : 'Rating'}</span>
        </Button>
        {menu && <Popover pin={pin} onClose={() => setMenu(false)}>
            <Layout>
                <Label>Rating</Label>
                <div>
                    {[
                        ['', 'Any rating'],
                        ['unrated', 'Unrated'],
                        ...Array.from({ length: 5 }, (_, i) => [String(i + 1), `${i + 1} star${i ? 's' : ''}`])
                    ].map(([value, label]) => <Radio
                        key={value || 'any'}
                        checked={active === value}
                        readOnly
                        onClick={() => select(value)}>
                        {label}
                    </Radio>)}
                </div>
            </Layout>
        </Popover>}
    </>
}

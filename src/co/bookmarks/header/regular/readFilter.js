import React, { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import Button from '~co/common/button'
import Popover from '~co/overlay/popover'
import { Layout, Radio, Label } from '~co/common/form'

const STATUS = /(^|\s)is:(?:read|unread)(?=\s|$)/gi

export default function ReadFilter({ spaceId = 0, search = '', fromCid }) {
    const navigate = useNavigate()
    const pin = useRef(null)
    const [menu, setMenu] = useState(false)
    const ids = useSelector(state => state.bookmarks?.spaces?.[spaceId]?.ids || [])
    const elements = useSelector(state => state.bookmarks?.elements || {})
    const readCount = ids.filter(id => {
        const item = elements[id]
        try {
            return item?.read || window.localStorage?.getItem(`raindrop_read_${id}`) === 'true'
        } catch (e) {
            return Boolean(item?.read)
        }
    }).length
    const allRead = ids.length > 0 && readCount === ids.length
    const active = /(?:^|\s)is:(read|unread)(?=\s|$)/i.exec(search)?.[1] || ''

    const select = value => {
        const nextSearch = search.replace(STATUS, ' ').replace(/\s+/g, ' ').trim()
        const query = [nextSearch, value && `is:${value}`].filter(Boolean).join(' ')
        const path = `/my/${spaceId}${query ? `/${encodeURIComponent(query)}` : ''}${fromCid ? `/${fromCid}` : ''}`
        navigate(path)
        setMenu(false)
    }

    return <>
        <Button
            ref={pin}
            type='button'
            title='Filter bookmarks by reading status'
            aria-label={`Reading status filter${allRead ? ', all bookmarks read' : ''}`}
            aria-haspopup='menu'
            aria-expanded={menu}
            onClick={() => setMenu(open => !open)}>
            <span aria-hidden='true' style={{ width: 16, display: 'inline-block', textAlign: 'center' }}>{allRead ? '✓' : ''}</span>
            <span className='hide-on-small-body'>{active ? (active === 'read' ? 'Read' : 'Unread') : 'All'}</span>
        </Button>
        {menu && <Popover pin={pin} onClose={() => setMenu(false)}>
            <Layout>
                <Label>Reading status</Label>
                <div>
                    {[
                        ['', 'All bookmarks'],
                        ['unread', 'Unread'],
                        ['read', 'Read']
                    ].map(([value, label]) => <Radio
                        key={value || 'all'}
                        checked={active === value}
                        readOnly
                        onClick={() => select(value)}>
                        {value === 'read' && allRead ? '✓ ' : ''}{label}
                    </Radio>)}
                </div>
            </Layout>
        </Popover>}
    </>
}

import React, { useState, useCallback, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { Outlet, useParams } from 'react-router-dom'
import sessionStorage from '~modules/sessionStorage'

import * as Reader from '~co/screen/splitview/reader'
import Toolbar from './toolbar'
import Highlights from './highlights'
import Web from './tab/web'
import Edit from './tab/edit'
import s from './layout.module.styl'

export default function PageMyItemLayout({ tabs, item, webViewRef, webEditSplit, webEditOrientation, onToggleWebEditSplit, onToggleWebEditOrientation }) {
    const { '*':tab } = useParams()
    const font_color = useSelector(state=>state.config.font_color)

    const [fullscreen, setFullscreen] = useState(false)
    const onFullscreenClick = useCallback(()=>setFullscreen(f=>!f), [])

    useEffect(()=>{sessionStorage.setItem('my-item-last-tab', tab) }, [tab])
    useEffect(()=>()=>{sessionStorage.removeItem('my-item-last-tab')}, [])

    return (
        <Reader.default
            fullscreen={fullscreen}
            data-theme={tab=='preview' && item.type == 'article' && font_color ? font_color : undefined}>
            <Reader.Header
                data-no-shadow={tab!='web'}
                backTo='../'
                onFullscreenClick={onFullscreenClick}>
                <Toolbar
                    item={item}
                    tab={tab}
                    tabs={tabs}
                    webEditSplit={webEditSplit}
                    webEditOrientation={webEditOrientation}
                    onToggleWebEditSplit={onToggleWebEditSplit}
                    onToggleWebEditOrientation={onToggleWebEditOrientation} />
            </Reader.Header>

            <Reader.Content>
                {tab === 'web' && webEditSplit && tabs.includes('edit') ? (
                    <div className={s.webEditSplit} data-orientation={webEditOrientation}>
                        <section className={s.webPane} aria-label='Web page'>
                            <Web item={item} webViewRef={webViewRef} />
                        </section>
                        <section className={s.editPane} aria-label='Bookmark editor'>
                            <Edit item={item} />
                        </section>
                    </div>
                ) : <Outlet />}
            </Reader.Content>

            <Highlights 
                item={item}
                tab={tab}
                webViewRef={webViewRef} />
        </Reader.default>
    )
}

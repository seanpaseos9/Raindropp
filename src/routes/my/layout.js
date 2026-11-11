import React from 'react'
import { Outlet, useParams } from 'react-router-dom'
import SplitView from '~co/screen/splitview'
import AccentColor from '~co/collections/item/accentColor'

import Sidebar from './sidebar'
// import OnboardUpgrade from './onboard-upgrade'

export default function PageMyLayout() {
    const { cId } = useParams()

    return (
        <AccentColor _id={cId}>{style=>(
            <SplitView style={style}>
                <Sidebar />
                <Outlet />
                {/* <OnboardUpgrade /> */}
            </SplitView>
        )}</AccentColor>
    )
}

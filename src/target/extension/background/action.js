import browser from 'webextension-polyfill'
import { has } from './links'
import { currentTab } from '~target'

let icon = unescape('%u2713') //✓, glitchy without escape in safari

export async function updateBadge() {
    const { url, id: tabId } = await currentTab()
    if (!url) return

    await Promise.all([
        browser.action.setBadgeBackgroundColor({tabId, color: '#0087EA'}),
        browser.action.setBadgeText({tabId, text: has(url) ? icon : ''}),

        ...(typeof browser.action.setBadgeTextColor == 'function' ? [
            browser.action.setBadgeTextColor({tabId, color: '#FFFFFF'})
        ] : []),
    ])
}

export async function open(path) {
    if (!path)
        return browser.action.openPopup()

    const { default_popup } = browser.runtime.getManifest().action

    await browser.action.setPopup({ popup: `${default_popup}#${path}` })
    try {
        await browser.action.openPopup()
    } finally {
        //always restore, even if opening failed
        await browser.action.setPopup({ popup: default_popup })
    }
}

async function onTabsUpdated(id, details = {}) {
    if (details?.status == 'complete')
        await updateBadge()
}

export default function() {
    browser.tabs.onUpdated.removeListener(onTabsUpdated)
    browser.tabs.onUpdated.addListener(onTabsUpdated)

    browser.tabs.onActivated.removeListener(updateBadge)
    browser.tabs.onActivated.addListener(updateBadge)
}
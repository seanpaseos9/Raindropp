import s from './connect.module.styl'
import React, { useState } from 'react'
import t from '~t'
import _ from 'lodash'
import config from '~config'
import { useLocation } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { user as getUser } from '~data/selectors/user'
import { refresh } from '~data/actions/user'
import { isGuestMode, disableGuestMode } from '~data/modules/mockGuest'
import { target } from '~target'

import { Label, Checkbox, Text } from '~co/common/form'
import Button from '~co/common/button'
import Icon from '~co/common/icon'
import Alert from '~co/common/alert'

function ConnectionError() {
    const { search } = useLocation()
    const { connect_error='' } = Object.fromEntries(new URLSearchParams(search))||{}

    if (!connect_error) return null

    let content

    switch(connect_error) {
        case 'conflict':
            content = <span>{t.s('connectConflict')}</span>;
            break

        default: 
            content = connect_error;
            break
    }

    return (
        <Alert variant='danger'>
            {content}
        </Alert>
    )
}

export default function SettingsProfileConnect() {
    const { pathname } = useLocation()
    const dispatch = useDispatch()
    const user = useSelector(state=>getUser(state))
    const isGuest = isGuestMode()
    const currentToken = typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem('raindrop_token') : null

    const [tokenInput, setTokenInput] = useState('')
    const [tokenError, setTokenError] = useState('')
    const [socialNotice, setSocialNotice] = useState('')
    const [connecting, setConnecting] = useState(false)

    const handleConnectToken = (e) => {
        if (e) e.preventDefault()
        const cleanToken = tokenInput.trim()
        if (!cleanToken) {
            setTokenError('Please enter your Raindrop API Test Token')
            return
        }
        setConnecting(true)
        setTokenError('')
        try {
            disableGuestMode()
            window.localStorage.setItem('raindrop_token', cleanToken)
            dispatch(refresh())
            setSocialNotice('Successfully connected real account token!')
        } catch (err) {
            setTokenError(err.message || 'Failed to save token')
        } finally {
            setConnecting(false)
        }
    }

    const handleDisconnectToken = () => {
        try {
            window.localStorage.removeItem('raindrop_token')
            dispatch(refresh())
            window.location.reload()
        } catch (err) {}
    }

    const onSocialToggle = (key) => {
        setSocialNotice(`To sync your ${_.capitalize(key)} account bookmarks on this custom app, paste your Raindrop API Test Token from Settings > Integrations above.`)
    }

    return (
        <>
            <Label>Raindrop Account Sync</Label>

            {target === 'web' ? (
                <div>
                    <ConnectionError />

                    {isGuest ? (
                        <Alert variant='warning' style={{ marginBottom: '16px' }}>
                            <strong>Demo Mode Active:</strong> You are currently viewing demo sample bookmarks. Connect your personal Raindrop Test Token below to load your real Google/Raindrop bookmarks.
                        </Alert>
                    ) : null}

                    {currentToken ? (
                        <Alert variant='success' style={{ marginBottom: '16px' }}>
                            ✅ <strong>Real Account Connected:</strong> Using personal access token.
                            <div style={{ marginTop: '8px' }}>
                                <Button size='small' variant='outline' onClick={handleDisconnectToken}>
                                    Disconnect Token / Switch Account
                                </Button>
                            </div>
                        </Alert>
                    ) : (
                        <div style={{ background: 'var(--background-secondary, rgba(0,0,0,0.03))', padding: '16px', borderRadius: '10px', marginBottom: '16px' }}>
                            <div style={{ fontWeight: 600, marginBottom: '6px' }}>
                                🔑 Connect Real Account (Google / Apple / Email)
                            </div>
                            <p style={{ fontSize: '13px', margin: '0 0 10px 0', opacity: 0.85 }}>
                                Sync your actual bookmarks by creating a free Test Token:
                            </p>
                            <ol style={{ fontSize: '12px', paddingLeft: '18px', margin: '0 0 12px 0', lineHeight: 1.6 }}>
                                <li>
                                    Open{' '}
                                    <a href='https://app.raindrop.io/settings/integrations' target='_blank' rel='noreferrer' style={{ fontWeight: 600 }}>
                                        Raindrop Settings → Integrations ↗
                                    </a>
                                </li>
                                <li>Scroll down to <strong>For Developers</strong> and click <strong>Create test token</strong></li>
                                <li>Copy the token and paste it below:</li>
                            </ol>

                            {tokenError ? <Alert variant='danger'>{tokenError}</Alert> : null}

                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <Text
                                    type='text'
                                    placeholder='Paste Raindrop Test Token here'
                                    value={tokenInput}
                                    style={{ flex: 1, minWidth: '200px' }}
                                    onChange={e=>setTokenInput(e.target.value)} />
                                <Button
                                    variant='primary'
                                    disabled={connecting}
                                    onClick={handleConnectToken}>
                                    {connecting ? 'Connecting…' : 'Sync Real Bookmarks'}
                                </Button>
                            </div>
                        </div>
                    )}

                    {socialNotice ? (
                        <Alert variant='info' style={{ marginBottom: '14px' }}>
                            {socialNotice}
                        </Alert>
                    ) : null}

                    <Label>{t.s('signInSocial')}</Label>
                    {['google', 'apple'].map(key=>{
                        const enabled = user[key] && user[key].enabled

                        return (
                            <Checkbox 
                                key={key}
                                checked={enabled}
                                onChange={()=>onSocialToggle(key)}
                                className={enabled ? s.enabled : s.default}>
                                <Icon 
                                    name={key}
                                    className={s.icon+' '+s[key]} />
                                {_.capitalize(key)}
                            </Checkbox>
                        )
                    })}
                </div>
            ) : (
                <Alert variant='warning'>
                    {t.s('openWebAppSocial')} <a href={`${config.links.app.index}${pathname}`} target='_blank'>{t.s('openInBrowser')}</a>
                </Alert>
            )}
        </>
    )
}
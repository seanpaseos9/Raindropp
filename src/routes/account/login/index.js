import React, { useState, useCallback, useMemo } from 'react'
import { useDispatch } from 'react-redux'
import { refresh } from '~data/actions/user'
import t from '~t'
import { API_ENDPOINT_URL } from '~data/constants/app'
import sessionStorage from '~modules/sessionStorage'

import { Helmet } from 'react-helmet'
import { Link, useSearchParams } from 'react-router-dom'
import { Layout, Text, Label, Separator } from '~co/common/form'
import Button from '~co/common/button'
import Social from '../social'
import Alert from '~co/common/alert'

import { enableGuestMode } from '~data/modules/mockGuest'

export default function AccountLogin() {
    const dispatch = useDispatch()
    const [authMode, setAuthMode] = useState('password') // default to password or guest
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [apiToken, setApiToken] = useState('19f0140a-beda-48ad-bb24-3dc7586be443')
    const [tokenError, setTokenError] = useState('')
    const [tokenLoading, setTokenLoading] = useState(false)
    const [search] = useSearchParams()
    const redirect = sessionStorage.getItem('redirect') || ''

    const handleInstantLogin = useCallback(() => {
        enableGuestMode()
        dispatch(refresh())
    }, [dispatch])

    const error = useMemo(()=>{
        const { error } = Object.fromEntries(new URLSearchParams(search))||{}
        return error
    }, [search])

    const onChangeEmailField = useCallback(e=>setEmail(e.target.value), [])
    const onChangePasswordField = useCallback(e=>setPassword(e.target.value), [])

    const onTokenSubmit = useCallback(async (e)=>{
        if (e) e.preventDefault()
        const cleanToken = apiToken.trim()
        if (!cleanToken) {
            setTokenError('Please enter your Raindrop API Test Token')
            return
        }
        setTokenLoading(true)
        setTokenError('')
        try {
            window.localStorage.setItem('raindrop_token', cleanToken)
            const res = await fetch('/v1/user', {
                headers: { 'Authorization': `Bearer ${cleanToken}` }
            })
            const data = await res.json()
            if (data.result && data.user) {
                dispatch(refresh())
            } else {
                window.localStorage.removeItem('raindrop_token')
                setTokenError(data.errorMessage || 'Invalid API Token. Ensure you clicked Save on the Raindrop app form!')
            }
        } catch (err) {
            window.localStorage.removeItem('raindrop_token')
            setTokenError(err.message || 'Failed to authenticate with token')
        } finally {
            setTokenLoading(false)
        }
    }, [apiToken, dispatch])

    return (
        <form method='POST' action={`${API_ENDPOINT_URL}auth/email/login`}>
            <Helmet><title>{t.s('signIn')}</title></Helmet>

            <Layout>
                {/* Instant Login banner */}
                <Button
                    type='button'
                    variant='primary'
                    data-block
                    style={{ marginBottom: '14px', background: '#007aff', fontWeight: 600, fontSize: '13px' }}
                    onClick={handleInstantLogin}>
                    🚀 Instant Login (Try with Sample Bookmarks & Carousel)
                </Button>

                <Separator />

                {/* Tab switchers */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                    <Button
                        type='button'
                        variant={authMode === 'token' ? 'primary' : 'outline'}
                        style={{ flex: 1, textAlign: 'center' }}
                        onClick={()=>{ setAuthMode('token'); setTokenError('') }}>
                        API Token (Quick Login)
                    </Button>
                    <Button
                        type='button'
                        variant={authMode === 'password' ? 'primary' : 'outline'}
                        style={{ flex: 1, textAlign: 'center' }}
                        onClick={()=>{ setAuthMode('password'); setTokenError('') }}>
                        Email & Password
                    </Button>
                </div>

                {error ? (
                    <Alert variant='danger'>{error}</Alert>
                ) : null}

                {tokenError ? (
                    <Alert variant='danger'>{tokenError}</Alert>
                ) : null}

                {authMode === 'token' ? (
                    <>
                        <Label>
                            Raindrop API Test Token
                            <a
                                href='https://app.raindrop.io/settings/integrations'
                                target='_blank'
                                rel='noreferrer'
                                style={{ fontSize: '0.85em', float: 'right' }}>
                                Get token ↗
                            </a>
                        </Label>
                        <Text
                            type='text'
                            autoFocus
                            placeholder='19f0140a-beda-48ad-bb24-3dc7586be443'
                            value={apiToken}
                            onChange={e=>setApiToken(e.target.value)} />

                        <div style={{ fontSize: '0.85em', opacity: 0.8, marginTop: '4px', marginBottom: '8px' }}>
                            Paste the <b>Test token</b> from your Raindrop Developer integrations page.
                        </div>

                        <Button
                            type='button'
                            variant='primary'
                            data-block
                            disabled={tokenLoading}
                            onClick={onTokenSubmit}>
                            {tokenLoading ? 'Connecting…' : 'Connect Raindrop Account'}
                        </Button>
                    </>
                ) : (
                    <>
                        <Label>{t.s('emailOrUsername')}</Label>
                        <Text
                            type='text'
                            name='email'
                            autoFocus
                            required
                            inputMode='email'
                            autoCapitalize='none'
                            spellCheck='false'
                            value={email}
                            onChange={onChangeEmailField} />

                        <Label>
                            {t.s('password')}
                            <Button 
                                as={Link}
                                size='small'
                                variant='link'
                                to='/account/lost'
                                tabIndex='1'>
                                {t.s('recoverPassword')}
                            </Button>
                        </Label>
                        <Text
                            type='password'
                            name='password'
                            required
                            value={password}
                            onChange={onChangePasswordField} />

                        <input type='hidden' name='redirect' value={redirect} />

                        <Button
                            as='input'
                            type='submit'
                            variant='primary'
                            data-block
                            value={t.s('signIn')} />

                        <Social />

                        <Button
                            as={Link}
                            to='/account/signup'
                            variant='link'
                            data-block>
                            {t.s('register')}
                        </Button>
                    </>
                )}
            </Layout>
        </form>
    )
}
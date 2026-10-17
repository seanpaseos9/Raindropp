import React, { useState, useCallback, useMemo } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { loginWithPassword, refresh } from '~data/actions/user'
import { enableGuestMode, disableGuestMode } from '~data/modules/mockGuest'
import t from '~t'
import sessionStorage from '~modules/sessionStorage'

import { Helmet } from 'react-helmet'
import { Link, useSearchParams } from 'react-router-dom'
import { Layout, Text, Label, Separator } from '~co/common/form'
import Button from '~co/common/button'
import Social from '../social'
import Alert from '~co/common/alert'

export default function AccountLogin() {
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState('')
    const [apiToken, setApiToken] = useState('')
    const [showEmailLogin, setShowEmailLogin] = useState(false)
    const [search] = useSearchParams()
    const redirect = sessionStorage.getItem('redirect') || ''

    const error = useMemo(()=>{
        const { error } = Object.fromEntries(new URLSearchParams(search))||{}
        return error
    }, [search])

    const onChangeEmailField = useCallback(e=>setEmail(e.target.value), [])
    const onChangePasswordField = useCallback(e=>setPassword(e.target.value), [])

    const onSubmit = useCallback(e=>{
        e.preventDefault()
        setSubmitting(true)
        setSubmitError('')

        disableGuestMode()
        dispatch(loginWithPassword({ email, password }, ()=>{
            setSubmitting(false)
            navigate(redirect || '/my/0')
        }, (err)=>{
            setSubmitting(false)
            setSubmitError(err?.message || (typeof err === 'string' ? err : 'Invalid email or password'))
        }))
    }, [email, password, dispatch, navigate, redirect])

    const handleInstantLogin = useCallback(()=>{
        enableGuestMode()
        dispatch(refresh())
        navigate(redirect || '/my/0')
    }, [dispatch, navigate, redirect])

    const onTokenSubmit = useCallback(async (e)=>{
        if (e) e.preventDefault()
        const cleanToken = apiToken.trim()
        if (!cleanToken) {
            setSubmitError('Please enter your Raindrop API Test Token')
            return
        }
        setSubmitting(true)
        setSubmitError('')
        try {
            disableGuestMode()
            window.localStorage.setItem('raindrop_token', cleanToken)
            dispatch(refresh())
            navigate(redirect || '/my/0')
        } catch (err) {
            window.localStorage.removeItem('raindrop_token')
            setSubmitError(err.message || 'Failed to authenticate with token')
        } finally {
            setSubmitting(false)
        }
    }, [apiToken, dispatch, navigate, redirect])

    const onSocialClick = useCallback((vendor)=>{
        setSubmitError(`To sync your ${vendor === 'google' ? 'Google' : 'Apple'} Raindrop account to this app, please paste your Raindrop API Test Token using the 3 steps below.`)
    }, [])

    return (
        <form onSubmit={onTokenSubmit}>
            <Helmet><title>{t.s('signIn')}</title></Helmet>

            <Layout>
                {/* 1. Real Account Sync (Primary Option) */}
                <div style={{
                    background: 'var(--background-secondary, rgba(0,0,0,0.03))',
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid rgba(0, 122, 255, 0.25)',
                    marginBottom: '14px'
                }}>
                    <div style={{ fontWeight: 700, fontSize: '15px', color: '#007aff', marginBottom: '4px' }}>
                        🔑 Sync Real Bookmarks (Google / Raindrop)
                    </div>
                    <p style={{ fontSize: '13px', margin: '0 0 10px 0', opacity: 0.85, lineHeight: 1.5 }}>
                        To load all your real bookmarks from your Google email or Raindrop account:
                    </p>
                    
                    <ol style={{ fontSize: '12px', paddingLeft: '18px', margin: '0 0 12px 0', lineHeight: 1.6 }}>
                        <li>
                            <a
                                href='https://app.raindrop.io/settings/integrations'
                                target='_blank'
                                rel='noreferrer'
                                style={{ fontWeight: 600, color: '#007aff' }}>
                                1. Open Raindrop Settings → Integrations ↗
                            </a>
                        </li>
                        <li>Scroll down to <strong>For Developers</strong> and click <strong>Create test token</strong></li>
                        <li>Copy and paste your token below:</li>
                    </ol>

                    <Text
                        type='text'
                        autoFocus
                        placeholder='Paste your Raindrop Test Token'
                        value={apiToken}
                        onChange={e=>setApiToken(e.target.value)} />

                    <Button
                        type='button'
                        variant='primary'
                        data-block
                        style={{ marginTop: '10px', background: '#007aff', fontWeight: 600 }}
                        disabled={submitting}
                        onClick={onTokenSubmit}>
                        {submitting ? 'Connecting…' : '✨ Connect & Load Real Bookmarks'}
                    </Button>
                </div>

                {error ? (
                    <Alert variant='danger'>{error}</Alert>
                ) : null}

                {submitError ? (
                    <Alert variant='info'>{submitError}</Alert>
                ) : null}

                {/* Continue with Google / Apple buttons */}
                <Social onVendorClick={onSocialClick} />

                <Separator />

                {/* 2. Sample Demo Option */}
                <Button
                    type='button'
                    variant='outline'
                    data-block
                    style={{ marginBottom: '10px', fontWeight: 500 }}
                    onClick={handleInstantLogin}>
                    🚀 Preview Demo Account (Sample Bookmarks)
                </Button>

                {/* 3. Traditional Email / Password Login */}
                <div style={{ textAlign: 'center', marginTop: '6px' }}>
                    <Button
                        type='button'
                        variant='link'
                        size='small'
                        onClick={()=>setShowEmailLogin(!showEmailLogin)}>
                        {showEmailLogin ? 'Hide Email & Password Form' : 'Log in with Email & Password instead'}
                    </Button>
                </div>

                {showEmailLogin ? (
                    <div style={{ marginTop: '14px', borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: '14px' }}>
                        <Label>{t.s('emailOrUsername')}</Label>
                        <Text
                            type='text'
                            name='email'
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
                            value={password}
                            onChange={onChangePasswordField} />

                        <Button
                            type='button'
                            variant='primary'
                            disabled={submitting}
                            data-block
                            onClick={onSubmit}>
                            {submitting ? 'Signing in…' : t.s('signIn')}
                        </Button>
                    </div>
                ) : null}
            </Layout>
        </form>
    )
}
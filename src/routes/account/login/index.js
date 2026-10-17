import React, { useState, useCallback, useMemo } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { loginWithPassword, refresh } from '~data/actions/user'
import { enableGuestMode } from '~data/modules/mockGuest'
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
    const [showTokenInput, setShowTokenInput] = useState(false)
    const [apiToken, setApiToken] = useState('')
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

    return (
        <form onSubmit={onSubmit}>
            <Helmet><title>{t.s('signIn')}</title></Helmet>

            <Layout>
                {/* 1-Click Instant Demo Button */}
                <Button
                    type='button'
                    variant='primary'
                    data-block
                    style={{ marginBottom: '14px', background: '#007aff', fontWeight: 600, fontSize: '13px' }}
                    onClick={handleInstantLogin}>
                    🚀 1-Click Instant Demo (Photos & Duplicates)
                </Button>

                <Separator />

                {error ? (
                    <Alert variant='danger'>{error}</Alert>
                ) : null}

                {submitError ? (
                    <Alert variant='danger'>{submitError}</Alert>
                ) : null}

                {!showTokenInput ? (
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

                        <Button
                            as='button'
                            type='submit'
                            variant='primary'
                            disabled={submitting}
                            data-block>
                            {submitting ? 'Signing in…' : t.s('signIn')}
                        </Button>

                        <div style={{ textAlign: 'center', marginTop: '10px' }}>
                            <Button
                                type='button'
                                variant='link'
                                size='small'
                                onClick={()=>setShowTokenInput(true)}>
                                Or connect using Raindrop API Token ↗
                            </Button>
                        </div>

                        <Social />

                        <Button
                            as={Link}
                            to='/account/signup'
                            variant='link'
                            data-block>
                            {t.s('register')}
                        </Button>
                    </>
                ) : (
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
                            placeholder='Paste your Raindrop Test Token'
                            value={apiToken}
                            onChange={e=>setApiToken(e.target.value)} />

                        <Button
                            type='button'
                            variant='primary'
                            data-block
                            disabled={submitting}
                            onClick={onTokenSubmit}>
                            {submitting ? 'Connecting…' : 'Connect Account with Token'}
                        </Button>

                        <div style={{ textAlign: 'center', marginTop: '10px' }}>
                            <Button
                                type='button'
                                variant='link'
                                size='small'
                                onClick={()=>setShowTokenInput(false)}>
                                ← Back to Email & Password
                            </Button>
                        </div>
                    </>
                )}
            </Layout>
        </form>
    )
}
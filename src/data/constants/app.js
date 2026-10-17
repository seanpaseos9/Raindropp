export const
	APP_DOMAIN 			= 'raindrop.io'

export const
	APP_BASE_URL 		= `https://${APP_DOMAIN}`,
	WORKERS_BASE_URL	= 'https://rdl.ink',
	LEGACY_WORKERS_BASE_URL=`https://stella.${APP_DOMAIN}`

export const
	RECAPTCHA_SITE_KEY = '6LfB38wUAAAAAMX3VuFcriTz-Tb-qw7MD966XNnk'

export const
	API_ENDPOINT_URL 	= (typeof window !== 'undefined' && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1'))
		? 'https://api.raindrop.io/rest/v1/'
		: '/v1/',
	API_RETRIES 		= 3,
	API_TIMEOUT 		= 30000,
	FAVICON_URL 		= `${WORKERS_BASE_URL}/favicon`,
	RENDER_URL 			= `${WORKERS_BASE_URL}/render`,
	PREVIEW_URL			= 'https://preview.systems',
	BETA_AI_URL			= 'https://beta-ai.raindrop.io/ai'
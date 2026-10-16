import {
	blankCurrent
} from '../helpers/user'

export const user = ({user={}})=>{
	if (!user.getIn(['current', '_id']))
		return blankCurrent

	return user.current
}

export const userStatus = ({user={}})=>{
	return user.status
}

export const errorReason = ({user={}})=>{
	return user.errorReason
}

export const isNotAuthorized = ({user={}})=>
	user.getIn(['status', 'authorized'])=='no'

export const isLogged = ({user={}})=>
	user.status=='loaded'

export const isPro = ({user={}})=>
	user.getIn(['current', 'pro']) ? true : false

export const subscription = ({user={}})=>user.subscription

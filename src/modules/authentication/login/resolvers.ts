import * as yup from 'yup'

import { Context } from '../../../tstypes'
import { ForbiddenError, ApolloError, AuthenticationError } from 'apollo-server'
import { INVALID_CREDENTIALS, USER_SESSION_ID_PREFIX } from '../../../constants'
import {
	comparePassword,
	createToken
} from '../../../utils/auth/helperFunctions'
import { logger } from '../../../utils/logger'
import { GQL } from '../../../tstypes/schema'
import { User } from '../../../generated/prisma'

const loginSchema: yup.ObjectSchema<{}> = yup.object().shape({
	email: yup
		.string()
		.required()
		.email(),
	password: yup.string().required()
})

export const resolvers = {
	Mutation: {
		async login(
			_: any,
			{ email, password }: GQL.ILoginOnMutationArguments,
			{ db, session, redis, req }: Context
		): Promise<any> {
			try {
				if (
					await loginSchema.validate(
						{ email, password },
						{ abortEarly: false }
					)
				) {
					const user: User | null = await db.query.user({
						where: { email }
					})

					if (!user) {
						throw new AuthenticationError(INVALID_CREDENTIALS)
					}

					if (!user.confirmed) {
						throw new ApolloError(
							`User is not confirmed, please check your email: ${email}`
						)
					}

					const valid = await comparePassword(
						password as string,
						user.password
					)

					if (!valid) {
						throw new ForbiddenError(INVALID_CREDENTIALS)
					}

					await db.mutation.updateUser({
						where: { email },
						data: { online: true }
					})

					const [token, refreshToken] = await createToken(
						user,
						'secret'
					)

					console.log('SESSION', session)

					session.userId = user.id
					if (req.sessionID) {
						await redis.lpush(
							`${USER_SESSION_ID_PREFIX}${user.id}`,
							req.sessionID
						)
					}

					return {
						__typename: 'LoginResponse',
						ok: true,
						token,
						refreshToken,
						user
					}
				} else {
					throw new AuthenticationError(INVALID_CREDENTIALS)
				}
			} catch (error) {
				logger.error({ level: '5', message: error })
				return error
			}
		}
	}
}

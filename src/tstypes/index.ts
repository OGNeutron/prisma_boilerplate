import { Request, Response } from 'express'
import { Redis } from 'ioredis'
import { S3 } from 'aws-sdk'
import { Prisma } from '../generated/prisma'

export interface IExpressTypes {
	request: Request
	response: Response
}

export interface ProcessEnv {
	[key: string]: string | undefined
}

export interface User {
	id: string
	username: string
}

export interface Session extends Express.Session {
	userId?: string
	decodedUser?: string
}

export interface Context {
	redis: Redis
	session: Session
	req: Request
	res: Response
	db: Prisma
	s3: S3
}

export type Resolver = (
	parent: Object,
	args: Object,
	context: Context,
	info: any
) => any

export type GraphqlMiddleFunc = (
	resolver: Resolver,
	parent: Object,
	args: Object,
	context: Context,
	info: any
) => any

export interface ResolverMap {
	[key: string]: {
		[key: string]: Resolver
	}
}

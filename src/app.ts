// para usar o supertest e separar as solicitacoes nas portas especificas de cada arquivo
// app.ts e server.ts

import fastify from 'fastify'
import cookie from '@fastify/cookie'
import { transactionsRoutes } from './routes/transactions'

export const app = fastify()

app.register(cookie)

app.register(transactionsRoutes, {
  prefix: 'transactions',
})

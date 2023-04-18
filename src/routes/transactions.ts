import { FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'
import { string, z } from 'zod'
import { knex } from '../database'
import { checkSessionIdExists } from '../middlewares/check-session-id-exists'

// Nesse caso, usaremos os cookies para armazenar as informacoes do usuario
// driblando a necessidade de fazer login na aplicacao.
// Para isso, usaremos o session_id.

// Com o cookie criado, podemos acessar o conteudo exclusivo daquela sessao, ou seja, daquele usuario.

export async function transactionsRoutes(app: FastifyInstance) {
  // app.addHook('preHandler', async (request, reply) => {
  //   console.log(`[${request.method}] ${request.url}`)
  // }) //handler global que fornecera apenas informacoes do contexto ao qual pertence. No caso, preHandler

  app.get(
    '/',
    {
      preHandler: [checkSessionIdExists], // comporta-se como um middleware
    },

    async (request, reply) => {
      const { sessionId } = request.cookies
      const transactions = await knex('transactions')
        .where('session_id', sessionId)
        .select()

      return { transactions }
    },
  )

  app.get(
    '/:id',
    {
      preHandler: [checkSessionIdExists], // comporta-se como um middleware
    },
    async (request) => {
      const getTransactionParamsSchema = z.object({
        id: string().uuid(),
      })
      const { id } = getTransactionParamsSchema.parse(request.params)

      const { sessionId } = request.cookies

      const transaction = await knex('transactions')
        .where({
          session_id: sessionId,
          id,
        })
        .first()

      return { transaction }
    },
  )

  app.get(
    '/summary',
    {
      preHandler: [checkSessionIdExists], // comporta-se como um middleware
    },

    async (request) => {
      const { sessionId } = request.cookies

      const summary = await knex('transactions')
        .where('session_id', sessionId)
        .sum('amount', { as: 'amount' })
        .first()
      return { summary }
    },
  )

  app.post('/', {}, async (request, reply) => {
    const createTransacationBodySchema = z.object({
      title: z.string(),
      amount: z.number(),
      type: z.enum(['credit', 'debit']),
    })

    const { title, amount, type } = createTransacationBodySchema.parse(
      request.body,
    )
    // esta sendo colocado na rota da criacao do registro.
    let sessionId = request.cookies.sessionId

    if (!sessionId) {
      sessionId = randomUUID()

      reply.cookie('sessionId', sessionId, {
        path: '/', // indicando que todas as rotas poderao acessar o cookie
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 dias (validade do cookie no navegador)
      })
    }

    await knex('transactions').insert({
      id: randomUUID(),
      title,
      amount: type === 'credit' ? amount : amount * -1,
      session_id: sessionId,
    })
    return reply.status(201).send()
  })
}

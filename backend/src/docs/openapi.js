'use strict';

/**
 * Especificação OpenAPI 3.0 da API REST do projeto.
 *
 * Documenta todas as rotas sob `/api`. Servida via Swagger UI em `/api/docs`
 * (ver `src/server.js`). Mantida como objeto JS curado para refletir com
 * precisão os controllers/rotas existentes.
 */

const bearer = [{ bearerAuth: [] }];

/** Resposta de erro padrão usada em vários endpoints. */
const errorResponse = {
  description: 'Erro',
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/Error' },
    },
  },
};

const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Gislei Lunkes Paisagismo — API',
    version: '1.0.0',
    description:
      'API REST do e-commerce de kokedamas e paisagismo. Autenticação via JWT ' +
      '(Bearer). Inclui rotas públicas, de conta do usuário e do backoffice.',
  },
  servers: [{ url: '/api', description: 'Base da API' }],
  tags: [
    { name: 'Auth', description: 'Autenticação de usuários (local + Google)' },
    { name: 'Conta', description: 'Conta do usuário logado (perfil, pedidos)' },
    { name: 'Loja', description: 'Catálogo, checkout e configuração pública' },
    { name: 'Estatísticas', description: 'Tracking anônimo (LGPD)' },
    { name: 'Backoffice', description: 'Área de funcionários (protegida)' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          details: { type: 'array', items: { type: 'string' } },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string', nullable: true },
          provider: { type: 'string', enum: ['local', 'google'] },
          avatarUrl: { type: 'string', nullable: true },
        },
      },
      Product: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
          category: {
            type: 'string',
            enum: ['kokedama', 'arranjo', 'vaso', 'servico', 'acessorio'],
          },
          badge: { type: 'string', enum: ['novo', 'oferta'], nullable: true },
          price: { type: 'number' },
          oldPrice: { type: 'number', nullable: true },
          imageUrl: { type: 'string', nullable: true },
          quantity: { type: 'integer' },
          stockStatus: { type: 'string', enum: ['disponivel', 'encomenda'] },
          active: { type: 'boolean' },
        },
      },
      Order: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid', nullable: true },
          customerName: { type: 'string' },
          customerEmail: { type: 'string', nullable: true },
          customerPhone: { type: 'string', nullable: true },
          total: { type: 'number' },
          paymentMethod: { type: 'string', enum: ['infinitepay', 'whatsapp'] },
          status: {
            type: 'string',
            enum: ['pendente', 'pago', 'em_separacao', 'enviado', 'concluido', 'cancelado'],
          },
          items: { type: 'array', items: { $ref: '#/components/schemas/OrderItem' } },
        },
      },
      OrderItem: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          productId: { type: 'string', format: 'uuid', nullable: true },
          productName: { type: 'string' },
          unitPrice: { type: 'number' },
          quantity: { type: 'integer' },
        },
      },
      CartItem: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          qnt: { type: 'integer', minimum: 1 },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          token: { type: 'string' },
          user: { $ref: '#/components/schemas/User' },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Loja'],
        summary: 'Healthcheck',
        responses: { 200: { description: 'OK' } },
      },
    },

    // ----- Auth -----
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Cadastro local (nome, email, senha, telefone obrigatório)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password', 'phone'],
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                  phone: { type: 'string', description: 'WhatsApp (10–13 dígitos)' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Criado',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } },
          },
          400: errorResponse,
          409: errorResponse,
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login local',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'OK',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } },
          },
          401: errorResponse,
        },
      },
    },
    '/auth/google': {
      post: {
        tags: ['Auth'],
        summary: 'Login/cadastro via Google (ID token)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['credential'],
                properties: { credential: { type: 'string', description: 'Google ID token (JWT)' } },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'OK',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } },
          },
          401: errorResponse,
        },
      },
    },
    '/auth/forgot-password': {
      post: {
        tags: ['Auth'],
        summary: 'Inicia recuperação de senha (resposta genérica)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', required: ['email'], properties: { email: { type: 'string', format: 'email' } } },
            },
          },
        },
        responses: { 200: { description: 'Mensagem genérica (+ resetToken em dev)' } },
      },
    },
    '/auth/reset-password': {
      post: {
        tags: ['Auth'],
        summary: 'Redefine a senha via token de redefinição',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['token', 'password'],
                properties: { token: { type: 'string' }, password: { type: 'string', minLength: 8 } },
              },
            },
          },
        },
        responses: { 200: { description: 'OK' }, 400: errorResponse },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Usuário autenticado',
        security: bearer,
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { user: { $ref: '#/components/schemas/User' } } } } } },
          401: errorResponse,
        },
      },
    },

    // ----- Conta -----
    '/account': {
      get: {
        tags: ['Conta'],
        summary: 'Dados cadastrais',
        security: bearer,
        responses: { 200: { description: 'OK' }, 401: errorResponse },
      },
      put: {
        tags: ['Conta'],
        summary: 'Atualiza nome, telefone e/ou senha',
        security: bearer,
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  phone: { type: 'string' },
                  password: { type: 'string', minLength: 8 },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'OK' }, 400: errorResponse, 401: errorResponse },
      },
      delete: {
        tags: ['Conta'],
        summary: 'Exclui a conta (pedidos são anonimizados)',
        security: bearer,
        responses: { 204: { description: 'Excluído' }, 401: errorResponse },
      },
    },
    '/account/orders': {
      get: {
        tags: ['Conta'],
        summary: 'Histórico de pedidos do usuário',
        security: bearer,
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { orders: { type: 'array', items: { $ref: '#/components/schemas/Order' } } } } } } },
          401: errorResponse,
        },
      },
    },

    // ----- Loja (público) -----
    '/products': {
      get: {
        tags: ['Loja'],
        summary: 'Catálogo público (produtos ativos)',
        parameters: [{ name: 'category', in: 'query', schema: { type: 'string' } }],
        responses: { 200: { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { products: { type: 'array', items: { $ref: '#/components/schemas/Product' } } } } } } } },
      },
    },
    '/products/{id}': {
      get: {
        tags: ['Loja'],
        summary: 'Detalhe de produto',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'OK' }, 404: errorResponse },
      },
    },
    '/config/public': {
      get: {
        tags: ['Loja'],
        summary: 'Status público da loja (modo de venda)',
        responses: {
          200: {
            description: 'OK',
            content: { 'application/json': { schema: { type: 'object', properties: { ecommerceActive: { type: 'boolean' }, whatsappNumber: { type: 'string', nullable: true }, storeName: { type: 'string' } } } } },
          },
        },
      },
    },
    '/checkout': {
      post: {
        tags: ['Loja'],
        summary: 'Finaliza a compra (requer login + telefone válido)',
        description:
          'Cria o pedido e, conforme o modo da loja, devolve dados PIX (Infinite Pay) ou a URL do WhatsApp.',
        security: bearer,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['cart'],
                properties: {
                  cart: { type: 'array', items: { $ref: '#/components/schemas/CartItem' } },
                  notes: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Pedido criado',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    mode: { type: 'string', enum: ['infinitepay', 'whatsapp'] },
                    orderId: { type: 'string', format: 'uuid' },
                    total: { type: 'number' },
                    redirectUrl: { type: 'string', description: 'Presente no modo whatsapp' },
                    pix: {
                      type: 'object',
                      properties: { code: { type: 'string' }, qrImageUrl: { type: 'string' } },
                    },
                  },
                },
              },
            },
          },
          400: errorResponse,
          401: errorResponse,
        },
      },
    },
    '/track': {
      post: {
        tags: ['Estatísticas'],
        summary: 'Registra evento anônimo (LGPD)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['eventType'],
                properties: {
                  eventType: { type: 'string', enum: ['pageview', 'product_click', 'add_to_cart', 'checkout_start'] },
                  path: { type: 'string' },
                  refId: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 202: { description: 'Aceito' }, 400: errorResponse },
      },
    },

    // ----- Backoffice -----
    '/backoffice/auth/login': {
      post: {
        tags: ['Backoffice'],
        summary: 'Login de funcionário',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string' }, password: { type: 'string' } } },
            },
          },
        },
        responses: { 200: { description: 'OK' }, 401: errorResponse },
      },
    },
    '/backoffice/auth/me': {
      get: { tags: ['Backoffice'], summary: 'Funcionário autenticado', security: bearer, responses: { 200: { description: 'OK' }, 401: errorResponse } },
    },
    '/backoffice/employees': {
      post: { tags: ['Backoffice'], summary: 'Cria funcionário (admin)', security: bearer, responses: { 201: { description: 'Criado' }, 403: errorResponse } },
    },
    '/backoffice/products': {
      get: { tags: ['Backoffice'], summary: 'Lista todos os produtos', security: bearer, responses: { 200: { description: 'OK' } } },
      post: { tags: ['Backoffice'], summary: 'Cria produto', security: bearer, responses: { 201: { description: 'Criado' }, 400: errorResponse } },
    },
    '/backoffice/products/{id}': {
      put: { tags: ['Backoffice'], summary: 'Atualiza produto/estoque', security: bearer, parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' }, 404: errorResponse } },
      delete: { tags: ['Backoffice'], summary: 'Remove produto', security: bearer, parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 204: { description: 'Removido' }, 404: errorResponse } },
    },
    '/backoffice/orders': {
      get: { tags: ['Backoffice'], summary: 'Lista pedidos', security: bearer, parameters: [{ name: 'status', in: 'query', schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } },
    },
    '/backoffice/orders/{id}': {
      get: { tags: ['Backoffice'], summary: 'Detalhe do pedido', security: bearer, parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' }, 404: errorResponse } },
    },
    '/backoffice/orders/{id}/status': {
      patch: { tags: ['Backoffice'], summary: 'Atualiza status do pedido', security: bearer, parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' }, 400: errorResponse } },
    },
    '/backoffice/config': {
      get: { tags: ['Backoffice'], summary: 'Configuração completa', security: bearer, responses: { 200: { description: 'OK' } } },
      put: { tags: ['Backoffice'], summary: 'Atualiza modo de venda (admin)', security: bearer, responses: { 200: { description: 'OK' }, 403: errorResponse } },
    },
    '/backoffice/analytics': {
      get: { tags: ['Backoffice'], summary: 'Resumo agregado de estatísticas', security: bearer, responses: { 200: { description: 'OK' } } },
    },
  },
};

module.exports = openapiSpec;

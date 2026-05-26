import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Coffee Ordering API',
      version: '1.0.0',
      description:
        'REST API for the Coffee Real-time Ordering System. Supports JWT auth, Line Pay, WebSocket notifications, member points, and guest order tracking.'
    },
    servers: [{ url: '/api' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        },
        guestToken: {
          type: 'apiKey',
          in: 'header',
          name: 'X-Guest-Token'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['user', 'staff', 'admin'] },
            points: { type: 'integer' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Product: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            price: { type: 'number' },
            category: {
              type: 'string',
              enum: ['coffee', 'non-coffee', 'food']
            },
            description: { type: 'string' },
            isAvailable: { type: 'boolean' },
            isRedeemable: { type: 'boolean' },
            redeemPoints: { type: 'integer' }
          }
        },
        OrderItem: {
          type: 'object',
          properties: {
            productId: { type: 'string' },
            name: { type: 'string' },
            price: { type: 'number' },
            quantity: { type: 'integer' }
          }
        },
        Order: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            items: {
              type: 'array',
              items: { $ref: '#/components/schemas/OrderItem' }
            },
            totalAmount: { type: 'number' },
            status: {
              type: 'string',
              enum: [
                'pending',
                'accepted',
                'preparing',
                'ready',
                'completed',
                'cancelled'
              ]
            },
            paymentStatus: {
              type: 'string',
              enum: ['unpaid', 'paid', 'refunded']
            },
            orderLookupCode: { type: 'string' },
            type: { type: 'string', enum: ['purchase', 'redeem'] },
            earnedPoints: { type: 'integer' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Notification: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            orderId: { type: 'string' },
            type: { type: 'string' },
            message: { type: 'string' },
            isRead: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        ApiError: {
          type: 'object',
          properties: {
            status: { type: 'integer' },
            code: { type: 'string' },
            message: { type: 'string' }
          }
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer' },
            limit: { type: 'integer' },
            total: { type: 'integer' }
          }
        }
      }
    }
  },
  apis: [
    process.env.NODE_ENV === 'production'
      ? './dist/modules/**/*.routes.js'
      : './src/modules/**/*.routes.ts'
  ]
};

export const swaggerSpec = swaggerJsdoc(options);

import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Blog API',
      version: '1.0.0',
      description: '博客系统 API 文档',
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: '开发服务器'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: '用户ID'
            },
            username: {
              type: 'string',
              description: '用户名'
            },
            realName: {
              type: 'string',
              description: '真实姓名'
            },
            dateOfBirth: {
              type: 'string',
              format: 'date',
              description: '出生日期'
            },
            bio: {
              type: 'string',
              description: '个人简介'
            },
            avatarUrl: {
              type: 'string',
              description: '头像URL'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: '创建时间'
            },
            status: {
              type: 'string',
              enum: ['active', 'banned'],
              description: '用户状态'
            }
          }
        },
        Article: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: '文章ID'
            },
            title: {
              type: 'string',
              description: '文章标题'
            },
            content: {
              type: 'string',
              description: '文章内容'
            },
            htmlContent: {
              type: 'string',
              description: '文章HTML内容'
            },
            imageUrl: {
              type: 'string',
              description: '文章封面图片URL'
            },
            status: {
              type: 'string',
              enum: ['draft', 'published', 'pending', 'rejected'],
              description: '文章状态'
            },
            viewCount: {
              type: 'integer',
              description: '浏览次数'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: '创建时间'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: '更新时间'
            },
            author: {
              type: 'object',
              properties: {
                id: {
                  type: 'integer',
                  description: '作者ID'
                },
                username: {
                  type: 'string',
                  description: '作者用户名'
                },
                avatarUrl: {
                  type: 'string',
                  description: '作者头像URL'
                }
              }
            }
          }
        },
        Comment: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: '评论ID'
            },
            content: {
              type: 'string',
              description: '评论内容'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: '创建时间'
            },
            parentId: {
              type: 'integer',
              nullable: true,
              description: '父评论ID'
            },
            visibility: {
              type: 'integer',
              enum: [0, 1],
              description: '可见性（0: 隐藏, 1: 可见）'
            },
            user: {
              type: 'object',
              properties: {
                id: {
                  type: 'integer',
                  description: '用户ID'
                },
                username: {
                  type: 'string',
                  description: '用户名'
                },
                avatarUrl: {
                  type: 'string',
                  description: '用户头像URL'
                }
              }
            },
            children: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Comment'
              },
              description: '子评论'
            }
          }
        },
        AdminStats: {
          type: 'object',
          properties: {
            users: {
              type: 'object',
              properties: {
                total: {
                  type: 'integer',
                  description: '总用户数'
                },
                active: {
                  type: 'integer',
                  description: '活跃用户数'
                },
                banned: {
                  type: 'integer',
                  description: '被封禁用户数'
                }
              }
            },
            articles: {
              type: 'object',
              properties: {
                total: {
                  type: 'integer',
                  description: '总文章数'
                },
                published: {
                  type: 'integer',
                  description: '已发布文章数'
                },
                pending: {
                  type: 'integer',
                  description: '待审核文章数'
                },
                totalViews: {
                  type: 'integer',
                  description: '总浏览量'
                }
              }
            },
            comments: {
              type: 'object',
              properties: {
                total: {
                  type: 'integer',
                  description: '总评论数'
                },
                visible: {
                  type: 'integer',
                  description: '可见评论数'
                },
                hidden: {
                  type: 'integer',
                  description: '隐藏评论数'
                }
              }
            },
            likes: {
              type: 'object',
              properties: {
                total: {
                  type: 'integer',
                  description: '总点赞数'
                }
              }
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Auth',
        description: '认证相关接口'
      },
      {
        name: 'Users',
        description: '用户相关接口'
      },
      {
        name: 'Articles',
        description: '文章相关接口'
      },
      {
        name: 'Comments',
        description: '评论相关接口'
      },
      {
        name: 'Admin',
        description: '管理员相关接口'
      }
    ]
  },
  apis: ['./src/routes/*.ts']
};

export const swaggerSpec = swaggerJsdoc(options); 
const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",

    info: {
      title: "Node API",
      version: "1.0.0",
      description: "REST API built with Node.js, Express and MongoDB",
    },

    servers: [
      {
        url: "http://localhost:5000",
        description: "Local development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },

    tags: [
      {
        name: "Users",
        description: "User management APIs",
      },
    ],
  },

  apis: ["./src/routes/*.js"],

  failOnErrors: true,
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;

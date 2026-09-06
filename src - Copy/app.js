const express = require("express");
const swaggerUi = require("swagger-ui-express");

const userRoutes = require("./routes/user.routes");

const authRoutes = require("./routes/auth.routes");

const swaggerSpec = require("./config/swagger");

const app = express();

app.use(express.json());

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/api/v1/users", userRoutes);

app.use("/api/v1/auth", authRoutes);

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Node API is running",
  });
});

module.exports = app;

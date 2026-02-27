const express = require("express");
const { MetalController } = require("./metal.controller");

const createMetalRouter = () => {
  const router = express.Router();
  const controller = new MetalController();

  router.get("/prices", controller.getPrices);

  return router;
};

module.exports = { createMetalRouter };

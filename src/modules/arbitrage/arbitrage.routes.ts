import { Router } from "express";
import ArbitrageController from "./arbitrage.controller";

class ArbitrageRoutes {
  router = Router();
  controller = new ArbitrageController();

  constructor() {
    this.intializeRoutes();
  }

  intializeRoutes() {
    this.router.get("/all", this.controller.exchanges);
    this.router.post("/create", this.controller.create);
  }
}

export default new ArbitrageRoutes().router;

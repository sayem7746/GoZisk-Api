import { Router } from "express";
import ArbitrageController from "./arbitrage.controller";

class ArbitrageRoutes {
  router = Router();
  controller = new ArbitrageController();

  constructor() {
    this.intializeRoutes();
  }

  intializeRoutes() {
    this.router.get("/date/:date", this.controller.getByDate);
    this.router.get("/all", this.controller.exchanges);
    this.router.get("/users/:id", this.controller.arbitrageById);
    this.router.get("/calculate", this.controller.arbitrageCalculate);
    this.router.get("/calculate/date/:date", this.controller.arbitrageCalculate);
    this.router.post("/create", this.controller.create);
  }
}

export default new ArbitrageRoutes().router;

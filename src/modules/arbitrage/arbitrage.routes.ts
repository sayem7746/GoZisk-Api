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
    this.router.get("/latest/marketprice", this.controller.getLatestEightWeeks);
    this.router.get("/users/:id", this.controller.arbitrageById);
    this.router.get("/calculate", this.controller.arbitrageCalculate);
    this.router.get("/calculate/date/:date", this.controller.arbitrageCalculate);
    this.router.get("/filter/date/:date", this.controller.arbitrageFilter);
    this.router.get("/filter", this.controller.arbitrageFilter);
    this.router.get("/bids/date/:date", this.controller.arbitrageBidsByDate);
    this.router.get("/bids", this.controller.arbitrageBidsByDate);
    this.router.post("/create", this.controller.create);
    this.router.post("/onesignal/user/:userId", this.controller.notify);
  }
}

export default new ArbitrageRoutes().router;

import { Router } from "express";
import ArbitrageController from "./arbitrage.controller";
import { auth } from "../../middleware/auth";

class ArbitrageRoutes {
  router = Router();
  controller = new ArbitrageController();

  constructor() {
    this.intializeRoutes();
  }

  intializeRoutes() {
    this.router.get("/calculate", this.controller.arbitrageSplitCalculate);
    this.router.get("/adjust", this.controller.adjustInvestment);

    // Auth required.
    this.router.get("/date/:date", auth, this.controller.getByDate);

    this.router.get("/all", auth, this.controller.exchanges);
    this.router.get("/latest/marketprice", auth, this.controller.getLatestEightWeeks);
    this.router.get("/users/:id", auth, this.controller.arbitrageById);

    // manually calculate arbitrage by date
    this.router.get("/calculate/date/:date", auth, this.controller.arbitrageSplitCalculate);
    // reset arbitrage by date
    this.router.get("/reset/date/:date", auth, this.controller.resetArbitrageByDate);

    this.router.get("/filter/date/:date", auth, this.controller.arbitrageFilter);
    this.router.get("/filter", this.controller.arbitrageFilter);
    this.router.get("/bids/date/:date", auth, this.controller.arbitrageBidsByDate);
    this.router.get("/bids", auth, this.controller.arbitrageBidsByDate);

    this.router.post("/create", this.controller.create);
    this.router.get("/create/bid", this.controller.createBid);

    // Auth required.
    this.router.post("/onesignal/user/:userId", auth, this.controller.notify);
  }
}

export default new ArbitrageRoutes().router;

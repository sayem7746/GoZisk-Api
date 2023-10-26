import { Router } from "express";
import WalletController from "./wallet.controller";

class UserRoutes {
  router = Router();
  controller = new WalletController();

  constructor() {
    this.intializeRoutes();
  }

  intializeRoutes() {
    // Find user's wallet
    this.router.get("/user/:id", this.controller.findOne);
    this.router.get("/pairing", this.controller.pairing);
    this.router.get("/deposit/user/:userId", this.controller.depositAddress);
    this.router.post("/deposit", this.controller.saveDeposit);
  }
}

export default new UserRoutes().router;

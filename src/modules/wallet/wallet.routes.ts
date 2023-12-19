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
    // deposit callback url
    this.router.post("/deposit", this.controller.saveDeposit);

    // withdrawal address
    this.router.get("/address/all/user/:id", this.controller.allAddress);
    this.router.get("/address/active/user/:id", this.controller.activeAddress);
    this.router.post("/address/user/:id", this.controller.addAddress);
    this.router.patch("/address/:id", this.controller.updateAddress);
    this.router.delete("/address/user/:id", this.controller.deleteAddress);

    // withdrawal
    this.router.get("/withdrawal-list", this.controller.getAllPendingWithdrawal);
    // retrive user specific withdrawals
    this.router.get("/withdraw/user/:id", this.controller.getAllWithdraw);
    // add user withdrawal
    this.router.post("/withdraw/user/:id", this.controller.addWithdraw);

    this.router.post("/withdraw/approve", this.controller.approveWithdrawal);
    this.router.post("/withdraw/reject", this.controller.rejectWithdrawal);
    
    // payout callback url
    this.router.post("/payout", this.controller.savePayout);
  }
}

export default new UserRoutes().router;

import { Router } from "express";
import WalletController from "./wallet.controller";
import { auth } from "../../middleware/auth";

class UserRoutes {
  router = Router();
  controller = new WalletController();

  constructor() {
    this.intializeRoutes();
  }

  intializeRoutes() {
    // Find user's wallet
    this.router.get("/user/:id", auth, this.controller.findOne);
    this.router.get("/pairing", this.controller.pairing);
    this.router.get("/pairing/fix", auth, this.controller.fixPairing);
    this.router.get("/deposit/user/:userId", auth, this.controller.depositAddress);
    
    // currenct btc value
    this.router.get("/market-value", auth, this.controller.currentValue);

    // deposit callback url
    this.router.post("/deposit", this.controller.saveDeposit);

    // withdrawal address
    this.router.get("/address/all/user/:id", auth, this.controller.allAddress);
    this.router.get("/address/active/user/:id", auth, this.controller.activeAddress);
    this.router.post("/address/user/:id", auth, this.controller.addAddress);
    this.router.patch("/address/:id", auth, this.controller.updateAddress);
    this.router.delete("/address/user/:id", auth, this.controller.deleteAddress);

    // withdrawal
    this.router.get("/withdrawal-list", auth, this.controller.getAllPendingWithdrawal);
    // retrive user specific withdrawals
    this.router.get("/withdraw/user/:id", auth, this.controller.getAllWithdraw);
    
    // add user withdrawal
    this.router.post("/withdraw/user/:id", auth, this.controller.addWithdraw);

    this.router.post("/withdraw/approve", auth, this.controller.approveWithdrawal);
    this.router.post("/withdraw/reject", auth, this.controller.rejectWithdrawal);
    
    // payout callback url
    this.router.post("/payout", this.controller.savePayout);

    // report
    this.router.get("/report/:view/all", auth, this.controller.getAllWallet);
    this.router.get("/report/paramname/:paramname/paramvalue/:paramvalue", auth, this.controller.getWalletByParams);

    // fetch group sale according to date
    this.router.get("/group-sale/:userId/:dateFrom/:dateTo", auth, this.controller.getGroupSale);
  }
}

export default new UserRoutes().router;

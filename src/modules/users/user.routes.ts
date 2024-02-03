import { Router } from "express";
import UserController from "./user.controller";
import { auth } from "../../middleware/auth";

class UserRoutes {
  router = Router();
  controller = new UserController();

  constructor() {
    this.intializeRoutes();
  }

  intializeRoutes() {

    // Retrieve all Users
    this.router.get("/", auth, this.controller.findAll);
    this.router.get("/page/:startPage/:numberUser", auth, this.controller.findAll);

    // Retrieve all published Users
    this.router.get("/published", auth,this.controller.findAllPublished);

    // Retrieve a single User with id
    this.router.get("/:id", auth,this.controller.findOne);
    this.router.get("/detail/:id", auth,this.controller.findUserDetail);

    // Update a User with id
    this.router.put("/:id", auth,this.controller.update);

    // Delete a User with id
    // this.router.delete("/:id", auth,this.controller.delete);

    // Delete all Users
    // this.router.delete("/", auth, this.controller.deleteAll);

    // Delete a User with id
    this.router.get("/hierarchy/:id", auth, this.controller.getHierarchy);

    // Get user transactions
    this.router.get("/transactions/user/:userId/types/:types/limit/:limit/date/:date", auth, this.controller.transactions);
    this.router.get("/transactions/user/:userId/types/:types/limit/:limit", auth, this.controller.transactions);
    
    // transaction read individual transaction.
    this.router.post("/transactions/read/:transId", auth, this.controller.transactionRead);
    this.router.post("/transactions/read/all/user/:userId", auth, this.controller.transactionReadAll);

    // check referral user
    this.router.post("/referral", this.controller.checkReferral);

    // Transfer money to another user
    this.router.post("/transfer", auth, this.controller.transfer);

    // Create a new User
    this.router.post("/signup", this.controller.create);
    this.router.post("/verify", this.controller.emailVerify);
    this.router.post("/genotp", this.controller.generateOtp);

    // User login
    this.router.post("/login", this.controller.login);
    this.router.post("/login/:isAdmin", this.controller.login);
    this.router.post("/update-password/:id", auth, this.controller.updatePassword);
    this.router.post("/forget-password/", this.controller.forgetPassword);

    // User list admin
  }
}

export default new UserRoutes().router;

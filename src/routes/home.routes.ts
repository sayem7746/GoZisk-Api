import { Router } from "express";
import { welcome, email, getBanner, getSettings, sendSupportEmail } from "../controllers/home.controller";
import { auth } from "../middleware/auth";

class HomeRoutes {
  router = Router();

  constructor() {
    this.intializeRoutes();
  }

  intializeRoutes() {
    this.router.get("/", welcome);
    this.router.get("/email-test", email);
    this.router.get("/health", welcome);
    this.router.get("/banner/category/:catType", getBanner);
    this.router.get("/settings", getSettings);
    this.router.post("/support", auth, sendSupportEmail);
  }
}

export default new HomeRoutes().router;

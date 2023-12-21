import { Router } from "express";
import { welcome, email, getBanner } from "../controllers/home.controller";

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
  }
}

export default new HomeRoutes().router;

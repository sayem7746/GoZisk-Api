import { Router } from "express";
import { welcome, email, getBanner, getSettings } from "../controllers/home.controller";

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
  }
}

export default new HomeRoutes().router;

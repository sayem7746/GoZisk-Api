import { Router } from "express";
import { welcome, email } from "../controllers/home.controller";

class HomeRoutes {
  router = Router();

  constructor() {
    this.intializeRoutes();
  }

  intializeRoutes() {
    this.router.get("/", welcome);
    this.router.get("/email-test", email);
    this.router.get("/health", welcome);
  }
}

export default new HomeRoutes().router;

import { Router } from "express";
import PackageController from "./package.controller";

class PackageRoutes {
  router = Router();
  controller = new PackageController();

  constructor() {
    this.intializeRoutes();
  }

  intializeRoutes() {
    // Retrieve all Packages
    this.router.get("/", this.controller.findAll);

    // Retrieve a single Package with id
    this.router.get("/:id", this.controller.findOne);
    
    // Purchase package
    this.router.post("/purchase", this.controller.purchase);
  }
}

export default new PackageRoutes().router;

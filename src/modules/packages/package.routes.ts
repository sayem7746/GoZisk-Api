import { Router } from "express";
import PackageController from "./package.controller";
import { auth } from "../../middleware/auth";

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
    
    // Retrieve a single Package with id
    this.router.get("/my-packages/:id", this.controller.myPackages);
    
    // Purchase package
    this.router.post("/purchase", this.controller.purchase);
    
    // Purchase withdraw
    // this.router.delete("/:packageId", this.controller.deletePackage);
    this.router.delete("/:packageId", this.controller.stopDeletePackage);
  }
}

export default new PackageRoutes().router;

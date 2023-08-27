import { Application } from "express";
import tutorialRoutes from "./tutorial.routes";
import homeRoutes from "./home.routes";
import userRoutes from "../modules/users/user.routes";

export default class Routes {
  constructor(app: Application) {
    app.use("/api", homeRoutes);
    app.use("/api/tutorials", tutorialRoutes);
    app.use("/api/users", userRoutes);
  }
}

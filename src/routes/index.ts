import { Application } from "express";
import tutorialRoutes from "./tutorial.routes";
import homeRoutes from "./home.routes";
import userRoutes from "../modules/users/user.routes";
import packageRoutes from "../modules/packages/package.routes";
import walletRoutes from "../modules/wallet/wallet.routes";
import arbitrageRoutes from "../modules/arbitrage/arbitrage.routes";

export default class Routes {
  constructor(app: Application) {
    app.use("/api", homeRoutes);
    app.use("/api/tutorials", tutorialRoutes);
    app.use("/api/users", userRoutes);
    app.use("/api/packages", packageRoutes);
    app.use("/api/wallet", walletRoutes);
    app.use("/api/arbitrage", arbitrageRoutes);
  }
}

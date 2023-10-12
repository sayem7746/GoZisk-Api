import { OkPacket } from "mysql2";
import connection from "../../db";

import Arbitrage from "./arbitrage.model";

interface IArbitrageRepository {
  save(arbitrage: Arbitrage): Promise<boolean>;
}

class ArbitrageRepository implements IArbitrageRepository {
  save(arbitrage: Arbitrage): Promise<boolean> {
    return new Promise((resolve, reject) => {
      connection.query<OkPacket>(
        `INSERT INTO arbitrage
        (invest_amount, exchange_from, exchange_to, coin_rate_from, coin_rate_to, profit_percentage)
        VALUES(?, ?, ?, ?, ?, ?)`,
        [
          arbitrage.invest_amount,
          arbitrage.exchange_from,
          arbitrage.exchange_to,
          arbitrage.coin_rate_from,
          arbitrage.coin_rate_to,
          arbitrage.profit_percentage
        ],
        (err, res) => {
          if (err) reject(err);
          else
            resolve(true)
        }
      );
    });
  }

  getLastMatch(): Promise<any> {
    return new Promise((resolve, reject) => {
      connection.query<any>(
        "SELECT * FROM arbitrage WHERE profit_percentage >= 0.03 ORDER BY id DESC LIMIT 1",
        (err, res) => {
          if (err) reject(err);
          else resolve(res?.[0]);
        }
      );
    });
  }
}

export default new ArbitrageRepository();

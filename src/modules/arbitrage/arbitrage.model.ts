import { RowDataPacket } from "mysql2"

export default interface Arbitrage extends RowDataPacket {
  invest_amount: number;
  exchange_from: string;
  exchange_to: string;
  coin_rate_from: number;
  coin_rate_to: number;
  profit_percentage: number;
}

import { RowDataPacket } from "mysql2"

export default interface Arbitrage extends RowDataPacket {
  invest_amount: number;
  exchange_from: string;
  exchange_to: string;
  coin_rate_from: number;
  coin_rate_to: number;
  profit_percentage: number;
}

export default interface UserArbitrage extends RowDataPacket {
  user_id: number;
  invest_amount: number;
  profit_percentage: number;
  profit: number;
  modified_on: string;
}

export interface IArbitrageProfit extends RowDataPacket {
  id: number;
  status: number;
  hour_group: string;
  hour: string;
  profit_percentage: number;
}

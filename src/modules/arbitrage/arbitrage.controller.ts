import { Request, Response } from "express";
import arbitrageRepository from "./arbitrage.repository";
import {version, exchanges, binance, kucoin, huobi, bybit} from 'ccxt';

export default class ArbitrageController {
  async create(req: Request, res: Response) {
    const data = req.body;

    try {
      const savedArbitrage = await arbitrageRepository.save(data);

      res.status(201).send(savedArbitrage);
    } catch (err) {
      res.status(500).send({
        message: "Some error occurred while retrieving tutorials."
      });
    }
  }
  
  async exchanges(req: Request, res: Response) {
    const binance_ex = new binance();
    const kuCoin_ex = new kucoin();
    const houbi_ex = new huobi();
    const bybit_ex = new bybit();
    
    try {
      const binanceBtcValue = await (await binance_ex.fetchTicker('BTC/USDT')).close as number;
      const kuCoinBtcValue = await (await kuCoin_ex.fetchTicker('BTC/USDT')).close as number;
      const houbiBtcValue = await (await houbi_ex.fetchTicker('BTC/USDT')).close as number;
      const bybitBtcValue = await (await bybit_ex.fetchTicker('BTC/USDT')).close as number;
      const latestMatch = await arbitrageRepository.getLastMatch();

      res.status(200).send({
        binanceBtcValue,
        kuCoinBtcValue,
        houbiBtcValue,
        bybitBtcValue,
        latestMatch
      });
    } catch (err) {
      res.status(500).send({
        message: "Some error occurred while retrieving tutorials."
      });
    }
  }

  async getByDate(req: Request, res: Response) {
    const date = req.params.date;
    try {
      const allProfit = await arbitrageRepository.getArbitrageByDate(date);
      res.status(200).send(allProfit);
    } catch (err) {
      res.status(500).send({
        message: "Some error occurred while retrieving tutorials."
      });
    }
  }
}

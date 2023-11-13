import { Request, Response } from "express";
import arbitrageRepository from "./arbitrage.repository";
import walletRepository from "../wallet/wallet.repository";
import {binance, kucoin, huobi, bybit} from 'ccxt';
import UserArbitrage, { IArbitrageProfit } from "./arbitrage.model";
import Wallet from "../wallet/wallet.model";
import Arbitrage from "./arbitrage.model";
// import nodemailer from 'nodemailer';

export default class ArbitrageController {
  async create(req: Request, res: Response) {
    const data = req.body;

    try {
      const savedArbitrage = await arbitrageRepository.save(data);

      res.status(201).send(savedArbitrage);
    } catch (err) {
      res.status(500).send({
        message: "Some error occurred while saving data."
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
        latestMatch: latestMatch ? latestMatch : {}
      });
    } catch (err) {
      res.status(500).send({
        message: "Some error occurred while retrieving exchanges."
      });
    }
  }

  async getLatestEightWeeks(req: Request, res: Response) {
    const binance_ex = new binance();

    try {
      const binanceBtcHistory = arbitrageRepository.getArrayOfPrice(await binance_ex.fetchMarkOHLCV('BTC/USDT', '1w', undefined, 20), 'BTC');
      const binanceEthHistory = arbitrageRepository.getArrayOfPrice(await binance_ex.fetchMarkOHLCV('ETH/USDT', '1w', undefined, 20), 'ETH');
      const binanceXrpHistory = arbitrageRepository.getArrayOfPrice(await binance_ex.fetchMarkOHLCV('XRP/USDT', '1w', undefined, 20), 'XRP');
      const binanceDogeHistory = arbitrageRepository.getArrayOfPrice(await binance_ex.fetchMarkOHLCV('DOGE/USDT', '1w', undefined, 20), 'DOGE');

      res.status(200).send({
        binanceBtcHistory,
        binanceEthHistory,
        binanceXrpHistory,
        binanceDogeHistory
      });
    } catch (err) {
      res.status(500).send({
        message: "Some error occurred while retrieving exchanges."
      });
    }
  }

  async getByDate(req: Request, res: Response) {
    const date = req.params.date;

    try {
      const allProfit = await arbitrageRepository.getArbitrageByDate(date);
      let totalInvestment = await arbitrageRepository.getTotalInvestment(date);
      if (!totalInvestment) {
        totalInvestment = await arbitrageRepository.getLastInvestment();
      }
      res.status(200).send({allProfit, totalInvestment});
    } catch (err) {
      res.status(500).send({
        message: "Some error occurred while retrieving arbitrage data."
      });
    }
  }

  async arbitrageById(req: Request, res: Response) {
    const userId: number = parseInt(req.params.id);
    try {
      const userAllArbitrage: UserArbitrage[] = await arbitrageRepository.getArbitrageById(userId);
      res.status(200).send(userAllArbitrage);
    } catch (err) {
      res.status(500).send({
        message: "Some error occurred while retrieving personal arbitrage."
      });
    }
  }

  async arbitrageCalculate(req: Request, res: Response) {
    let todayDate = '';
    if (req.params.date) {
      todayDate = req.params.date;
    } else {
      todayDate = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    }

    try {
      const todayProfitPercentage: number = await arbitrageRepository.getTotalArbitrageProfitPercentageByDate(todayDate);
      const allUserWallet: Wallet[] = await walletRepository.retrieveAll();
      await arbitrageRepository.calcArbitrageProfit(todayProfitPercentage, allUserWallet, todayDate);

      // const userAllArbitrage: UserArbitrage[] = await arbitrageRepository.getArbitrageById(userId);
      res.status(200).send({todayDate, todayProfitPercentage, allUserWallet});
    } catch (err) {
      res.status(500).send({
        message: "Some error occurred while calculating arbitrage."
      });
    }
  }
  
  async arbitrageFilter(req: Request, res: Response) {
    let todayDate = '';
    if (req.params.date) {
      todayDate = req.params.date;
    } else {
      todayDate = new Date().toISOString().split('T')[0];
    }

    try {
      const todayProfitPercentage: IArbitrageProfit[] = await arbitrageRepository.getHourlyArbitrageByDate(todayDate);
      arbitrageRepository.getHourlyProfit(todayProfitPercentage);
      res.status(200).send({todayDate, todayProfitPercentage});
    } catch (err) {
      res.status(500).send({
        message: "Some error occurred while calculating arbitrage."
      });
    }
  }
}

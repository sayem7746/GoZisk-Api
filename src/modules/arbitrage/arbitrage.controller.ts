import { Request, Response } from "express";
import arbitrageRepository from "./arbitrage.repository";
import walletRepository from "../wallet/wallet.repository";
import { binance, kucoin, huobi, bybit, coinex, bingx, bitfinex, gateio, probit, bitmart } from 'ccxt';
import UserArbitrage, { IArbitrageProfit } from "./arbitrage.model";
import Wallet from "../wallet/wallet.model";
import Arbitrage from "./arbitrage.model";
import * as OneSignal from '@onesignal/node-onesignal';
import dotenv from 'dotenv';
import userRepository from "../users/user.repository";
import transactionRepository from "../../repositories/transaction.repository";
import { Approval } from "../../models/transaction.model";
dotenv.config();

const ONESIGNAL_APP_ID: any = process.env.ONESIGNAL_APP_ID;
const app_key_provider: any = {
  getToken(): any {
      return process.env.ONESIGNAL_REST_API_KEY;
  }
};
const configuration = OneSignal.createConfiguration({
  authMethods: {
      app_key: {
        tokenProvider: app_key_provider
      }
  }
});
const client = new OneSignal.DefaultApi(configuration);

export default class ArbitrageController {
  async notify(req: Request, res: Response) {
    const userId: number = parseInt(req.params.userId);
    try {

      const transactionDetail: any = {
        description: `500USDT Deposited to wallet`,
        type: 'deposit',
        amount: 500,
        balance: 5000,
        reference_number: 'ASDFS23423SFDFS',
        user_id: userId,
        status: 'completed',
        notes: 'Deposit money',
        transaction_fee: 0,
        approval: Approval.Approved,
        currency: 'USDT',
      };
      await transactionRepository.create(transactionDetail, true);

      res.status(200).send('Successful!');
    } catch (err) {
      res.status(500).send({
        message: "Some error occurred while saving data."
      });
    }
  }

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
    const coinex_ex = new coinex();
    const bingx_ex = new bingx();
    const bitfinex_ex = new bitfinex();
    const gateio_ex = new gateio();
    const probit_ex = new probit();
    const bitmart_ex = new bitmart();
    
    try {
      const binanceBtcValue = await (await binance_ex.fetchTicker('BTC/USDT')).close as number;
      const kuCoinBtcValue = await (await kuCoin_ex.fetchTicker('BTC/USDT')).close as number;
      const houbiBtcValue = await (await houbi_ex.fetchTicker('BTC/USDT')).close as number;
      const bybitBtcValue = await (await bybit_ex.fetchTicker('BTC/USDT')).close as number;
      const coinexBtcValue = await (await coinex_ex.fetchTicker('BTC/USDT')).close as number;
      const bingxBtcValue = await (await bingx_ex.fetchTicker('BTC/USDT')).close as number;
      const bitfinexBtcValue = await (await bitfinex_ex.fetchTicker('BTC/USDT')).close as number;
      const gateioBtcValue = await (await gateio_ex.fetchTicker('BTC/USDT')).close as number;
      const probitBtcValue = await (await probit_ex.fetchTicker('BTC/USDT')).close as number;
      const bitmartBtcValue = await (await bitmart_ex.fetchTicker('BTC/USDT')).close as number;
      const latestMatch = await arbitrageRepository.getLastMatch();

      res.status(200).send({
        binanceBtcValue,
        kuCoinBtcValue,
        houbiBtcValue,
        bybitBtcValue,
        coinexBtcValue,
        bingxBtcValue,
        bitfinexBtcValue,
        gateioBtcValue,
        probitBtcValue,
        bitmartBtcValue,
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
      let totalGoziskInvestment = await arbitrageRepository.getGoziskTotalInvestment(date);
      let totalInvestment = await arbitrageRepository.getTotalInvestment(date);
      
      if (!totalGoziskInvestment) {
        totalGoziskInvestment = await arbitrageRepository.getLastInvestment();
      }

      res.status(200).send({
        allProfit,
        totalInvestment: {
          ...totalGoziskInvestment,
          gozisk_investment: totalGoziskInvestment.gozisk_investment + totalInvestment.total
        }
      });
    } catch (err) {
      res.status(500).send({
        message: "Some error occurred while retrieving arbitrage data."
      });
    }
  }

  async arbitrageBidsByDate(req: Request, res: Response) {
    let date = '';
    if (req.params.date) {
      date = req.params.date;
    } else {
      date = new Date().toISOString().split('T')[0];
    }

    try {
      const allProfit = await arbitrageRepository.getArbitrageByDate(date);
      if (allProfit) {
        res.status(200).send(allProfit);  
      } else {
        res.status(500).send({
          message: "Some error occurred while retrieving arbitrage data."
        });
      }
      
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

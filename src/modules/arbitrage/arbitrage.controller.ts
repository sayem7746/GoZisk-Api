import { Request, Response } from "express";
import arbitrageRepository from "./arbitrage.repository";
import walletRepository from "../wallet/wallet.repository";
import {binance, kucoin, huobi, bybit} from 'ccxt';
import UserArbitrage from "./arbitrage.model";
import Wallet from "../wallet/wallet.model";
// import nodemailer from 'nodemailer';

export default class ArbitrageController {
/*
  ////////////////-------=====================mailer functions start==================-------------//////////////
  private transporter: nodemailer.Transporter;

  constructor() {

  }

  //CREATE CONNECTION FOR LOCAL
  async createLocalConnection() {
    let account = await nodemailer.createTestAccount();
    this.transporter = nodemailer.createTransport({
      host: account.smtp.host,
      port: account.smtp.port,
      secure: account.smtp.secure,
      auth: {
        user: account.user,
        pass: account.pass,
      },
    });
  }
  //CREATE A CONNECTION FOR LIVE
  async createConnection() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_TLS === 'yes' ? true : false,
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  //SEND MAIL
  async sendMail(
    requestId: string | number | string[],
    options: MailInterface
  ) {
    return await this.transporter
      .sendMail({
        from: `"chiragmehta900" ${process.env.SMTP_SENDER || options.from}`,
        to: options.to,
        cc: options.cc,
        bcc: options.bcc,
        subject: options.subject,
        text: options.text,
        html: options.html,
      })
      .then((info) => {
        Logging.info(`${requestId} - Mail sent successfully!!`);
        Logging.info(`${requestId} - [MailResponse]=${info.response} [MessageID]=${info.messageId}`);
        if (process.env.NODE_ENV === 'local') {
          Logging.info(`${requestId} - Nodemailer ethereal URL: ${nodemailer.getTestMessageUrl(
            info
          )}`);
        }
        return info;
      });
  }
  //VERIFY CONNECTION
  async verifyConnection() {
    return this.transporter.verify();
  }
  //CREATE TRANSPORTER
  getTransporter() {
    return this.transporter;
  }
*/

  ////////////////-------=====================mailer functions ends==================-------------//////////////

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

  async getByDate(req: Request, res: Response) {
    const date = req.params.date;

    try {
      const allProfit = await arbitrageRepository.getArbitrageByDate(date);
      const totalInvestment = await arbitrageRepository.getTotalInvestment(date);
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
}

import { OkPacket } from "mysql2";
import connection from "../../db";

import Arbitrage from "./arbitrage.model";
import UserArbitrage from "./arbitrage.model";
import Wallet from "../wallet/wallet.model";
import walletRepository from "../wallet/wallet.repository";
import userRepository from "../users/user.repository";
import { Approval } from "../../models/transaction.model";
import transactionRepository from "../../repositories/transaction.repository";

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
        "SELECT * FROM arbitrage WHERE profit_percentage >= 0.05 ORDER BY id DESC LIMIT 1",
        (err, res) => {
          if (err) reject(err);
          else resolve(res?.[0]);
        }
      );
    });
  }

  getTotalArbitrageProfitPercentageByDate(date: string): Promise<number> {
    return new Promise((resolve, reject) => {
      connection.query<any>(
        `SELECT SUM(profit_percentage) profit FROM arbitrage
            WHERE  profit_percentage > 0.03 AND modified_on BETWEEN '${date} 00:00:00' AND '${date} 23:59:00'`,
        (err, res) => {
          if (err) reject(err);
          else resolve(res[0].profit);
        }
      );
    });
  }

  getArbitrageByDate(date: string): Promise<Arbitrage> {
    return new Promise((resolve, reject) => {
      connection.query<any>(
        `SELECT * FROM arbitrage
            WHERE  profit_percentage > 0.03 AND modified_on BETWEEN '${date} 00:00:00' AND '${date} 23:59:00'`,
        (err, res) => {
          if (err) reject(err);
          else resolve(res);
        }
      );
    });
  }

  getTotalInvestment(date: string): Promise<Arbitrage> {
    return new Promise((resolve, reject) => {
      connection.query<any>(
        `SELECT * FROM arbitrage_setting
            WHERE  investment_date BETWEEN '${date} 00:00:00' AND '${date} 23:59:00'`,
        (err, res) => {
          if (err) reject(err);
          else resolve(res[0]);
        }
      );
    });
  }

  getLastInvestment(): Promise<Arbitrage> {
    return new Promise((resolve, reject) => {
      connection.query<any>(
        `SELECT * FROM arbitrage_setting
            ORDER BY investment_date DESC LIMIT 0,1`,
        (err, res) => {
          if (err) reject(err);
          else resolve(res[0]);
        }
      );
    });
  }
  
  getArbitrageById(userId: number): Promise<UserArbitrage[]> {
    return new Promise((resolve, reject) => {
      connection.query<any>(
        `SELECT * FROM user_arbitrage_profit
            WHERE user_id = ${userId}
              ORDER BY profit_on DESC`,
        (err, res) => {
          if (err) reject(err);
          else resolve(res);
        }
      );
    });
  }

  async calcArbitrageProfit(profit_percentage: number, userWallet: Wallet[], todayDate: string) {
    let userProfitPercent: number = 0;
    let userMaxProfitPercent: number = 0;
    let userArbitrageProfit: number = 0;
    userWallet.forEach((wallet: Wallet) => {
      userProfitPercent = userMaxProfitPercent = userArbitrageProfit = 0;
      userProfitPercent = Math.round(((profit_percentage * 70) / 100) * 10000) / 10000;
      // userMaxProfitPercent = this.getInvestMaxPercentage(wallet.invest_wallet);
      // userProfitPercent = (userProfitPercent > userMaxProfitPercent) ? userMaxProfitPercent : userProfitPercent;

      userArbitrageProfit = Math.round(((wallet.invest_wallet * userProfitPercent) / 100) * 10000) / 10000;
      this.saveUserProfit(userArbitrageProfit, wallet);
      walletRepository.updateUserArbitrageProfit(wallet.user_id, wallet.invest_wallet, userProfitPercent, userArbitrageProfit, todayDate);
      
      walletRepository.calcRoiBonus(wallet.username, wallet.referrer_id, userArbitrageProfit);
      
    });
  }

  private saveUserProfit(userArbitrageProfit: number, wallet: any): void {
    walletRepository.addProfitById(userArbitrageProfit, wallet.user_id).then((userWallet: Wallet) => {
      const referenceNumber = userRepository.generateReferenceNumber();
      const transactionDetail: any = {
        description: `Arbitrage bonus $${userArbitrageProfit} out of total investment $${wallet.invest_wallet}.`,
        type: 'ArbitrageBonus',
        amount: userArbitrageProfit,
        balance: userWallet.net_wallet,
        reference_number: referenceNumber,
        user_id: wallet.user_id,
        status: 'completed',
        notes: 'Arbitrage bonus',
        transaction_fee: 0,
        approval: Approval.Approved,
        currency: 'USDT',
      };

      transactionRepository.create(transactionDetail);
    });
  }

  private getInvestMaxPercentage(amount: number): number {
    if (amount >= 100 && amount <= 500) {
      return 0.7;
    } else if (amount >= 501 && amount <= 1000) {
      return 0.75;
    } else if (amount >= 1001 && amount <= 5000) {
      return 0.8;
    } else if (amount >= 5001 && amount <= 10000) {
      return 0.9;
    } else if (amount >= 10001 && amount <= 50000) {
      return 1;
    } else if (amount >= 50001) {
      return 1.3;
    }
    return 0;
  }
}

export default new ArbitrageRepository();

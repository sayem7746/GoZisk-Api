import { OkPacket } from "mysql2";
import connection from "../../db";

import Arbitrage, { IArbitrageProfit } from "./arbitrage.model";
import UserArbitrage from "./arbitrage.model";
import Wallet from "../wallet/wallet.model";
import walletRepository from "../wallet/wallet.repository";
import userRepository from "../users/user.repository";
import { Approval } from "../../models/transaction.model";
import transactionRepository from "../../repositories/transaction.repository";
import { binance, kucoin, huobi, bybit, coinex, bingx, bitfinex, gateio, probit, bitmart } from 'ccxt';
import moment from "moment";

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
        "SELECT * FROM arbitrage WHERE status = 1 ORDER BY id DESC LIMIT 1",
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
            WHERE  status = 1 AND modified_on BETWEEN '${date} 00:00:00' AND '${date} 23:59:00'`,
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
            WHERE  profit_percentage > 0.03 AND status = 1 AND modified_on BETWEEN '${date} 00:00:00' AND '${date} 23:59:00'
            ORDER BY id DESC`,
        (err, res) => {
          if (err) reject(err);
          else resolve(res);
        }
      );
    });
  }

  getGoziskTotalInvestment(date: string): Promise<Arbitrage> {
    return new Promise((resolve, reject) => {
      connection.query<any>(
        `SELECT * FROM arbitrage_setting
            WHERE investment_date BETWEEN '${date} 00:00:00' AND '${date} 23:59:00'
            ORDER BY id DESC`,
        (err, res) => {
          if (err) reject(err);
          else resolve(res[0]);
        }
      );
    });
  }
  
  getTotalInvestment(date: string): Promise<Arbitrage> {
    return new Promise((resolve, reject) => {
      connection.query<any>(
        `SELECT SUM(invest_wallet) total FROM wallet`,
        (err, res) => {
          if (err) reject(err);
          else resolve(res[0]);
        }
      );
    });
  }

  getLastInvestment(): Promise<any> {
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

  updateLatestInvestment(latestInvestment: number): Promise<any> {
    return new Promise((resolve, reject) => {
      connection.query<OkPacket>(
        `INSERT INTO arbitrage_setting
          (gozisk_investment)
          VALUES(${latestInvestment})`,
        (err, res) => {
          if (err) reject(err);
          else
            resolve(true)
        }
      );
    });
  }

  saveExchangeRate(exchangeList: any) {
    exchangeList.forEach(async (item: any) => {
      let isExchangeExits = await this.isExistsExchange(item.name);
      if (!isExchangeExits) {
        this.saveRate(item.name, item.value);
      } else {
        this.updateRate(item.name, item.value);
      }
    });
  }

  updateRate(name: string, value: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
        connection.query<OkPacket>(
          `UPDATE exchange_rate
              SET btc_value = ${value}
              WHERE exchange_name = '${name}'`,
          (err, res) => {
              if (err) reject(err);
              else resolve(true);
              
          }
      );
    });
}

  isExistsExchange(name: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      connection.query<any>(
        `SELECT * FROM exchange_rate
            WHERE exchange_name = '${name}'`,
        (err, res) => {
          if (err) reject(err);
          else resolve(res.length > 0);
        }
      );
    });
  }

  fetchExchangeRates(): Promise<any> {
    return new Promise((resolve, reject) => {
      connection.query<any>(
        `SELECT exchange_name name, btc_value value FROM exchange_rate`,
        (err, res) => {
          if (err) reject(err);
          else resolve(res);
        }
      );
    });
  }

  saveRate(name: string, value: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
      connection.query<OkPacket>(
        `INSERT INTO exchange_rate
        (exchange_name, btc_value)
        VALUES(?, ?)`,
        [
          name,
          value
        ],
        (err, res) => {
          if (err) reject(err);
          else
            resolve(true)
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
  
  getHourlyArbitrageByDate(date: string): Promise<IArbitrageProfit[]> {
    return new Promise((resolve, reject) => {
      connection.query<IArbitrageProfit[]>(
        `SELECT a.id, a.status,
          DATE_FORMAT(a.modified_on , '%Y-%m-%d %H:00:00') AS hour_group, a.profit_percentage,
          DATE_FORMAT(a.modified_on , '%H') AS hour
          FROM  arbitrage a
            WHERE modified_on LIKE "${date}%"
              GROUP BY hour_group, profit_percentage, id
                ORDER BY hour_group DESC;`,
        (err, res) => {
          if (err) reject(err);
          else resolve(res);
        }
      );
    });
  }

  async calcArbitrageProfit(profit_percentage: number, userWallet: Wallet[], todayDate: string) {
    let userProfitPercent: number = 0;
    let actualUserProfitPercent: number = 0;
    let note: string = '';
    let companyShare: string = '';
    let userMaxProfitPercent: number = 0;
    let userArbitrageProfit: number = 0;
    userWallet.forEach((wallet: Wallet) => {
      actualUserProfitPercent = userProfitPercent = userMaxProfitPercent = userArbitrageProfit = 0;
      if (wallet.invest_wallet >= 10) {
        [userProfitPercent, actualUserProfitPercent, note, companyShare] = this.getUserProfitPercent(profit_percentage, wallet.invest_wallet);
        
        userArbitrageProfit = Math.round(((wallet.invest_wallet * userProfitPercent) / 100) * 10000) / 10000;
        this.saveUserProfit(userArbitrageProfit, actualUserProfitPercent, wallet, todayDate, note, companyShare);
        walletRepository.updateUserArbitrageProfit(wallet.user_id, wallet.invest_wallet, userProfitPercent, userArbitrageProfit, todayDate);
        
        walletRepository.calcRoiBonus(wallet.username as string, wallet.referrer_id, userArbitrageProfit, todayDate);
      }
    });
  }

  private getUserProfitPercent(profit: number, amount: number): any {
    profit = Math.round(profit * 10000) / 10000;
    let originalUserProfit = Math.round(((amount * profit) / 100) * 10000) / 10000;
    let companyProfit: number = 0;
    if (amount >= 10 && amount <= 99) {
      companyProfit = Math.round(((originalUserProfit * 60) / 100) * 10000) / 10000;
      return [Math.round(((profit * 40) / 100) * 10000) / 10000, 40, `Today Arbitrage Profit is $${originalUserProfit} (${profit}%), out of your ${amount} investment.`, `$${companyProfit} (60%)`];
    } else if (amount >= 100 && amount <= 499) {
      companyProfit = Math.round(((originalUserProfit * 55) / 100) * 10000) / 10000;
      return [Math.round(((profit * 45) / 100) * 10000) / 10000, 45, `Today Arbitrage Profit is $${originalUserProfit} (${profit}%), out of your ${amount} investment.`, `$${companyProfit} (55%)`];
    } else if (amount >= 500 && amount <= 999) {
      companyProfit = Math.round(((originalUserProfit * 50) / 100) * 10000) / 10000;
      return [Math.round(((profit * 50) / 100) * 10000) / 10000, 50, `Today Arbitrage Profit is $${originalUserProfit} (${profit}%), out of your ${amount} investment.`, `$${companyProfit} (50%)`];
    } else if (amount >= 1000 && amount <= 4999) {
      companyProfit = Math.round(((originalUserProfit * 45) / 100) * 10000) / 10000;
      return [Math.round(((profit * 55) / 100) * 10000) / 10000, 55, `Today Arbitrage Profit is $${originalUserProfit} (${profit}%), out of your ${amount} investment.`, `$${companyProfit} (45%)`];
    } else if (amount >= 5000 && amount <= 9999) {
      companyProfit = Math.round(((originalUserProfit * 40) / 100) * 10000) / 10000;
      return [Math.round(((profit * 60) / 100) * 10000) / 10000, 60, `Today Arbitrage Profit is $${originalUserProfit} (${profit}%), out of your ${amount} investment.`, `$${companyProfit} (40%)`];
    } else if (amount >= 10000 && amount <= 49999) {
      companyProfit = Math.round(((originalUserProfit * 35) / 100) * 10000) / 10000;
      return [Math.round(((profit * 65) / 100) * 10000) / 10000, 65, `Today Arbitrage Profit is $${originalUserProfit} (${profit}%), out of your ${amount} investment.`, `$${companyProfit} (35%)`];
    } else if (amount >= 50000) {
      companyProfit = Math.round(((originalUserProfit * 30) / 100) * 10000) / 10000;
      return [Math.round(((profit * 70) / 100) * 10000) / 10000, 70, `Today Arbitrage Profit is $${originalUserProfit} (${profit}%), out of your ${amount} investment.`, `$${companyProfit} (30%)`];
    }
    
    return [0, ``];
  }

  private saveUserProfit(userArbitrageProfit: number, profitPercent: number, wallet: any, date: string = Date(), note: string, companyShare: string): void {
    walletRepository.addProfitById(userArbitrageProfit, wallet.user_id).then((userWallet: Wallet) => {
      const referenceNumber = userRepository.generateReferenceNumber();
      const transactionDetail: any = {
        description: `Arbitrage profit share for you is $${userArbitrageProfit} (${profitPercent}%) and company is ${companyShare}`,
        type: 'ArbitrageBonus',
        amount: userArbitrageProfit,
        balance: userWallet.net_wallet,
        reference_number: referenceNumber,
        user_id: wallet.user_id,
        status: 'completed',
        notes: note,
        transaction_fee: 0,
        approval: Approval.Approved,
        currency: 'USDT',
        date: date
      };

      transactionRepository.create(transactionDetail, true);
    });
  }

  private getInvestMaxPercentage(amount: number): number {
    if (amount >= 10 && amount <= 500) {
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

  getArrayOfPrice(priceList: any[], coin: string): any[] {
    const priceArray: number[] = [];
    priceList.forEach(p => {
      let toDate = moment(p[0]).format('YYYY-MM-DD h:m:s');
      priceArray.push(Math.trunc(p[4] * 10000) / 10000);
    })
    return priceArray;
  }

 getHourlyProfit(todayProfitList: IArbitrageProfit[]) {
    let sortedHourlyProfit: IArbitrageProfit[] = [];
    let totalHourlyProfit: number = 0;
    
    for (let i = 0; i < 24; i++) {
      sortedHourlyProfit = todayProfitList.filter(item => parseInt(item.hour) === i)
        .sort((a,b) => a.profit_percentage - b.profit_percentage);
      totalHourlyProfit = 0;
      for (const p of sortedHourlyProfit) {
        totalHourlyProfit += p.profit_percentage;
        if (totalHourlyProfit < 0.08) {
          if (p.status === 0) {
            this.updateActiveProfit(p.id);
          }
        } else {
          break;
        }
      }
    }
  }

  updateActiveProfit(profitId: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
        connection.query<OkPacket>(
          `UPDATE arbitrage
              SET status = 1
              WHERE id=${profitId}`,
          (err, res) => {
              if (err) reject(err);
              else resolve(true);
              
          }
      );
    });
}


  groupByHour(array: any[]) {
    return array.reduce((acc, obj) => {
      const hour = obj.hour_group.getHours();
      const key = `${obj.timestamp.toISOString().slice(0, 13)}:00:00`; // Format: YYYY-MM-DDTHH:00:00
      acc[key] = acc[key] || [];
      acc[key].push(obj);
      return acc;
    }, {});
  }

  async getExchangesRate(investmentValue: number): Promise<any> {
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
    
    return new Promise(async (resolve, reject) => {
      let start = Date.now();

      const exchangeList: any[] = [
        {
          name: 'Binance',
          value: await this.getValue( 'Binance', binance_ex.fetchTicker('BTC/USDT'))
        },
        {
          name: 'KuCoin',
          value: await this.getValue( 'KuCoin', kuCoin_ex.fetchTicker('BTC/USDT'))
        },
        {
          name: 'Houbi',
          value: await this.getValue( 'Houbi', houbi_ex.fetchTicker('BTC/USDT'))
        },
        {
          name: 'ByBit',
          value: await this.getValue( 'ByBit', bybit_ex.fetchTicker('BTC/USDT'))
        },
        {
          name: 'CoinEx',
          value: await this.getValue( 'CoinEx', coinex_ex.fetchTicker('BTC/USDT'))
        },
        {
          name: 'BingX',
          value: await this.getValue( 'BingX', bingx_ex.fetchTicker('BTC/USDT'))
        },
        // {
        //   name: 'BitFinex',
        //   value: await this.getValue( 'BitFinex', bitfinex_ex.fetchTicker('BTC/USDT'))
        // },
        // {
        //   name: 'GateIO',
        //   value: await this.getValue( 'GateIO', gateio_ex.fetchTicker('BTC/USDT'))
        // },
        {
          name: 'ProBit',
          value: await this.getValue( 'ProBit', probit_ex.fetchTicker('BTC/USDT'))
        },
        {
          name: 'BitMart',
          value: await this.getValue( 'BitMart', bitmart_ex.fetchTicker('BTC/USDT'))
        },
      ];
      let arbitrageData = this.calculateProfit(exchangeList, investmentValue);
      resolve({exchangeList, data: arbitrageData});
    });
  }

  async getValue(exName: string, func: any): Promise<number> {
    let exValue = await (await func).close as number

    let isExchangeExits = await this.isExistsExchange(exName);
      if (!isExchangeExits) {
        this.saveRate(exName, exValue);
      } else {
        this.updateRate(exName, exValue);
      }
    return exValue;
  }

  calculateProfit(exchanges: any[], investmentValue: number): any {
    let profit: number = 0;
    let matchValue: number = 0;
    let arbitrageData: any;
    for(let i = 0; i < exchanges.length - 2; i++) {
      for(let j = i + 1; j < exchanges.length - 1; j++) {
        profit = this.getProfit(exchanges[i].value, exchanges[j].value)
        if (Math.abs(profit) > matchValue) {
          matchValue = Math.abs(profit);
          if (profit > 0) {
            arbitrageData = {
              'invest_amount': investmentValue,
              'exchange_from': exchanges[i].name,
              'exchange_to': exchanges[j].name,
              'coin_rate_from': exchanges[i].value,
              'coin_rate_to': exchanges[j].value,
              'profit_percentage': Math.abs(profit)
            }
          } else if (profit < 0) {
            arbitrageData = {
              'invest_amount': investmentValue,
              'exchange_from': exchanges[j].name,
              'exchange_to': exchanges[i].name,
              'coin_rate_from': exchanges[j].value,
              'coin_rate_to': exchanges[i].value,
              'profit_percentage': Math.abs(profit)
            }
          }
        }
      }
    }

    return arbitrageData;
  }

  getProfit(val1: number, val2: number): number {
    return Math.round((((val1-val2)/val1) * 100) * 10000) / 10000;
  }
}

interface HourData {
  [hour: number]: any[]; // Define the type for each hour key
}

export default new ArbitrageRepository();

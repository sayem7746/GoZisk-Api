import { OkPacket } from "mysql2";
import axios from 'axios';
import connection from "../../db";
import * as moment from 'moment'

import Wallet, {ICryptoTransaction, IDepositAddress, IPairing, IWalletAddress, IWithdraw, IWithdrawGatewayCallback} from "./wallet.model";
import User from "../users/user.model";
import { Approval }from "../../models/transaction.model";
import userRepository from "../users/user.repository";
import transactionRepository from "../../repositories/transaction.repository";

interface IWalletRepository {
    create(userId: number): Promise<Wallet>;
    retrieveById(userId: number): Promise<Wallet | undefined>;
    transfer(transferAmount: number, payeeWallet: Wallet, transferWallet: Wallet): Promise<number>;
}

class WalletRepository implements IWalletRepository {

    retrieveById(userId: number): Promise<Wallet> {
        return new Promise((resolve, reject) => {
            connection.query<Wallet[]>(
                `SELECT w.*, u.username FROM wallet w
                LEFT JOIN users u ON u.id = w.user_id  
                    WHERE w.user_id = ?`,
                [userId],
                (err, res) => {
                    if (err) reject(err);
                    else resolve(res?.[0]);
                }
            );
        });
    }

    retrieveTransactionById(cryptoTxId: string): Promise<ICryptoTransaction> {
        return new Promise((resolve, reject) => {
            connection.query<ICryptoTransaction[]>(
                `SELECT ct.*, u.id user_id
                    FROM crypto_transaction ct 
                        LEFT JOIN users u ON LOWER(u.username) = ct.username
                    WHERE txid = ?`,
                [cryptoTxId],
                (err, res) => {
                    if (err) reject(err);
                    else resolve(res?.[0]);
                }
            );
        });
    }
    
    retrieveAll(): Promise<Wallet[]> {
        return new Promise((resolve, reject) => {
            connection.query<Wallet[]>(
                `SELECT w.*, u.referrer_id, u.username  FROM wallet w
                    LEFT JOIN users u on u.id = w.user_id`,
                (err, res) => {
                    if (err) reject(err);
                    else resolve(res);
                }
            );
        });
    }

    retrieveAllUserPair(): Promise<Wallet[]> {
        return new Promise((resolve, reject) => {
            connection.query<Wallet[]>(
                `SELECT w.*, u.referrer_id, u.username, p.id as pairing_id  FROM wallet w
                    LEFT JOIN users u on u.id = w.user_id
                    LEFT JOIN pairing p on p.user_id = w.user_id`,
                (err, res) => {
                    if (err) reject(err);
                    else resolve(res);
                }
            );
        });
    }

    getDepositAddress(userId: number): Promise<any> {
        return new Promise((resolve, reject) => {
            connection.query<any>(
                `SELECT u.username user_name, da.*
                    FROM users u
                    LEFT JOIN deposit_address da ON da.user_id = u.id
                        WHERE u.id = ${userId}`,
                (err, res) => {
                    if (err) reject(err);
                    else resolve(res[0]);
                }
            );
        });
    }

    addDepositAddress(userId: number, data: IDepositAddress): Promise<string> {
        return new Promise((resolve, reject) => {
            connection.query<any>(
                `INSERT INTO deposit_address
                    (user_id, wallet_address, status, username)
                    VALUES(${userId}, '${data.address}', 'active', '${data.username}')`,
                (err, res) => {
                    if (err) reject(err);
                    else resolve('Success');
                }
            );
        });
    }

    getTransaction(username: string, txid: string): Promise<ICryptoTransaction> {
        return new Promise((resolve, reject) => {
            connection.query<ICryptoTransaction[]>(
                `SELECT *
                    FROM crypto_transaction
                        WHERE username = '${username}' && txid = '${txid}'`,
                (err, res) => {
                    if (err) reject(err);
                    else resolve(res[0]);
                }
            );
        });
    }

    getWithdrawTransaction(wdrawid: string): Promise<IWithdraw> {
        return new Promise((resolve, reject) => {
            connection.query<IWithdraw[]>(
                `SELECT * FROM withdraw WHERE reference = '${wdrawid}'`,
                (err, res) => {
                    if (err) reject(err);
                    else resolve(res[0]);
                }
            );
        });
    }

    saveTransaction(data: ICryptoTransaction): Promise<ICryptoTransaction> {
        return new Promise((resolve, reject) => {
            connection.query<ICryptoTransaction[]>(
                `INSERT INTO crypto_transaction
                    (username, txid, txdate, amount, send_to, send_from, type)
                        VALUES('${data.username}', '${data.txid}', '${data.txdate}', ${data.amount}, '${data.send_to}', '${data.send_from}', 'deposit')`,
                (err, res) => {
                    if (err) reject(err);
                    else
                        this.retrieveTransactionById(data.txid)
                            .then((transaction) => resolve(transaction!))
                            .catch(reject);
                }
            );
        });
    }

    retrieveAllPairing(): Promise<IPairing[]> {
        return new Promise((resolve, reject) => {
            connection.query<IPairing[]>(
                `SELECT p.*, u.referrer_id, w.invest_wallet personal_invest
                    FROM pairing p
                        LEFT JOIN users u on p.user_id = u.id
                        LEFT JOIN wallet w on w.user_id = p.user_id`,
                (err, res: IPairing[]) => {
                    if (err) reject(err);
                    else resolve(res);
                }
            );
        });
    }

    create(userId: number): Promise<Wallet> {
        return new Promise((resolve, reject) => {
            connection.query<OkPacket>(
                "INSERT INTO wallet (user_id, modified) VALUES(?, now())",
                [userId],
                (err, res) => {
                    if (err) reject(err.message);
                    else
                        this.retrieveById(userId)
                            .then((wallet) => resolve(wallet!))
                            .catch(reject);
                }
            );
        });
    }

    createPairEntry(userId: number, amount: number): Promise<any> {
        return new Promise((resolve, reject) => {
            connection.query<any[]>(
                `INSERT INTO pairing
                (invest, user_id)
                VALUES(${amount}, ${userId})`,
                (err, res) => {
                if (err) reject(err);
                else resolve(res?.[0]);
                }
            );
        });
    }

    transfer(transferAmount: number, payeeWallet: Wallet, transferWallet: Wallet): Promise<number> {
        return new Promise((resolve, reject) => {
            connection.query<OkPacket>(
                `UPDATE wallet
                    SET net_wallet=?
                    WHERE user_id=?`,
                [payeeWallet.net_wallet - transferAmount, payeeWallet.user_id],
                (err, res) => {
                    if (err) reject(err.message);
                    else resolve(res.affectedRows);
                }
            );
        });
    }

    update(amount: number, wallet: Wallet): Promise<number> {
        return new Promise((resolve, reject) => {
            connection.query<OkPacket>(
                `UPDATE wallet
                    SET net_wallet=?
                    WHERE user_id=?`,
                [amount, wallet.user_id],
                (err, res) => {
                    if (err) reject(err);
                    else resolve(res.affectedRows);
                }
            );
        });
    }

    updateByColumn(column: string, column_value: any, user_id: number): Promise<number> {
        return new Promise((resolve, reject) => {
            connection.query<OkPacket>(
                `UPDATE wallet
                    SET ${column}=?
                    WHERE user_id=?`,
                [column_value, user_id],
                (err, res) => {
                    if (err) reject(err);
                    else resolve(res.affectedRows);
                }
            );
        });
    }
    
    apendByColumn(column: string, column_value: any, user_id: number): Promise<Wallet> {
        return new Promise((resolve, reject) => {
            connection.query<OkPacket>(
                `UPDATE wallet
                    SET ${column}= ${column} + ?
                    WHERE user_id=?`,
                [column_value, user_id],
                (err, res) => {
                    if (err) reject(err);
                    else this.retrieveById(user_id)
                        .then((wallet: Wallet) => resolve(wallet))
                        .catch(reject);
                }
            );
        });
    }

    updateUserArbitrageProfit(user_id: number, invest_amount: number, profit_percentage: number, profit: number, profit_on: string): Promise<number> {
        return new Promise((resolve, reject) => {
            connection.query<OkPacket>(
                `INSERT INTO user_arbitrage_profit
                    (user_id, invest_amount, profit_percentage, profit, profit_on)
                        VALUES(${user_id}, ${invest_amount}, ${profit_percentage}, ${profit}, '${profit_on} 00:00:00.000')`,
                (err, res) => {
                    if (err) reject(err);
                    else resolve(res.affectedRows);
                }
            );
        });
    }

    addProfitById(profit: number, user_id: number): Promise<Wallet> {
        return new Promise((resolve, reject) => {
            connection.query<OkPacket>(
                `UPDATE wallet
                    SET net_wallet = net_wallet + ROUND(${profit}, 4), roi_wallet = roi_wallet + ROUND(${profit}, 4)
                    WHERE user_id=${user_id}`,
                (err, res) => {
                    if (err) reject(err);
                    else this.retrieveById(user_id)
                        .then((wallet: Wallet) => resolve(wallet))
                        .catch(reject);
                    
                }
            );
        });
    }

    // RECURSIVELY FIND BELLOW INVEST AMOUNT
    getTotalInvest(user_id: number = 1, allPairs: IPairing[]): number {
        let bellowPairs = allPairs.filter(p => p.referrer_id === user_id);
        let total = 0;
        let curUserTotal = 0;
        let pairingLegs: any[] = [];
        
        if(bellowPairs.length < 1){
            return 0;
        }

        bellowPairs.map(p => {
            curUserTotal = 0;
            curUserTotal = (p.invest + this.getTotalInvest(p.user_id, allPairs));
            total += curUserTotal;
            pairingLegs.push({
                user_id: p.user_id,
                invest: p.invest,
                totalBellowInvest: (curUserTotal + p.carry_forward),
                personal_invest: p.personal_invest
            });
        });

        this.pairUser(user_id, pairingLegs);
        return total;
    }

    // PAIR USERS INVESTMENT ACCORDING TO BELLOW INVEST
    pairUser(user_id: number, pairingLegs: any[]) {
        if(pairingLegs.length > 1) {
            pairingLegs.sort((a,b) => a.totalBellowInvest - b.totalBellowInvest);
            this.calculatePairing(user_id, pairingLegs);
        } else if (pairingLegs.length === 1) {
            this.updateUserPairStatus(pairingLegs[0]);
        }
    }

    // CALCULATE PAIRING BONUS
    async calculatePairing(user_id: number, userPairLegs: any): Promise<void> {
        let totalPairValue: number = 0;
        let totalLegs: number = userPairLegs.length;
        let totalSponsorValue: number = 0;
        let remainCarryForward = 0;
        
        userPairLegs.forEach((leg: any, i: number) => {
            if ((i+1) !== totalLegs) {
                totalPairValue += leg.totalBellowInvest;
                totalSponsorValue += leg.personal_invest;
                this.updateUserPairStatus({...leg, totalBellowInvest: 0});
            } else {
                remainCarryForward = leg.totalBellowInvest - totalPairValue;
                totalSponsorValue += leg.personal_invest;
                this.updateUserPairStatus({...leg, totalBellowInvest: remainCarryForward < 0 ? 0 : remainCarryForward});
            }
        });
        
        // capping pairing value by sponsor/introducer investment
        let maximumPairProfit = totalSponsorValue * 2;
        let totalPairedProfit = totalPairValue * 0.05;
        let profit = totalPairedProfit > maximumPairProfit ? maximumPairProfit : totalPairedProfit;
        
        // maximum pairing profit
        profit = profit > 5000 ? 5000 : profit;

        const userWallet: Wallet = await this.retrieveById(user_id);
        if (profit > 0 && userWallet.invest_wallet >= 10) {
            const updatedUserWallet: Wallet = await this.addProfitById(profit, user_id);

            const referenceNumber = userRepository.generateReferenceNumber();
            const transactionDetail: any = {
                description: `Pairing bonus ${profit}. Total paired legs ${userPairLegs.length}. Total paired value ${totalPairValue}`,
                type: 'PairingBonus',
                amount: profit,
                balance: updatedUserWallet.net_wallet,
                reference_number: referenceNumber,
                user_id: user_id,
                status: 'completed',
                notes: 'Pairing Bonus',
                transaction_fee: 0,
                approval: Approval.Approved,
                currency: 'USDT',
            };

            await transactionRepository.create(transactionDetail, true);
        }
    }

    // UPDATE PAIR STATUS TO DATABASE.
    updateUserPairStatus(userPairDetail: any): Promise<boolean> {
        return new Promise((resolve, reject) => {
            connection.query<OkPacket>(
                `UPDATE gozisk.pairing
                    SET invest=0, carry_forward=?, modified_on=CURRENT_TIMESTAMP
                WHERE user_id=?;`,
                [userPairDetail.totalBellowInvest, userPairDetail.user_id],
                (err, res) => {
                    if (err) reject(err);
                    else resolve(true);
                }
            );
        });
    }

    async calcRoiBonus(bonusFromUsername: string, userId: number, bonusValue: number, date: string = Date(), level: number = 1): Promise<boolean> {
        let userWallet: Wallet = await this.retrieveById(userId);
        const user: User = await userRepository.retrieveById(userId);
        let note: string = '';

        if (user !== undefined && level <= 10) {
            if (userWallet.invest_wallet >= 10) {
                let profit: number = 0;
                switch(level) {
                    case 1: 
                        profit = parseFloat((bonusValue * 0.1).toFixed(4));
                        note = `10% of ${bonusFromUsername}'s total profit sharing $${bonusValue}`
                        break;
                    case 2: 
                        profit = parseFloat((bonusValue * 0.05).toFixed(4));
                        note = `5% of ${bonusFromUsername}'s total profit sharing $${bonusValue}`
                        break;
                    case 3: 
                        profit = parseFloat((bonusValue * 0.025).toFixed(4));
                        note = `2.5% of ${bonusFromUsername}'s total profit sharing $${bonusValue}`
                        break;
                    default:
                        profit = parseFloat((bonusValue * 0.01).toFixed(4));
                        note = `1% of ${bonusFromUsername}'s total profit sharing $${bonusValue}`
                        break;
                }
                
                const updatedUserWallet: Wallet = await this.addProfitById(profit, user.id);

                const referenceNumber = userRepository.generateReferenceNumber();
                const transactionDetail: any = {
                    description: `Arbitrage Level ${level} bonus ${profit}$ from ${bonusFromUsername}.`,
                    type: 'ArbitrageRoiBonus',
                    amount: profit,
                    balance: updatedUserWallet.net_wallet,
                    reference_number: referenceNumber,
                    user_id: user.id,
                    status: 'completed',
                    notes: note,
                    transaction_fee: 0,
                    approval: Approval.Approved,
                    currency: 'USDT',
                    date: date
                };

                await transactionRepository.create(transactionDetail, true);
            }

            this.calcRoiBonus(bonusFromUsername, user.referrer_id, bonusValue, date, level + 1);
        }
        
        return true;
    }


    // Wallet address CRUD
    addAddress(data: IWalletAddress): Promise<IWalletAddress[]> {
        return new Promise((resolve, reject) => {
            connection.query<OkPacket>(
                `INSERT INTO wallet_address 
                    (user_id, address, network_name, network_type, status, note) 
                    VALUES(?, ?, ?, ?, ?, ?)`,
                [
                    data.user_id,
                    data.address,
                    data.network_name,
                    data.network_type,
                    data.status,
                    data.note,
                ],
                (err, res) => {
                    if (err) reject(err.message);
                    else
                        this.retrieveWalletAddressById(data.user_id)
                            .then((addresses: IWalletAddress[]) => resolve(addresses!))
                            .catch(reject);
                }
            );
        });
    }

    updateAddress(data: IWalletAddress): Promise<IWalletAddress[]> {
        return new Promise((resolve, reject) => {
            connection.query<OkPacket>(
                `UPDATE wallet_address
                    SET status= ?
                    WHERE id= ?`,
                [
                    data.status,
                    data.id
                ],
                (err, res) => {
                    if (err) reject(err.message);
                    else
                        this.retrieveWalletAddressById(data.user_id)
                            .then((addresses: IWalletAddress[]) => resolve(addresses!))
                            .catch(reject);
                }
            );
        });
    }

    retrieveWalletAddressById(userId: number): Promise<IWalletAddress[]> {
        return new Promise((resolve, reject) => {
            connection.query<IWalletAddress[]>(
                "SELECT * FROM wallet_address WHERE user_id = ? AND deleted = 0",
                [userId],
                (err, res) => {
                    if (err) reject(err);
                    else resolve(res);
                }
            );
        });
    }

    retrieveWalletActiveAddressById(userId: number): Promise<IWalletAddress[]> {
        return new Promise((resolve, reject) => {
            connection.query<IWalletAddress[]>(
                "SELECT * FROM wallet_address WHERE user_id = ? AND status = 'active' AND deleted = 0",
                [userId],
                (err, res) => {
                    if (err) reject(err);
                    else resolve(res);
                }
            );
        });
    }

    retrieveByAddress(userId: number, address: string): Promise<IWalletAddress[]> {
        return new Promise((resolve, reject) => {
            connection.query<IWalletAddress[]>(
                "SELECT * FROM wallet_address WHERE user_id = ? AND address = ? AND deleted = 0",
                [userId, address],
                (err, res) => {
                    if (err) reject(err);
                    else resolve(res);
                }
            );
        });
    }

    deleteAddress(userId: number, address: string): Promise<number> {
        return new Promise((resolve, reject) => {
            connection.query<OkPacket>(
                `DELETE FROM wallet_address
                    WHERE user_id = ? AND address = ?`,
                [userId, address],
                (err, res) => {
                    if (err) reject(err);
                    else resolve(res.affectedRows);
                }
            );
        });
    }

    // Withdraw CRUD
    addWithdraw(data: IWithdraw): Promise<IWithdraw[]> {
        return new Promise((resolve, reject) => {
            connection.query<OkPacket>(
                `INSERT INTO withdraw
                    (user_id, withdraw_amount, address, network, reference)
                    VALUES(?, ?, ?, ?, ?)`,
                [
                    data.user_id,
                    data.withdraw_amount,
                    data.address,
                    data.network,
                    data.reference
                ],
                (err, res) => {
                    if (err) reject(err.message);
                    else
                        this.retrieveWithdrawalByUserId(data.user_id)
                            .then((withdrawList: IWithdraw[]) => resolve(withdrawList!))
                            .catch(reject);
                }
            );
        });
    }

    retrieveWithdrawalByUserId(userId: number): Promise<IWithdraw[]> {
        return new Promise((resolve, reject) => {
            connection.query<IWithdraw[]>(
                "SELECT * FROM withdraw WHERE user_id = ? ORDER BY id DESC",
                [userId],
                (err, res) => {
                    if (err) reject(err);
                    else resolve(res);
                }
            );
        });
    }

    retrieveWithdrawalById(withdrawalId: number): Promise<IWithdraw> {
        return new Promise((resolve, reject) => {
            connection.query<IWithdraw[]>(
                "SELECT * FROM withdraw WHERE id = ?",
                [withdrawalId],
                (err, res) => {
                    if (err) reject(err);
                    else resolve(res[0]);
                }
            );
        });
    }
    
    retrieveWithdrawal(): Promise<IWithdraw[]> {
        return new Promise((resolve, reject) => {
            connection.query<IWithdraw[]>(
                `SELECT w.*, u.full_name, w2.net_wallet
                    FROM withdraw w
                        LEFT JOIN users u on u.id = w.user_id
                        LEFT JOIN wallet w2 on w2.user_id  = w.user_id 
                            WHERE status = 'pending'`,
                (err, res) => {
                    if (err) reject(err);
                    else resolve(res);
                }
            );
        });
    }
    
    updateWithdraw(id: number, column_fields: string, column_value: number | string): Promise<number> {
        return new Promise((resolve, reject) => {
            connection.query<OkPacket>(
                `UPDATE withdraw
                    SET ${column_fields}=${column_value}
                    WHERE id=${id}`,
                (err, res) => {
                    if (err) reject(err.message);
                    else resolve(res.affectedRows);
                }
            );
        });
    }

    // report all user wallet
    retrieveAllWallet(view: string): Promise<any[]> {
        return new Promise((resolve, reject) => {
            connection.query<any[]>(
                `SELECT * FROM ${view}`,
                (err, res) => {
                    if (err) reject(err);
                    else resolve(res);
                }
            );
        });
    }

    retrieveWalletByParams(paramname: string, paramvalue: string): Promise<any[]> {
        return new Promise((resolve, reject) => {
            connection.query<any[]>(
                `SELECT * FROM view_user_wallet 
                    WHERE ${paramname} = '${paramvalue}'`,
                (err, res) => {
                    if (err) reject(err);
                    else resolve(res);
                }
            );
        });
    }


  async fetchGroupSale(userId: number, dateForm: string, dateTo: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      connection.query<any[]>(
        `CALL getTotalGroupSaleDetail(${userId}, '${dateForm}', '${dateTo}')`,
        (err, res) => {
          if (err) reject(err);
          else resolve(res[0]);
        }
      )
    });
  }
}

export default new WalletRepository();
function saveTransaction(data: any, ICryptoTransaction: any) {
    throw new Error("Function not implemented.");
}


import { OkPacket } from "mysql2";
import axios from 'axios';
import connection from "../../db";
import * as moment from 'moment'

import Wallet, {ICryptoTransaction, IDepositAddress, IPairing} from "./wallet.model";
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
                "SELECT * FROM wallet WHERE user_id = ?",
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
                        LEFT JOIN users u ON u.username = ct.username
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
                `SELECT p.*, u.referrer_id
                    FROM pairing p
                        LEFT JOIN users u on p.user_id = u.id`,
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
                totalBellowInvest: (curUserTotal + p.carry_forward)
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
    async calculatePairing(user_id: number,userPairLegs: any): Promise<void> {
        let totalPairValue: number = 0;
        let totalLegs: number = userPairLegs.length;
        let remainCarryForward = 0;
        userPairLegs.forEach((leg: any, i: number) => {
            if ((i+1) !== totalLegs) {
                totalPairValue += leg.totalBellowInvest;
                this.updateUserPairStatus({...leg, totalBellowInvest: 0});
            } else {
                remainCarryForward = leg.totalBellowInvest - totalPairValue;
                this.updateUserPairStatus({...leg, totalBellowInvest: remainCarryForward < 0 ? 0 : remainCarryForward});
            }
        });

        let profit = totalPairValue * 0.05;
        const userWallet: Wallet = await this.retrieveById(user_id);
        if (profit > 0 && userWallet.invest_wallet > 100) {
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

            await transactionRepository.create(transactionDetail);
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

    async calcRoiBonus(bonusFromUsername: string, userId: number, bonusValue: number, level: number = 1): Promise<boolean> {
        let userWallet: Wallet = await this.retrieveById(userId);
        const user: User = await userRepository.retrieveById(userId);

        if (user !== undefined && level <= 10) {
            if (userWallet.invest_wallet > 100) {
                let profit = 0;
                switch(level) {
                    case 1: 
                        profit = bonusValue * 0.01;
                        break;
                    case 2: 
                        profit = bonusValue * 0.005;
                        break;
                    case 3: 
                        profit = bonusValue * 0.0025;
                        break;
                    default:
                        profit = bonusValue * 0.001;
                        break;
                }
                
                const updatedUserWallet: Wallet = await this.addProfitById(profit, user.id);

                const referenceNumber = userRepository.generateReferenceNumber();
                const transactionDetail: any = {
                    description: `Arbitrage ROI bonus ${profit} from ${bonusFromUsername}.`,
                    type: 'ArbitrageRoiBonus',
                    amount: profit,
                    balance: updatedUserWallet.net_wallet,
                    reference_number: referenceNumber,
                    user_id: user.id,
                    status: 'completed',
                    notes: 'Arbitrage ROI bonus',
                    transaction_fee: 0,
                    approval: Approval.Approved,
                    currency: 'USDT',
                };

                await transactionRepository.create(transactionDetail);
            }

            this.calcRoiBonus(bonusFromUsername, user.referrer_id, bonusValue, level + 1);
        }
        
        return true;
    }
}

export default new WalletRepository();
function saveTransaction(data: any, ICryptoTransaction: any) {
    throw new Error("Function not implemented.");
}


import { OkPacket } from "mysql2";
import connection from "../db";
import * as OneSignal from '@onesignal/node-onesignal';
import dotenv from 'dotenv';
import userRepository from "../modules/users/user.repository";
dotenv.config();

import ITransaction from "../models/transaction.model";
import User from "../modules/users/user.model";

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
const oneSignalClient = new OneSignal.DefaultApi(configuration);
interface ITransactionRepository {
    create(transaction: ITransaction): Promise<ITransaction>;
    retrieveById(transId: number): Promise<ITransaction>;
    retrieveByUserId(userId: number): Promise<ITransaction[]>;
}

class TransactionRepository implements ITransactionRepository {
    async create(transaction: Partial<ITransaction>, notify: boolean = false): Promise<ITransaction> {
        let column_fields = '';
        let column_value = '';
        let modifiedOnProvided: boolean = false;
        Object.keys(transaction).forEach((key: string, i: number) => {
            if (key === 'modified') modifiedOnProvided = true;
            if (i > 0) {
                column_fields += `, ${key}`;
                column_value += `, "${transaction[key]}"`;
            } else {
                column_fields += `${key}`;
                column_value += `"${transaction[key]}"`;
            }
            
        });

        // if (notify && false) {
        //     const user: User = await userRepository.retrieveById(transaction.user_id as number);
        //     let notification = new OneSignal.Notification();
        //     notification.app_id = ONESIGNAL_APP_ID;
        //     notification = {
        //         ...notification,

        //         contents: {
        //             en: transaction.description
        //         },
        //         headings: {
        //             en: transaction.notes
        //         },
        //         data: {
        //             reference_number: transaction.reference_number
        //         },
        //         filters: [
        //             { "field": "tag", "key": "refer_code", "relation": "=", "value": user.refer_code }
        //         ]
        //     }

        //     const { id } = await oneSignalClient.createNotification(notification);
        // }
        
        return new Promise((resolve, reject) => {
            let sqlScript = `INSERT INTO transaction (${column_fields}, modified) VALUES(${column_value}, now())`;
            if (modifiedOnProvided) {
                sqlScript = `INSERT INTO transaction (${column_fields}) VALUES(${column_value})`;
            }
            connection.query<OkPacket>(
                sqlScript,
                (err, res) => {
                    if (err) {
                        reject(err);
                    } 
                    else
                        this.retrieveById(res.insertId)
                            .then((transaction: ITransaction) => resolve(transaction!))
                            .catch(reject);
                }
            );
        });
    }

    retrieveById(transId: number): Promise<ITransaction> {
        return new Promise((resolve, reject) => {
            connection.query<ITransaction[]>(
                "SELECT * FROM transaction WHERE id = ?",
                [transId],
                (err, res) => {
                    if (err) reject(err);
                    else resolve(res?.[0]);
                }
            );
        });
    }

    retrieveByUserId(userId: number): Promise<ITransaction[]> {
        return new Promise((resolve, reject) => {
            connection.query<ITransaction[]>(
                "SELECT * FROM transaction WHERE user_id = ?",
                [userId],
                (err, res) => {
                    if (err) reject(err);
                    else resolve(res);
                }
            );
        });
    }

    getTransactions(userId: number, types: string[], limit: number = 5, date: string): Promise<ITransaction[]> {
        const typeList: string = types.map((type: string) => `'${type}'`).join(',');
        const dateFilter = date !== '' ? `AND date LIKE '${date}%'` : '';
        
        return new Promise((resolve, reject) => {
            connection.query<ITransaction[]>(
                `SELECT * FROM transaction 
                WHERE type in (${typeList}) AND user_id = ${userId} ${dateFilter}
                ORDER BY modified DESC
                LIMIT 0,${limit}`,
                (err, res) => {
                    if (err) reject(err);
                    else resolve(res);
                }
            );
        });
    }

    updateTransactions(transId: number, read_status: number): Promise<ITransaction[]> {
        return new Promise((resolve, reject) => {
            connection.query<ITransaction[]>(
                `UPDATE transaction
                SET read_status=${read_status}
                WHERE id=${transId}`,
                (err, res) => {
                    if (err) reject(err);
                    else resolve(res);
                }
            );
        });
    }

    updateTransactionsAll(userId: number, read_status: number): Promise<ITransaction[]> {
        return new Promise((resolve, reject) => {
            connection.query<ITransaction[]>(
                `UPDATE transaction
                SET read_status=${read_status}
                WHERE user_id=${userId}`,
                (err, res) => {
                    if (err) reject(err);
                    else resolve(res);
                }
            );
        });
    }
}

export default new TransactionRepository();

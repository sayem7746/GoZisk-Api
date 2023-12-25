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
const client = new OneSignal.DefaultApi(configuration);
interface ITransactionRepository {
    create(transaction: ITransaction): Promise<ITransaction>;
    retrieveById(transId: number): Promise<ITransaction>;
    retrieveByUserId(userId: number): Promise<ITransaction[]>;
}

class TransactionRepository implements ITransactionRepository {
    async create(transaction: Partial<ITransaction>, notify: boolean = false): Promise<ITransaction> {
        let column_fields = '';
        let column_value = '';
        Object.keys(transaction).forEach((key: string) => {
            column_fields += `${key},`;
            column_value += `"${transaction[key]}",`;
        });

        if (notify) {
            const user: User = await userRepository.retrieveById(transaction.user_id as number);
            let notification = new OneSignal.Notification();
            notification.app_id = ONESIGNAL_APP_ID;
            notification = {
                ...notification,

                contents: {
                    en: transaction.description
                },
                headings: {
                    en: transaction.notes
                },
                data: {
                    reference_number: transaction.reference_number
                },
                filters: [
                    { "field": "tag", "key": "refer_code", "relation": "=", "value": user.refer_code }
                ]
            }

            const { id } = await client.createNotification(notification);
        }
        
        return new Promise((resolve, reject) => {
            connection.query<OkPacket>(
                `INSERT INTO transaction 
                    (${column_fields} modified) 
                    VALUES(${column_value} now())`,
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

    getTransactions(userId: number, types: string[], limit: number = 5): Promise<ITransaction[]> {
        const typeList: string = types.map((type: string) => `'${type}'`).join(',');
        return new Promise((resolve, reject) => {
            connection.query<ITransaction[]>(
                `SELECT * FROM transaction 
                WHERE type in (${typeList}) AND user_id = ${userId}
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
}

export default new TransactionRepository();

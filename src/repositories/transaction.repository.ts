import { OkPacket } from "mysql2";
import connection from "../db";

import ITransaction from "../models/transaction.model";

interface ITransactionRepository {
    create(transaction: ITransaction): Promise<ITransaction>;
    retrieveById(transId: number): Promise<ITransaction>;
    retrieveByUserId(userId: number): Promise<ITransaction[]>;
}

class TransactionRepository implements ITransactionRepository {
    create(transaction: Partial<ITransaction>): Promise<ITransaction> {
        let column_fields = '';
        let column_value = '';
        Object.keys(transaction).forEach((key: string) => {
            column_fields += `${key},`;
            column_value += `"${transaction[key]}",`;
        })
        
        return new Promise((resolve, reject) => {
            connection.query<OkPacket>(
                `INSERT INTO transaction 
                    (${column_fields} date, modified) 
                    VALUES(${column_value} now(),now())`,
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
}

export default new TransactionRepository();

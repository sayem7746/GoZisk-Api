import { OkPacket } from "mysql2";
import connection from "../db";
import dotenv from 'dotenv';
dotenv.config();

import IBanner from "../models/common.model";
import ISettings from "../models/common.model";


class CommonRepository {
    retrieveByCategory(category: string): Promise<IBanner[]> {
        return new Promise((resolve, reject) => {
            connection.query<IBanner[]>(
                "SELECT * FROM banner WHERE category = ?",
                [category],
                (err, res) => {
                    if (err) reject(err);
                    else resolve(res);
                }
            );
        });
    }

    getSettings(): Promise<ISettings[]> {
        return new Promise((resolve, reject) => {
            connection.query<ISettings[]>(
                "SELECT * FROM settings",
                (err, res) => {
                    if (err) reject(err);
                    else resolve(res);
                }
            );
        });
    }
}

export default new CommonRepository();

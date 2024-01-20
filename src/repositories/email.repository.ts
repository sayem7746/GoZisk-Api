import { OkPacket } from "mysql2";
import connection from "../db";
import dotenv from 'dotenv';
dotenv.config();

import ISupportEmail from "../models/email.model";

class EmailRepository {
    saveSupportEmail(data: Partial<ISupportEmail>): Promise<number> {
        return new Promise((resolve, reject) => {
                    connection.query<OkPacket>(
                        `INSERT INTO support
                        (name, email, message)
                        VALUES('${data.name}', '${data.email}', '${data.message}')`,
                        (err, res) => {
                            if (err) reject(err);
                            else resolve(res.affectedRows);
                        }
                    );
                });
    }
}

export default new EmailRepository();
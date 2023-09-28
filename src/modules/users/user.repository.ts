import { OkPacket } from "mysql2";
import connection from "../../db";

import User from "./user.model";
import moment from "moment";
// import IUserLogin from "./user.model";

interface IUserRepository {
  save(user: User): Promise<User>;
  retrieveAll(searchParams: {title: string, published: boolean}): Promise<User[]>;
  retrieveById(userId: number): Promise<User | undefined>;
  update(user: User): Promise<number>;
  delete(userId: number): Promise<number>;
  deleteAll(): Promise<number>;
  makeReferCode(prefix: string, length: number): string;
  getHierarchy(userId: number): Promise<User[]>;
}

class UserRepository implements IUserRepository {
  userHierarchyList: any[] = [];
  save(user: User): Promise<User> {
    return new Promise((resolve, reject) => {
      connection.query<OkPacket>(
        "INSERT INTO users (full_name, username, email, phone, password_hash, refer_code, referrer_id) VALUES(?,?,?,?,?,?,?)",
        [
          user.full_name,
          user.username,
          user.email,
          user.phone,
          user.password_hash,
          user.refer_code,
          user.referrer_id
        ],
        (err, res) => {
          if (err) reject(err.message);
          else 
            this.retrieveById(res.insertId)
              .then((user) => resolve(user!))
              .catch(reject);
        }
      );
    });
  }

  verifyLogin(userLogin: Partial<User>): Promise<User> {
    return new Promise((resolve, reject) => {
      connection.query<User[]>(
        "SELECT id, email, username, password_hash, full_name, phone, wallet_addr, refer_code  FROM users WHERE email = ?",
        [userLogin.email],
        (err, res) => {
          if (err) reject(err);
          else resolve(res?.[0]);
        }
      );
    });
  }

  retrieveAll(searchParams: {title?: string, published?: boolean}): Promise<User[]> {
    let query: string = "SELECT * FROM users";
    let condition: string = "";

    if (searchParams?.published)
      condition += "published = TRUE"

    if (searchParams?.title)
      condition += `LOWER(title) LIKE '%${searchParams.title}%'`

    if (condition.length)
      query += " WHERE " + condition;

    return new Promise((resolve, reject) => {
      connection.query<User[]>(query, (err, res) => {
        if (err) reject(err);
        else resolve(res);
      });
    });
  }

  retrieveById(userId: number): Promise<User> {
    return new Promise((resolve, reject) => {
      connection.query<User[]>(
        "SELECT * FROM users WHERE id = ?",
        [userId],
        (err, res) => {
          if (err) reject(err);
          else resolve(res?.[0]);
        }
      );
    });
  }

  retrieveByEmail(userEmail: string): Promise<User> {
    return new Promise((resolve, reject) => {
      connection.query<User[]>(
        "SELECT * FROM users WHERE email = ?",
        [userEmail],
        (err, res) => {
          if (err) reject(err);
          else resolve(res?.[0]);
        }
      );
    });
  }

  retrieveByUsername(userName: string): Promise<User> {
    console.log(`SELECT * FROM users WHERE username = ${userName}`);
    return new Promise((resolve, reject) => {
      connection.query<User[]>(
        "SELECT * FROM users WHERE username = ?",
        [userName],
        (err, res) => {
          if (err) reject(err);
          else resolve(res?.[0]);
        }
      );
    });
  }

  update(user: User): Promise<number> {
    return new Promise((resolve, reject) => {
      connection.query<OkPacket>(
        "UPDATE tutorials SET title = ?, description = ?, published = ? WHERE id = ?",
        [user.title, user.description, user.published, user.id],
        (err, res) => {
          if (err) reject(err);
          else resolve(res.affectedRows);
        }
      );
    });
  }

  delete(userId: number): Promise<number> {
    return new Promise((resolve, reject) => {
      connection.query<OkPacket>(
        "DELETE FROM tutorials WHERE id = ?",
        [userId],
        (err, res) => {
          if (err) reject(err);
          else resolve(res.affectedRows);
        }
      );
    });
  }

  deleteAll(): Promise<number> {
    return new Promise((resolve, reject) => {
      connection.query<OkPacket>("DELETE FROM tutorials", (err, res) => {
        if (err) reject(err);
        else resolve(res.affectedRows);
      });
    });
  }

  checkReferral(refer_code: string): Promise<User> {
    return new Promise((resolve, reject) => {
      connection.query<User[]>(
        "SELECT * FROM users WHERE refer_code = ?",
        [refer_code],
        (err, res) => {
          if (err) reject(err);
          else resolve(res?.[0]);
        }
      );
    });
  }

  // Generate referral code
  makeReferCode(prefix: string, length: number = 4): string {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return prefix + result;
  }

  async getHierarchy(userId: number): Promise<User[]> {
    return new Promise((resolve, reject) => {
      connection.query<User[]>(
        "CALL getAffiliateTree(?)",
        [userId],
        (err, res) => {
          if (err) reject(err);
          else resolve(res);
        }
      )
    });
  }

  // Generate reference number
  generateReferenceNumber(): string {
    let toDate = moment().format('YYYYMMDD');
    return `GOZISK${toDate + this.generateRandNumber()}`;
  }

  generateRandNumber(): number {
    return Math.floor(Math.random() * (100000000 - 1)) + 1;
  }
}

export default new UserRepository();

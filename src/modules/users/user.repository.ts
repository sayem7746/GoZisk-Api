import { OkPacket } from "mysql2";
import connection from "../../db";

import User from "./user.model";
import moment from "moment";
import { generateJWT } from "../../utils";
// import IUserLogin from "./user.model";

interface IUserRepository {
  save(user: User): Promise<User>;
  retrieveAll(searchParams: { title: string, published: boolean }): Promise<User[]>;
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
        "INSERT INTO users (full_name, username, email, phone, password_hash, refer_code, referrer_id, active, registerOTP, otpExpiration) VALUES(?,?,?,?,?,?,?,?,?,?)",
        [
          user.full_name,
          user.username,
          user.email,
          user.phone,
          user.password_hash,
          user.refer_code,
          user.referrer_id,
          0,
          user.registerOTP,
          user.otpExpiration
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
        "SELECT id, email, username, password_hash, full_name, phone, wallet_addr, refer_code, active  FROM users WHERE email = ?",
        [userLogin.email],
        (err, res) => {
          if (err) reject(err);
          else resolve(res?.[0]);
        }
      );
    });
  }

  retrieveAll(searchParams: { title?: string, published?: boolean }): Promise<User[]> {
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

  activateUser(email: string): Promise<number> {
    return new Promise((resolve, reject) => {
      connection.query<OkPacket>(
        `UPDATE users SET active = 1  WHERE email = '${email}'`,
        (err, res) => {
          if (err) reject(err);
          else resolve(res.affectedRows);
        }
      );
    });
  }

  updatePassword(userId: number, passwordHash: string): Promise<number> {
    return new Promise((resolve, reject) => {
      connection.query<OkPacket>(
        `UPDATE users SET password_hash = '${passwordHash}'  WHERE id = '${userId}'`,
        (err, res) => {
          if (err) reject(err);
          else resolve(res.affectedRows);
        }
      );
    });
  }

  updateOtpByEmail(email: string, registerOTP: number, otpExpiration: any): Promise<User> {
    return new Promise((resolve, reject) => {
      connection.query<OkPacket>(
        `UPDATE users SET registerOTP = ${registerOTP}, otpExpiration = '${otpExpiration}'  WHERE email = '${email}'`,
        (err, res) => {
          if (err) reject(err);
          else this.retrieveByEmail(email)
            .then((user) => resolve(user!))
            .catch(reject);
        }
      );
    });
  }

  update(user: User): Promise<number> {
    let updateColVal: string = '';
    Object.keys(user).forEach(k => {
      if (k !== 'id') {
        if (updateColVal === '') {
          updateColVal += `${k} = '${user[k]}'`;
        } else {
          updateColVal += `, ${k} = '${user[k]}'`;
        }
      }
    });

    return new Promise((resolve, reject) => {
      connection.query<OkPacket>(
        `UPDATE users SET ${updateColVal}  WHERE id = '${user.id}'`,
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
    return Math.floor(Math.random() * (1000000 - 1)) + 1;
  }


  generatePassword(): string {
    while (true) {
      let charSet: string = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
      let length = Math.floor(Math.random() * (16 - 8 + 1) + 8);
      let hasNumber = Math.random() < 0.5;
      let hasSpecial = Math.random() < 0.5;
      let password = '';
      if (hasNumber) charSet += '0123456789';
      if (hasSpecial) charSet += '!@#$%^&*';
      for (let i = 0; i < length; i++) {
        password += charSet[Math.floor(Math.random() * charSet.length)];
        if (
          password.match(
            /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{10,16}$/
          )
        ) return password;
      }
    }
  }

  //GENERATE TOKEN FOR LOGIN
  async tokenBuilder(user: User): Promise<any> {
    return new Promise((resolve, reject) => {
      const accessToken = generateJWT(
        {
          id: user.id,
          role: user.role_id === 1 ? 'user' : 'admin',
          tokenType: 'access',
        },
        {
          issuer: user.email,
          subject: user.email,
          audience: 'root',
        }
      );
      resolve({ accessToken: accessToken });
    });
  };
}

export default new UserRepository();

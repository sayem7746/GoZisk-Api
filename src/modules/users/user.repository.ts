import { OkPacket } from "mysql2";
import connection from "../../db";

import User from "./user.model";
import IUserLogin from "./user.model";

interface IUserRepository {
  save(user: User): Promise<User>;
  retrieveAll(searchParams: {title: string, published: boolean}): Promise<User[]>;
  retrieveById(userId: number): Promise<User | undefined>;
  update(user: User): Promise<number>;
  delete(userId: number): Promise<number>;
  deleteAll(): Promise<number>;
}

class UserRepository implements IUserRepository {
  save(user: User): Promise<User> {
    return new Promise((resolve, reject) => {
      connection.query<OkPacket>(
        "INSERT INTO users (full_name, username, email, phone, password_hash) VALUES(?,?,?,?,?)",
        [user.full_name, user.username, user.email, user.phone, user.password_hash],
        (err, res) => {
          if (err) reject(err);
          else
            this.retrieveById(res.insertId)
              .then((user) => resolve(user!))
              .catch(reject);
        }
      );
    });
  }

  verifyLogin(userLogin: IUserLogin): Promise<User> {
    return new Promise((resolve, reject) => {
      connection.query<User[]>(
        "SELECT email, username, password_hash, display_name, full_name, phone, wallet_addr  FROM users WHERE email = ?",
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
}

export default new UserRepository();

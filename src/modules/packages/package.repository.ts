import { OkPacket } from "mysql2";
import connection from "../../db";

import Package, { IPurchasePackage } from "./package.model";
import PurchasePackage from "./package.model";
import Wallet from "../wallet/wallet.model";
import userRepository from "../users/user.repository";

interface IPackageRepository {
  retrieveAll(): Promise<Package[]>;
  retrieveById(packageId: number): Promise<Package | undefined>;
}

class PackageRepository implements IPackageRepository {
  retrieveAll(): Promise<Package[]> {
    let query: string = "SELECT * FROM packages ORDER BY `order` ASC";
    let condition: string = "";

    return new Promise((resolve, reject) => {
      connection.query<Package[]>(query, (err, res) => {
        if (err) reject(err);
        else resolve(res);
      });
    });
  }
  
  retrieveMyAll(userId: number): Promise<Package[]> {
    let query: string = `SELECT * FROM purchase_package
    WHERE user_id = ${userId}`;

    return new Promise((resolve, reject) => {
      connection.query<Package[]>(query, (err, res) => {
        if (err) reject(err);
        else resolve(res);
      });
    });
  }

  retrieveById(packageId: number): Promise<Package> {
    return new Promise((resolve, reject) => {
      connection.query<Package[]>(
        "SELECT * FROM packages WHERE id = ?",
        [packageId],
        (err, res) => {
          if (err) reject(err);
          else resolve(res?.[0]);
        }
      );
    });
  }

  purchasePackage(purchaseDetail: IPurchasePackage): Promise<IPurchasePackage> {
    return new Promise((resolve, reject) => {
      connection.query<OkPacket>(
        "INSERT INTO purchase_package (user_id, package_id, status, invest_amount, modified_on) VALUES(?,?,?,?, now())",
        [
          purchaseDetail.user_id,
          purchaseDetail.package_id,
          purchaseDetail.status,
          purchaseDetail.invest_amount,
        ],
        (err, res) => {
          if (err) reject(err.message);
          else
            this.retrievePurchasePackageById(res.insertId)
              .then((purchasePackage: IPurchasePackage) => resolve(purchasePackage))
              .catch(reject);
        }
      );
    });
  }

  deletePackage(packageId: number): Promise<any> {
    return new Promise((resolve, reject) => {
      connection.query<OkPacket>(
        `UPDATE purchase_package
          SET status='withdraw'
            WHERE id=${packageId}`,
        (err, res) => {
          if (err) reject(err.message);
          else resolve(res.affectedRows);
        }
      );
    });
  }

  getPairingRowData(userId: number): Promise<any> {
    return new Promise((resolve, reject) => {
      connection.query<any[]>(
        "SELECT * FROM pairing WHERE user_id = ?",
        [userId],
        (err, res) => {
          if (err) reject(err);
          else resolve(res?.[0]);
        }
      );
    });
  }

  createPairEntry(userId: number, amount: number, type: string = 'create'): Promise<any> {
    if (type === 'create') {
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
    } else {
      return new Promise((resolve, reject) => {
        connection.query<any[]>(
          `UPDATE pairing
            SET invest= invest + ROUND(${amount}, 4)
            WHERE user_id=${userId}`,
          (err, res) => {
            if (err) reject(err);
            else resolve(res?.[0]);
          }
        );
      });
    }
  }

  retrievePurchasePackageById(purchaseId: number, status: string = 'active'): Promise<IPurchasePackage> {
    return new Promise((resolve, reject) => {
      connection.query<PurchasePackage[]>(
        `SELECT * FROM purchase_package WHERE id = ${purchaseId} AND status = '${status}'`,
        (err, res) => {
          if (err) reject(err);
          else {
            resolve(res?.[0]);
          }
        }
      );
    });
  }

  async updateUserWallet(wallet: Wallet, amount: number): Promise<Wallet> {
    await userRepository.retrieveById(wallet.user_id);
    return {
      ...wallet, 
      net_wallet: wallet.net_wallet - amount,
      invest_wallet: wallet.invest_wallet + amount
    };
  }

  maturityDays(date: any): any {
    let today = new Date();
    let definedDate = new Date(date);
    let totalDays = Math.trunc((today.getTime() - definedDate.getTime())  / (1000 * 3600 * 24));
    return {totalDays, withdrawFee: this.getWithdrawFeeFromMaturity(totalDays)};
  }

  getWithdrawFeeFromMaturity(totalDays: number): number {
    if (totalDays >= 30 && totalDays <= 60) {
      return 7;
    } else if (totalDays >= 61 && totalDays <= 90) {
      return 6;
    } else if (totalDays >= 91 && totalDays <= 120) {
      return 5;
    } else if (totalDays >= 121 && totalDays <= 150) {
      return 4;
    } else if (totalDays >= 151 && totalDays <= 180) {
      return 3;
    } else if (totalDays >= 181 && totalDays <= 210) {
      return 2;
    } else if (totalDays >= 211 && totalDays <= 240) {
      return 1;
    } else {
      return 0;
    }
  }
}

export default new PackageRepository();

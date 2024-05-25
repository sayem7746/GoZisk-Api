import { Request, Response } from "express";
import bcrypt from "bcrypt";
import Package from "./package.model";
import {IPurchasePackage} from './package.model';
import packageRepository from "./package.repository";
import IUserLogin from "./package.model";
import userRepository from "../users/user.repository";
import walletRepository from "../wallet/wallet.repository";
import Wallet from "../wallet/wallet.model";
import transactionRepository from "../../repositories/transaction.repository";
import { Approval }from "../../models/transaction.model";
import {binance} from 'ccxt';

export default class PackageController {
  async findAll(req: Request, res: Response) {

    try {
      const investmentPackages = await packageRepository.retrieveAll();

      res.status(200).send(investmentPackages);
    } catch (err) {
      res.status(500).send({
        message: "Some error occurred while retrieving investmentPackages."
      });
    }
  }

  async myPackages(req: Request, res: Response) {
    const userId = parseInt(req.params.id);
    const binance_ex = new binance();

    try {
      const investmentPackages = await packageRepository.retrieveMyAll(userId);
      const binanceBtcValue = await (await binance_ex.fetchTicker('BTC/USDT')).close as number;

      res.status(200).send({packages: investmentPackages, btcValue: binanceBtcValue});
    } catch (err) {
      res.status(500).send({
        message: "Some error occurred while retrieving investmentPackages."
      });
    }
  }

  async findOne(req: Request, res: Response) {
    const id: number = parseInt(req.params.id);

    try {
      const investmentPackage = await packageRepository.retrieveById(id);

      if (investmentPackage) res.status(200).send(investmentPackage);
      else
        res.status(404).send({
          message: `Cannot find User with id=${id}.`
        });
    } catch (err) {
      res.status(500).send({
        message: `Error retrieving User with id=${id}.`
      });
    }
  }

  async purchase(req: Request, res: Response) {
    const purchaseData: IPurchasePackage = {
      user_id: parseInt(req.body.user_id),
      package_id: parseInt(req.body.package_id),
      status: req.body.status,
      invest_amount: req.body.invest_amount
    }
    
    try {
      let userWallet: Wallet = await walletRepository.retrieveById(purchaseData.user_id as number);
      if (purchaseData.invest_amount < 50) {
        res.status(404).send({
          message: `Minimum package value $50.`
        });
      }else if (userWallet.net_wallet >= purchaseData.invest_amount) {
        const investDetail: IPurchasePackage = await packageRepository.purchasePackage(purchaseData);
        userWallet = await packageRepository.updateUserWallet(userWallet, purchaseData.invest_amount);
        let pairTableEntry: any = await packageRepository.getPairingRowData(purchaseData.user_id);
        if (!pairTableEntry) {
          await packageRepository.createPairEntry(purchaseData.user_id, purchaseData.invest_amount);
        } else {
          await packageRepository.createPairEntry(purchaseData.user_id, purchaseData.invest_amount, 'update');
        }
        await walletRepository.updateByColumn('net_wallet', userWallet.net_wallet, userWallet.user_id);
        await walletRepository.updateByColumn('invest_wallet', userWallet.invest_wallet, userWallet.user_id);
        const referenceNumber = userRepository.generateReferenceNumber();

        const transactionDetail: any = {
          type: 'purchase_package',
          amount : purchaseData.invest_amount,
          balance : userWallet.net_wallet,
          reference_number : referenceNumber,
          user_id : purchaseData.user_id,
          status : 'completed',
          notes : 'Purchase package',
          transaction_fee : 0,
          approval : Approval.Approved,
          currency : 'USDT',
          description: `Purchase Package (id: ${purchaseData.package_id}) with invest amount ${purchaseData.invest_amount}USDT`,
        }

        await transactionRepository.create(transactionDetail);
        


        if (investDetail) res.status(200).send(investDetail);
        else
          res.status(404).send({
            message: `Cannot purchase package.`
          });
      } else {
        res.status(404).send({
          message: `Wallet balance is not enough.`
        });
      }
    } catch (err) {
      res.status(500).send({
        message: `Error purchaseing package.`
      });
    }
  }

  async stopDeletePackage(req: Request, res: Response) {
    res.status(200).send({error: 'Invalid withdrawal'});
  }

  async deletePackage(req: Request, res: Response) {
    const packageId = parseInt(req.params.packageId)
    
    try {
      const purchasePackage: IPurchasePackage = await packageRepository.retrievePurchasePackageById(packageId);
      const packageMaturity: any = packageRepository.maturityDays(purchasePackage.modified_on);

      if (packageMaturity.totalDays > 30) {
        const transactionFee: number = purchasePackage.invest_amount * (packageMaturity.withdrawFee / 100);
        const refundAmount: number = purchasePackage.invest_amount - transactionFee;
        let userWallet: Wallet = await walletRepository.retrieveById(purchasePackage.user_id as number);
        
        // UPDATE WALLET
        await walletRepository.updateByColumn('net_wallet', (userWallet.net_wallet + refundAmount), userWallet.user_id);
        await walletRepository.updateByColumn('invest_wallet', (userWallet.invest_wallet - purchasePackage.invest_amount), userWallet.user_id);
        
        // DELETE PACKAGE
        await packageRepository.deletePackage(packageId);

        const referenceNumber: string = userRepository.generateReferenceNumber();

        const transactionDetail: any = {
          type: 'package_withdrawal',
          amount : refundAmount,
          balance : (userWallet.net_wallet + refundAmount),
          reference_number : referenceNumber,
          user_id : purchasePackage.user_id,
          status : 'completed',
          notes : 'Withdrawal package',
          transaction_fee : transactionFee,
          approval : Approval.Approved,
          currency : 'USDT',
          description: `Withdraw Package (maturity of ${packageMaturity.totalDays} days) with refund amount ${refundAmount}USDT.
          Package value ${purchasePackage.invest_amount}.
          Transaction fee: ${transactionFee}USDT`,
        }
        
        await transactionRepository.create(transactionDetail);
        
        res.status(200).send({
          refundAmount,
          package: purchasePackage,
          message: `Package withdrawal successful!`
        });
      } else {
        res.status(200).send({
          message: `Package maturity required 30 days!`
        });
      }
    } catch (err) {
      res.status(500).send({
        message: `Error deleting package.`
      });
    }
  }
}

import { Request, Response } from "express";
import axios from 'axios';
import walletRepository from "./wallet.repository";
import { ICryptoTransaction } from "./wallet.model";
import userRepository from "../users/user.repository";
import transactionRepository from "../../repositories/transaction.repository";
import User from "../users/user.model";
import { Approval } from "../../models/transaction.model";

export default class UserController {

    async findOne(req: Request, res: Response) {
        const id: number = parseInt(req.params.id);
        try {
            const userWallet = await walletRepository.retrieveById(id);

            if (userWallet) res.status(200).send(userWallet);
            else
                res.status(404).send({
                    message: `Cannot find User with id=${id}.`
                });
        } catch (err) {
            res.status(500).send({
                message: `Error retrieving User with id 1=${id}.`
            });
        }
    }

    async pairing(req: Request, res: Response) {
        try {
            const pairingData = await walletRepository.retrieveAllPairing();
            res.status(200).send({pairingData});
            walletRepository.getTotalInvest(pairingData[0].user_id, pairingData);
        } catch (err) {
            res.status(500).send({
                message: `Error retrieving data.`
            });
        }
    }

    async depositAddress(req: Request, res: Response) {
        const userId: number = parseInt(req.params.userId);
        const config = {headers: {'Content-Type': 'multipart/form-data'}};

        try {
            const userDepositAddress = await walletRepository.getDepositAddress(userId);
            if (!userDepositAddress.wallet_address) {
                const data: any = {username: userDepositAddress.user_name};
                try {
                    const addr = await axios.post<any>(`https://payment.gozisk.com/getaddress.php`, data, config);
                    if (addr.data.error){
                        res.status(401).send({error: addr.data.error});    
                    } else {
                        await walletRepository.addDepositAddress(userId, addr.data);
                        res.status(200).send({deposit_address: addr.data.address});
                    }
                } catch (err) {
                    res.status(500).send({
                        message: `Error calling gateway`
                    });
                }
            } else {
                res.status(200).send({deposit_address: userDepositAddress.wallet_address});    
            }
        } catch (err) {
            res.status(500).send({
                message: `Error retrieving data.`
            });
        }
    }

    async saveDeposit(req: Request, res: Response) {
        try {
            const txDetail: ICryptoTransaction = await walletRepository.getTransaction(req.body.username, req.body.txid);
            if (txDetail !== undefined) {
                res.status(200).send({'error': 'Transaction already exits!'});
            } else {
                const saveTransaction = await walletRepository.saveTransaction(req.body);
                if (saveTransaction) {
                    const wallet = await walletRepository.apendByColumn('net_wallet', saveTransaction.amount, saveTransaction.user_id as number);
                    const referenceNumber = userRepository.generateReferenceNumber();
                    const transactionDetail: any = {
                        description: `${saveTransaction.amount}USDT Deposited to wallet`,
                        type: 'deposit',
                        amount : req.body.amount,
                        balance : wallet.net_wallet,
                        reference_number : referenceNumber,
                        user_id : saveTransaction.user_id,
                        status : 'completed',
                        notes : 'Deposit money',
                        transaction_fee : 0,
                        approval : Approval.Approved,
                        currency : 'USDT',
                      };
                    await transactionRepository.create(transactionDetail);
                    res.status(200).send(saveTransaction);
                } else {
                    res.status(500).send({
                        message: `Error retrieving data.`
                    });
                }
                
            }
            
        } catch (err) {
            res.status(500).send({
                message: `Error retrieving data.`
            });
        }
    }
}
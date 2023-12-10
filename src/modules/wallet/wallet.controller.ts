import { Request, Response } from "express";
import axios from 'axios';
import walletRepository from "./wallet.repository";
import Wallet, { ICryptoTransaction, IWalletAddress, IWithdraw } from "./wallet.model";
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
                    await transactionRepository.create(transactionDetail, true);
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


    async addAddress(req: Request, res: Response) {
        const addressDetail: any = {
            user_id: parseInt(req.params.id),
            address: req.body.address,
            network_name: req.body.network_name,
            network_type: req.body.network_type,
            status: req.body.status,
            note: req.body.note
        }

        try {
            const getAddress: IWalletAddress[] = await walletRepository.retrieveByAddress(addressDetail.user_id, addressDetail.address);
            if (getAddress.length !== 0) {
                res.status(500).send({ 'error': 'Address exists!' });
                return;
            }
            const addresses: IWalletAddress[] = await walletRepository.addAddress(addressDetail);
            
            if (!addresses) {
                res.status(200).send({ 'error': 'Failed to add address!' });
            } else {
                res.status(200).send(addresses);
            }
            
        } catch (err) {
            res.status(500).send({
                message: `Error retrieving data.`
            });
        }
    }

    async updateAddress(req: Request, res: Response) {
        const addressDetail: any = {
            id: parseInt(req.params.id),
            user_id: req.body.user_id,
            status: req.body.status
        }
        try {
            const addresses: IWalletAddress[] = await walletRepository.updateAddress(addressDetail);
            if (addresses) {
                res.status(200).send(addresses);
            } else {
                res.status(200).send({ 'error': 'Failed to update address!' });
            }
            
        } catch (err) {
            res.status(500).send({
                message: `Error retrieving data.`
            });
        }
    }

    async allAddress(req: Request, res: Response) {
        const user_id: number = parseInt(req.params.id)

        try {
            const addresses: IWalletAddress[] = await walletRepository.retrieveWalletAddressById(user_id);
            res.status(200).send(addresses);
        } catch (err) {
            res.status(500).send({
                message: `Error retrieving data.`
            });
        }
    }

    async activeAddress(req: Request, res: Response) {
        const user_id: number = parseInt(req.params.id)

        try {
            const addresses: IWalletAddress[] = await walletRepository.retrieveWalletActiveAddressById(user_id);
            res.status(200).send(addresses);
        } catch (err) {
            res.status(500).send({
                message: `Error retrieving data.`
            });
        }
    }

    
    async deleteAddress(req: Request, res: Response) {
        const user_id: number = parseInt(req.params.id)
        const address: string = req.body.address;
        try {
            const rows: number = await walletRepository.deleteAddress(user_id, address);
            if (rows > 0) {
                res.status(200).send({ 'success': 'successfully removed the address!' });
            } else {
                res.status(200).send({ 'error': 'Failed to delete address!' });
            }
            
        } catch (err) {
            res.status(500).send({
                message: `Error retrieving data.`
            });
        }
    }

    
    async addWithdraw(req: Request, res: Response) {
        const data: any = {...req.body, user_id: parseInt(req.params.id)};
        try {
            const userWallet: Wallet = await walletRepository.retrieveById(data.user_id);
            const fee = data.withdraw_amount * 0.05;
            if (userWallet && userWallet.net_wallet > (data.withdraw_amount + fee)) {
                const referenceNumber = userRepository.generateReferenceNumber();
                const userWithdrawList: IWithdraw[] = await walletRepository.addWithdraw({...data, reference: referenceNumber});
                if (userWithdrawList) {
                    const wallet = await walletRepository.updateByColumn('net_wallet', userWallet.net_wallet - data.withdraw_amount , data.user_id);
                    res.status(200).send(userWithdrawList);
                } else {
                    res.status(500).send({ 'error': 'Failed to create withdrawal!' });
                }
            } else {
                res.status(500).send({ 'error': 'Wallet balance is not enough!' });
            }
            
        } catch (err) {
            res.status(500).send({
                message: `Error retrieving data.`
            });
        }
    }
    
    async getAllWithdraw(req: Request, res: Response) {
        const userId: number = parseInt(req.params.id)
        try {
            const userWithdrawList: IWithdraw[] = await walletRepository.retrieveWithdrawalById(userId);
            if (userWithdrawList) {
                res.status(200).send(userWithdrawList);
            } else {
                res.status(200).send({ 'error': 'Failed to get list!' });
            }
            
        } catch (err) {
            res.status(500).send({
                message: `Error retrieving data.`
            });
        }
    }
}
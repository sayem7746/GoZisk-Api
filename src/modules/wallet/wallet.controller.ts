import { Request, Response } from "express";
import crypto from 'crypto';
import dotenv from 'dotenv';
import axios from 'axios';
import walletRepository from "./wallet.repository";
import Wallet, { ICryptoTransaction, IWalletAddress, IWithdraw } from "./wallet.model";
import userRepository from "../users/user.repository";
import transactionRepository from "../../repositories/transaction.repository";
import { Approval } from "../../models/transaction.model";
import {binance} from 'ccxt';

dotenv.config();

export default class UserController {

    async findOne(req: Request, res: Response) {
        const id: number = parseInt(req.params.id);
        const binance_ex = new binance();

        try {
            const userWallet = await walletRepository.retrieveById(id);
            const binanceBtcValue = await (await binance_ex.fetchTicker('BTC/USDT')).close as number;

            if (userWallet) res.status(200).send({userWallet, binanceBtcValue});
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

    async fixPairing(req: Request, res: Response) {
        try {
            const allUsers = await walletRepository.retrieveAllUserPair();
            res.status(200).send({allUsers});
            allUsers.forEach(user => {
                if(!user.pairing_id) {
                    walletRepository.createPairEntry(user.user_id, 0);
                }
            });
        } catch (err) {
            res.status(500).send({
                message: `Error retrieving data.`
            });
        }
    }

    async currentValue(req: Request, res: Response) {
        const binance_ex = new binance();

        try {
            const binanceBtcValue = await (await binance_ex.fetchTicker('BTC/USDT')).close as number;
            res.status(200).send({binanceBtcValue});
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

    async savePayout(req: Request, res: Response) {
        const body = {
            wdrawid: 'GOZISK' + req.body.wdrawid,
            status: parseInt(req.body.status),
            message: req.body.message,
            txid: req.body.txid,
            error: req.body.error
        }
        
        try {
            const wdDetail: IWithdraw = await walletRepository.getWithdrawTransaction(body.wdrawid);
            if (wdDetail.status !== 'pending') {
                res.status(200).send({'error': 'Transaction already exits!'});
            } else if (body.status === 0) {
                await walletRepository.updateWithdraw(wdDetail.id!, 'txid', `'${body.txid}'`);
                res.status(200).send({'success': 'Transaction saved successfully!'});
            } else if (body.status === 1) {
                const userWallet: Wallet = await walletRepository.retrieveById(wdDetail.user_id);
                await walletRepository.updateWithdraw(wdDetail.id!, 'status', "'approved'");
                await walletRepository.updateWithdraw(wdDetail.id!, 'txid', `'${body.txid}'`);
                const fee = wdDetail.withdraw_amount * 0.03;
                // save the transactioin
                const transactionDetail: any = {
                    description: `${wdDetail.withdraw_amount}USDT Withdrawn to the address ${wdDetail.address}`,
                    type: 'withdraw',
                    amount: wdDetail.withdraw_amount,
                    balance: userWallet.net_wallet - fee,
                    reference_number: wdDetail.reference,
                    user_id: wdDetail.user_id,
                    status: 'completed',
                    notes: 'Withdraw money',
                    transaction_fee: fee,
                    approval: Approval.Approved,
                    currency: 'USDT',
                };
                
                await transactionRepository.create(transactionDetail, true);
                res.status(200).send({'success': 'Transaction saved successfully!'});

            } else if (body.status === 2) {
                const referenceNumber = wdDetail.reference;
                const userWallet: Wallet = await walletRepository.retrieveById(wdDetail.user_id);
                if (userWallet) {
                    await walletRepository.updateByColumn('net_wallet', userWallet.net_wallet + wdDetail.withdraw_amount, wdDetail.user_id);
                    await walletRepository.updateWithdraw(wdDetail.id!, 'status', "'rejected'");
                    await walletRepository.updateWithdraw(wdDetail.id!, 'cancel_reason', `'${body.message}'`);
                    // save the transactioin
                    const transactionDetail: any = {
                        description: `Withdrawal of ${wdDetail.withdraw_amount}USDT has been rejected. ${body.message}`,
                        type: 'withdraw',
                        amount: wdDetail.withdraw_amount,
                        balance: userWallet.net_wallet + wdDetail.withdraw_amount,
                        reference_number: referenceNumber,
                        user_id: wdDetail.user_id,
                        status: 'completed',
                        notes: 'Withdrawal rejected',
                        transaction_fee: 0,
                        approval: Approval.Declined,
                        currency: 'USDT',
                    };
                    await transactionRepository.create(transactionDetail, true);
                    res.status(200).send({'success': 'Transaction saved successfully!'});
                    
                } else {
                    res.status(200).send({'error': 'User wallet not found!'});
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
            note: req.body.note,
            otp: req.body.otp
        }
        const email: string = req.body.token.sub;

        try {
            const verifyOtp: boolean = await userRepository.verifyOtp(email, addressDetail.otp);
            
            const getAddress: IWalletAddress[] = await walletRepository.retrieveByAddress(addressDetail.user_id, addressDetail.address);
            if (getAddress.length !== 0) {
                res.status(500).send({ 'error': 'Address exists!' });
                return;
            }
            if (verifyOtp) {
                const addresses: IWalletAddress[] = await walletRepository.addAddress(addressDetail);

                if (!addresses) {
                    res.status(200).send({ 'error': 'Failed to add address!' });
                } else {
                    res.status(200).send(addresses);
                }
            } else {
                res.status(200).send({ 'error': 'OTP does not matched!' });
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
            if (userWallet) {
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
    
    async approveWithdrawal(req: Request, res: Response) {
        const withdrawalId = parseInt(req.body.withdrawalId);
        try {
            const selectedWithdrawal: IWithdraw = await walletRepository.retrieveWithdrawalById(withdrawalId);
            
            if (selectedWithdrawal && selectedWithdrawal.status === 'pending') {
                const userWallet: Wallet = await walletRepository.retrieveById(selectedWithdrawal.user_id);

                if (userWallet) {
                    // prepare payment gateway call.
                    const refId = selectedWithdrawal.reference.replace('GOZISK', '');
                    const config = {headers: {'Content-Type': 'multipart/form-data'}};
                    const hashed = crypto.createHash('sha256')
                        .update(
                            userWallet.username
                            + refId
                            + selectedWithdrawal.address
                            + selectedWithdrawal.withdraw_amount
                            + process.env.SECRETKEY).digest("hex");

                    const data: any = {
                        username: userWallet.username,
                        wdrawid: refId,
                        address: selectedWithdrawal.address,
                        amount: selectedWithdrawal.withdraw_amount,
                        hashed: hashed,
                        requestedOn: selectedWithdrawal.modified_on
                    };

                    const payoutStatus = await axios.post<any>(`https://payment.gozisk.com/payout.php`, data, config);
                    if (payoutStatus.data.status === 'ok') {
                        await walletRepository.updateWithdraw(selectedWithdrawal.id!, 'payoutid', payoutStatus.data.payoutid);
                        const latestWithdrawList: IWithdraw[] = await walletRepository.retrieveWithdrawal();
                        res.status(200).send({latestWithdrawList, payoutStatus: payoutStatus.data});
                    } else {
                        res.status(200).send(payoutStatus.data);
                    }
                } else {
                    res.status(500).send({ 'error': 'Wallet balance is not enough!' });
                }    
            } else {
                res.status(500).send({ 'error': 'Something goes wrong!' });
            }
            
            
        } catch (err) {
            res.status(500).send({
                message: `Error retrieving data.`
            });
        }
    }


    async rejectWithdrawal(req: Request, res: Response) {
        const withdrawalId = parseInt(req.body.withdrawalId);
        const rejectMsg = req.body.message;
        try {
            const selectedWithdrawal: IWithdraw = await walletRepository.retrieveWithdrawalById(withdrawalId);

            if (selectedWithdrawal && selectedWithdrawal.status === 'pending') {
                const userWallet: Wallet = await walletRepository.retrieveById(selectedWithdrawal.user_id);
                if (userWallet) {
                    const referenceNumber = selectedWithdrawal.reference;
                    await walletRepository.updateByColumn('net_wallet', userWallet.net_wallet +  selectedWithdrawal.withdraw_amount, selectedWithdrawal.user_id);
                    await walletRepository.updateWithdraw(selectedWithdrawal.id!, 'status', "'rejected'");
                    await walletRepository.updateWithdraw(selectedWithdrawal.id!, 'cancel_reason', `'${rejectMsg}'`);
                    // save the transactioin
                    const transactionDetail: any = {
                        description: `Withdrawal of ${selectedWithdrawal.withdraw_amount}USDT has been rejected. ${rejectMsg}`,
                        type: 'withdraw',
                        amount : selectedWithdrawal.withdraw_amount,
                        balance : userWallet.net_wallet + selectedWithdrawal.withdraw_amount,
                        reference_number : referenceNumber,
                        user_id : selectedWithdrawal.user_id,
                        status : 'completed',
                        notes : 'Withdrawal rejected',
                        transaction_fee : 0,
                        approval : Approval.Declined,
                        currency : 'USDT',
                        };
                    await transactionRepository.create(transactionDetail, true);
                    res.status(200).send({'success': 'Withdrawal rejected successfully!'});
                } else {
                    res.status(500).send({ 'error': 'Wallet balance is not enough!' });
                }    
            } else {
                res.status(500).send({ 'error': 'Something goes wrong!' });
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
            const userWithdrawList: IWithdraw[] = await walletRepository.retrieveWithdrawalByUserId(userId);
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
    
    async getAllPendingWithdrawal(req: Request, res: Response) {
        try {
            const withdrawList: IWithdraw[] = await walletRepository.retrieveWithdrawal();
            if (withdrawList) {
                res.status(200).send(withdrawList);
            } else {
                res.status(200).send({ 'error': 'Failed to get list!' });
            }
            
        } catch (err) {
            res.status(500).send({
                message: `Error retrieving data.`
            });
        }
    }

    async getAllWallet(req: Request, res: Response) {
        const viewName: string = req.params.view;
        try {
            const walletList: any[] = await walletRepository.retrieveAllWallet(viewName);
            if (walletList) {
                res.status(200).send(walletList);
            } else {
                res.status(200).send({ 'error': 'Failed to get list!' });
            }
            
        } catch (err) {
            res.status(500).send({
                message: `Error retrieving data.`
            });
        }
    }

    async getWalletByParams(req: Request, res: Response) {
        const paramname = req.params.paramname;
        const paramvalue = req.params.paramvalue;

        try {
            const walletList: any[] = await walletRepository.retrieveWalletByParams(paramname, paramvalue);
            if (walletList) {
                res.status(200).send(walletList);
            } else {
                res.status(200).send({ 'error': 'Failed to get list!' });
            }
            
        } catch (err) {
            res.status(500).send({
                message: `Error retrieving data.`
            });
        }
    }

    async getGroupSale(req: Request, res: Response) {
        const userId = parseInt(req.params.userId);
        const dateFrom = req.params.dateFrom;
        const dateTo = req.params.dateTo;

        try {
            const groupSaleDetail: any[] = await walletRepository.fetchGroupSale(userId, dateFrom, dateTo);
            if (groupSaleDetail) {
                res.status(200).send(groupSaleDetail);
            } else {
                res.status(500).send({ 'error': 'No sale found!' });
            }
            
        } catch (err) {
            res.status(500).send({
                message: `Error retrieving data.`
            });
        }
    }
}
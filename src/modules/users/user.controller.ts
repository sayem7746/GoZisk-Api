import { Request, Response } from "express";
import bcrypt from "bcrypt";
import User from "./user.model";
import userRepository from "./user.repository";
import walletRepository from "../wallet/wallet.repository";
import IUserLogin from "./user.model";
import Wallet from "../wallet/wallet.model";
import ITransaction from "../../models/transaction.model";
import { Approval }from "../../models/transaction.model";
import transactionRepository from "../../repositories/transaction.repository";

export default class UserController {
  async create(req: Request, res: Response) {
    if (!req.body.full_name) {
      res.status(400).send({
        message: req.body //"Name can not be empty!"
      });
      return;
    }
    if (!req.body.username) {
      res.status(400).send({
        message: "User ID can not be empty!"
      });
      return;
    }
    if (!req.body.email) {
      res.status(400).send({
        message: "Email can not be empty!"
      });
      return;
    }
    if (!req.body.phone) {
      res.status(400).send({
        message: "Phone can not be empty!"
      });
      return;
    }
    if (!req.body.password) {
      res.status(400).send({
        message: "Password can not be empty!"
      });
      return;
    }

    try {
      const user: User = {
        ...req.body,
        password_hash: req.body.password,
        refer_code: userRepository.makeReferCode(req.body.username)
      };
      console.log(user);
      const savedUser = await userRepository.save(user);
      res.status(201).send(savedUser);
    } catch (err) {
      res.status(500).send({
        message: err
      });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const userData: IUserLogin = req.body;
      const validUser: User = await userRepository.verifyLogin(userData);
      let userWallet: Wallet = await walletRepository.retrieveById(validUser.id);
      if (!userWallet) {
        userWallet = await walletRepository.create(validUser.id);
      }
      res.status(200).send({ user: validUser, wallet: userWallet });
    } catch (err) {
      console.log(err);
      res.status(500).send({
        message: "User not exists!."
      });
    }
  }

  async findAll(req: Request, res: Response) {
    const title = typeof req.query.title === "string" ? req.query.title : "";

    try {
      const users = await userRepository.retrieveAll({ title: title });

      res.status(200).send(users);
    } catch (err) {
      res.status(500).send({
        message: "Some error occurred while retrieving users."
      });
    }
  }

  async findOne(req: Request, res: Response) {
    const id: number = parseInt(req.params.id);

    try {
      const user = await userRepository.retrieveById(id);

      if (user) res.status(200).send(user);
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

  async update(req: Request, res: Response) {
    let user: User = req.body;
    user.id = parseInt(req.params.id);

    try {
      const num = await userRepository.update(user);

      if (num == 1) {
        res.send({
          message: "User was updated successfully."
        });
      } else {
        res.send({
          message: `Cannot update User with id=${user.id}. Maybe User was not found or req.body is empty!`
        });
      }
    } catch (err) {
      res.status(500).send({
        message: `Error updating User with id=${user.id}.`
      });
    }
  }

  async delete(req: Request, res: Response) {
    const id: number = parseInt(req.params.id);

    try {
      const num = await userRepository.delete(id);

      if (num == 1) {
        res.send({
          message: "User was deleted successfully!"
        });
      } else {
        res.send({
          message: `Cannot delete User with id=${id}. Maybe User was not found!`,
        });
      }
    } catch (err) {
      res.status(500).send({
        message: `Could not delete User with id==${id}.`
      });
    }
  }

  async deleteAll(req: Request, res: Response) {
    try {
      const num = await userRepository.deleteAll();

      res.send({ message: `${num} Users were deleted successfully!` });
    } catch (err) {
      res.status(500).send({
        message: "Some error occurred while removing all users."
      });
    }
  }

  async findAllPublished(req: Request, res: Response) {
    try {
      const users = await userRepository.retrieveAll({ published: true });

      res.status(200).send(users);
    } catch (err) {
      res.status(500).send({
        message: "Some error occurred while retrieving users."
      });
    }
  }

  async checkReferral(req: Request, res: Response) {
    try {
      const users = await userRepository.checkReferral(req.body.refer_code);
      if (users === undefined) {
        throw new Error('Referral user not exists');
      }
      res.status(200).send(users);
    } catch (err) {
      res.status(500).send({
        message: "Referral user not exists!"
      });
    }
  }

  async getHierarchy(req: Request, res: Response) {
    const id: number = parseInt(req.params.id);
    try {
      const users: any[] = await userRepository.getHierarchy(id);
      if (users === undefined) {
        throw new Error('No referrel user found!');
      }
      res.status(200).send(users[0]);
    } catch (err) {
      res.status(500).send({
        message: "Referral user not exists!"
      });
    }
  }

  async transfer(req: Request, res: Response) {
    const transferUserId: number = parseInt(req.body.transfer_user_id);
    const receiveUsername: string = req.body.receive_username;
    const transferAmount: number = parseInt(req.body.transfer_amount);
    let transactionDetail: any = {
      description: '',
      type: '',
      amount : transferAmount,
      balance : 0,
      reference_number : 0,
      user_id : '',
      status : 'completed',
      notes : 'Transfer money between accounts',
      transaction_fee : 0,
      approval : Approval.Approved,
      currency : 'USDT',
    };

    const referenceNumber = userRepository.generateReferenceNumber();

    try {
      const receiver: User = await userRepository.retrieveByUsername(receiveUsername);
      const payeeWallet: any = await walletRepository.retrieveById(transferUserId);
      const receiverWallet: any = await walletRepository.retrieveById(receiver.id);

      let affectedRows = await walletRepository.update(payeeWallet.net_wallet - transferAmount, payeeWallet);
      
      await transactionRepository.create({
        ...transactionDetail,
        description: `Transfer ${transferAmount} USDT`,
        type: 'transfer',
        balance: payeeWallet.net_wallet - transferAmount,
        reference_number: referenceNumber,
        user_id: transferUserId,
      });

      affectedRows = await walletRepository.update(receiverWallet.net_wallet + transferAmount, receiverWallet);
      
      await transactionRepository.create({
        ...transactionDetail,
        description: `Receive ${transferAmount} USDT`,
        type: 'receive',
        balance: payeeWallet.net_wallet + transferAmount,
        reference_number: referenceNumber,
        user_id: receiver.id,
      });

      if (payeeWallet === undefined) {
        throw new Error('No user found!');
      }
      res.status(200).send({status: 'successfully transferred!'});
    } catch (err) {
      res.status(500).send({
        message: "Referral user not exists!"
      });
    }
  }
}

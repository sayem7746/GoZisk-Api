import { NextFunction, Request, Response } from "express";
import MailService from "../services/mailService";
import HttpError from '../utils/httpError';
import { generateOtp } from "../utils";
import verifyEmail from '../templates/verifyEmailTemplate';
import supportEmail from '../templates/supportEmailTemplate';
import IBanner from "../models/common.model";
import ISettings from "../models/common.model";
import ISupportEmail from "../models/common.model";
import commonRepository from "../repositories/common.repository";
import emailRepository from "../repositories/email.repository";

export function welcome(req: Request, res: Response): Response {
  return res.json({ message: "Welcome to bezkoder application." });
}

export async function email(req: Request, res: Response): Promise<Response> {
  // SEND VERIFICATION MAIL TO USER
  const otp: string = generateOtp(6);
  const emailTemplate = verifyEmail(
    otp,
    'Sayem',
    'sam@gmail.com'
  );
  const mailService = MailService.getInstance();
  await mailService.sendMail(req.headers['X-Request-Id'] as string, {
    to: 'sayem7746@gmail.com',//user.email,
    subject: 'GoZisk Account Verify OTP',
    html: emailTemplate.html,
  });
  return res.json({ message: "Email sent!" });
}

export async function getBanner(req: Request, res: Response) {
  const catType: string = req.params.catType;
  try {
      const bannerList: IBanner[] = await commonRepository.retrieveByCategory(catType);
      if (bannerList) {
          res.status(200).send(bannerList);
      } else {
          res.status(200).send({ 'error': 'Failed to get list!' });
      }
      
  } catch (err) {
      res.status(500).send({
          message: `Error retrieving data.`
      });
  }
}

export async function getSettings(req: Request, res: Response) {
  try {
      const app_version: ISettings[] = await commonRepository.getSettings();
      res.status(200).send(app_version);
      
  } catch (err) {
      res.status(500).send({
          message: `Error retrieving data.`
      });
  }
}

export async function sendSupportEmail(req: Request, res: Response) {
  const reqData = req.body;
  try {
      const affectedRows: number = await emailRepository.saveSupportEmail(reqData);
      if (affectedRows > 0) {
        //SEND VERIFICATION MAIL TO USER
        const emailTemplate = supportEmail(reqData.name, reqData.email, reqData.message);
        const mailService = MailService.getInstance();
        await mailService.sendMail(req.headers['X-Request-Id'] as string, {
            to: `"GoZisk Support" support@gozisk.com`,
            subject: 'GoZisk Support email',
            html: emailTemplate.html,
        });
        res.status(200).send({success: 'Send to support successfully!'});
      } else {
        res.status(500).send({error: 'failed! Try again later.'});
      }
        
      
  } catch (err) {
      res.status(500).send({
          message: `Faild to record email.`
      });
  }
}
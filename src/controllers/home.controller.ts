import { NextFunction, Request, Response } from "express";
import MailService from "../services/mailService";
import HttpError from '../utils/httpError';
import { generateOtp } from "../utils";
import verifyEmail from '../templates/verifyEmailTemplate';

export function welcome(req: Request, res: Response): Response {
  return res.json({ message: "Welcome to bezkoder application." });
}

export async function email(req: Request, res: Response): Promise<Response> {
  // SEND VERIFICATION MAIL TO USER
  const otp: string = generateOtp(6);
  const emailTemplate = verifyEmail(
    otp,
    'Sayem'
  );
  const mailService = MailService.getInstance();
  await mailService.sendMail(req.headers['X-Request-Id'] as string, {
    to: 'sayem7746@gmail.com',//user.email,
    subject: 'GoZisk Account Verify OTP',
    html: emailTemplate.html,
  });
  return res.json({ message: "Email sent!" });
}

// export const sendEmail = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//       const email = req.body.email;
//       const user = await {
//         isEmailVerified: false
//       };//await User.findOne({ email }).populate('role');

//       //CHECK FOR USER VERIFIED AND EXISTING
//       if (!user.isEmailVerified) {
//           throw new HttpError({
//               title: 'bad_request',
//               detail: 'Please confirm your account by confirmation email OTP and try again',
//               code: 400,
//           });
//       } else if (!user) {
//           throw new HttpError({
//               title: 'bad_login',
//               detail: 'You have entered an invalid email address or password',
//               code: 400,
//           });
//       }

//       let tokenExpiration: any = new Date();
//       tokenExpiration = tokenExpiration.setMinutes(
//           tokenExpiration.getMinutes() + 10
//       );

//       const otp: string = generateOtp(6);

//       // let newOtp = new otpMaster({
//       //     userId: user._id,
//       //     type: OtpType.FORGET,
//       //     otp,
//       //     otpExpiration: new Date(tokenExpiration),
//       // });
//       // await newOtp.save();

//       //GENERATE OTP AND SEND ON MAIL
//       const emailTemplate = verifyEmail(
//           otp,
//           'Sayem'
//       );

//       //SEND FORGOT PASSWORD EMAIL
//       const mailService = MailService.getInstance();
//       await mailService.sendMail(234, {
//           to: email,
//           subject: 'Reset Password',
//           html: emailTemplate.html,
//       });
//       return res.json({ message: "Email checking." });
//       // return jsonOne<string>(
//       //     res,
//       //     200,
//       //     'Forget Password OTP sent successfully'
//       // );
//   } catch (e) {
//       next(e);
//   }
// };

import { Request, Response } from "express";
import walletRepository from "./wallet.repository";

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
}
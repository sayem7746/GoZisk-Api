import { RowDataPacket } from "mysql2"

export default interface Wallet extends RowDataPacket {

    id: number;
    user_id: number;
    net_wallet: number;
    invest_wallet: number;
    roi_wallet: number;
    modified: string;
    deleted: number;
}

export interface IPairing extends RowDataPacket {
    user_id: number;
    invest: number;
    carry_forward: number;
}

export interface IDepositAddress extends RowDataPacket {
    error: number;
    username: string;
    address: string;
}

export interface ICryptoTransaction extends RowDataPacket {
    user_id?: number;
    txid: string;
    txdate: string;
    amount: number;
    username: string;
    send_to: string;
    send_from: string;
}

import { RowDataPacket } from "mysql2"

export default interface Wallet extends RowDataPacket {

    id: number;
    user_id: number;
    net_wallet: number;
    invest_wallet: string;
    roi_wallet: string;
    modified: string;
    deleted: number;
}

export interface IPairing extends RowDataPacket {
    user_id: number;
    invest: number;
    carry_forward: number;
}

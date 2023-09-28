import { RowDataPacket } from "mysql2"

export default interface Package extends RowDataPacket {
    id: number;
    name: string;
    min: number;
    max: number;
    daily_return: number;
}

export default interface PurchasePackage extends RowDataPacket {
    id: number;
    user_id: number;
    package_id: number;
    status: string;
    invest_amount: number;
    modified_on?: string;
}

export interface IPurchasePackage {
    id?: number;
    user_id: number;
    package_id: number;
    status: string;
    invest_amount: number;
    modified_on?: string;
}

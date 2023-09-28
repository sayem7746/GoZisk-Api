import { RowDataPacket } from "mysql2"

export default interface IUserLogin {
    email: string;
    password: string;
}

export default interface User extends RowDataPacket {

    id: number;
    role_id: number;
    email: string;
    username: string;
    password_hash: string;
    reset_hash: string;
    last_login: string;
    last_ip: string;
    banned: boolean;
    ban_message: string;
    active: number;
    referrer_id: number;
    posid: number;
    full_name: string;
    position: string;
    balance: number;
    street_address: string;
    state: string;
    city: string;
    country: string;
    phone: string;
    wallet_addr: string;
    post_code: string;
    refer_code: string;
}

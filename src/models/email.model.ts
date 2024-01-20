import { RowDataPacket } from "mysql2"

export default interface ISupportEmail extends RowDataPacket {
    id?: number;
    name: string;
    email: string;
    message: string;
    send_on?: string;
  }
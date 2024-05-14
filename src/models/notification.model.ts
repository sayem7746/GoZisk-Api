import { RowDataPacket } from "mysql2"

export default interface INotification extends RowDataPacket {
    id?: number;
    headings?: string;
    contents?: string;
    data?: string;
    filters?: string;
    notify_status?: boolean;
    created_on?: string;
  }
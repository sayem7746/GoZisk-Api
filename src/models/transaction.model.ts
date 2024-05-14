import { RowDataPacket } from "mysql2"

export default interface ITransaction extends RowDataPacket {
  id?: number;
  date?: string;
  description?: string;
  type?: string;
  amount?: number;
  balance?: number;
  reference_number?: string;
  user_id?: number;
  status?: string;
  notes?: string;
  transaction_fee?: number;
  approval?: Approval;
  currency?: string;
  modified?: string;
}

export enum Approval {
    Approved = 'approved',
    Declined = 'declined',
    Pending = 'pending'
}

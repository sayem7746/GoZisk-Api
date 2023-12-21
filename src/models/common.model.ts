import { RowDataPacket } from "mysql2"

export default interface IBanner extends RowDataPacket {
  id?: number;
  title: string;
  category: string;
  image_link: string;
  description: string;
  order: number;
  status: number;
  modified_on?: string;
}

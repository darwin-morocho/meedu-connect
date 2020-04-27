export interface IUser {
  userId: number;
  name: string;
  lastName: string;
  email: string;
}

export interface IResponse {
  status: number;
  message?: string;
  data?: any;
}

export enum IMessageType {
  text = 'text',
  image = 'image',
  file = 'file',
}

export interface IMessage {
  userId: number;
  value: string;
  type: IMessageType;
  createdAt: Date;
}

export interface ICall {
  _id: string;
  callingId: string;
  providerId: number;
  clientId: number;
  finishedAt: Date | null;
  backup: string[];
  chat: IMessage[];
  type: string;
  createdAt: Date;
}

export interface UserConnection {
  socketId: string;
  username: string;
}


export interface Room {
  _id: string;
  name: string;
  connections: UserConnection[];
}
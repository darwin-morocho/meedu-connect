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
  text = "text",
  image = "image",
  file = "file",
}

export interface IMessage {
  username: string;
  sender: boolean;
  value: string;
  type: IMessageType;
  createdAt: Date;
}

export interface UserConnection {
  socketId: string;
  username: string;
  cameraEnabled: boolean;
  microphoneEnabled: boolean;
}

export interface Room {
  _id: string;
  name: string;
  connections: UserConnection[];
}

export interface UserMediaStatus {
  socketId: string;
  microphoneEnabled: boolean;
  cameraEnabled: boolean;
}

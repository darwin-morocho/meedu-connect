import axios from 'axios';

export interface MeeduConnectAPIResponse {
  status: number;
  data: any;
}

export default class MeeduConnectAPI {
  private host!: string;
  constructor(host: string) {
    this.host = host;
  }

  async createRoom(data: { name: string; description?: string }): Promise<MeeduConnectAPIResponse> {
    try {
      const url = `${this.host}/api/v1/rooms/create`;
      const response = await axios({
        url,
        method: 'POST',
        data,
      });
      return { status: 200, data: response.data };
    } catch (e) {
      if (e.response) {
        return { status: e.response.status, data: e.response.data };
      }
      return { status: 500, data: e.message };
    }
  }

  async createUserToken(data: {
    username: string;
    userId?: string;
    extra?: any;
  }): Promise<MeeduConnectAPIResponse> {
    try {
      const url = `${this.host}/api/v1/users/create-token`;
      const response = await axios({
        url,
        method: 'POST',
        data,
        headers: {
          'Content-Type': 'application/json',
          apikey: '8jRKRv8530BQU32XkaAQnpPtGJC7hC7ONNomAiPSp0lqDRupqmc',
        },
      });
      return { status: 200, data: response.data.token };
    } catch (e) {
      if (e.response) {
        return { status: e.response.status, data: e.response.data };
      }
      return { status: 500, data: e.message };
    }
  }
}

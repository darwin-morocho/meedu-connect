import axios from "axios";

export interface MeeduConnectAPIResponse {
  status: number;
  data: any;
}

export default class MeeduConnectAPI {
  private host!: string;
  constructor(host: string) {
    this.host = host;
  }

  async createRoom(): Promise<MeeduConnectAPIResponse> {
    try {
      const url = `${this.host}/api/v1/rooms/create`;
      const response = await axios({
        url,
        method: "POST",
      });
      return { status: 200, data: response.data };
    } catch (e) {
      if (e.response) {
        return { status: e.response.status, data: e.response.data };
      }
      return { status: 500, data: e.message };
    }
  }
}

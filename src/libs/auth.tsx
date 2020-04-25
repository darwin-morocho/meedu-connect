import axios from "axios";
import moment from "moment";
import firebase from "../libs/firebase";
import { IUser } from "../models";
import { Modal, notification } from "antd";
import AES from "./aes";

const TOKEN = "TOKEN";
const USER = "USER";

interface SessionData {
  token: string;
  expiresIn: number;
}

interface LoginData {
  email: string;
  password: string;
}

declare global {
  interface Window {
    recaptchaVerifier: any;
    confirmationResult: firebase.auth.ConfirmationResult;
    recaptchaWidgetId: any;
  }
}

class Auth {
  private jwt: string | null = null;

  async checkPhone(phoneNumber: string): Promise<boolean> {
    try {
      const intoDb: boolean = await this.isPhoneInDb(phoneNumber);
      console.log("intoDb", intoDb);
      if (!intoDb) {
        return false;
      }
      const appVerifier = window.recaptchaVerifier;
      const result = await firebase
        .auth()
        .signInWithPhoneNumber(phoneNumber, appVerifier);
      console.log("result");
      window.confirmationResult = result;
      console.log("good");
      return true;
    } catch (e) {
      console.log("error");
      console.log(e);
      return false;
    }
  }

  async validatePIN(phoneNumber: string, code: string): Promise<boolean> {
    try {
      const userCredential = await window.confirmationResult.confirm(code);
      if (userCredential.user) {
        const idToken = await userCredential.user.getIdToken(true);

        const data = {
          phone: phoneNumber,
          jwtToken: this.jwt,
          fcm_token: "",
          idToken,
        };
        const encrypted = AES.encrypt(data, true);

        const response = await axios({
          method: "POST",
          url: `${process.env.REACT_APP_API_URL}/login-by-phone`,
          headers: {
            "Content-Type": "application/json",
            "app-id": process.env.REACT_APP_ID!,
          },
          data: {
            formData: encrypted,
          },
        });

        const decrypted = AES.decrypt(response.data.encrypted, true);
        const token = decrypted.token;
        await this.set({ token, expiresIn: 60 * 5 }); //5 minutes
        await this.getUser(token);
        return true;
      }

      return false;
    } catch (e) {
      console.log("error");
      console.log(e);
      if (e.response) {
        notification.error({
          message: "ERROR",
          description: e.response.data.message,
        });
      }
      return false;
    }
  }

  async isPhoneInDb(phoneNumber: string): Promise<boolean> {
    try {
      const encrypted = AES.encrypt(phoneNumber, false);

      const response = await axios({
        method: "POST",
        url: `${process.env.REACT_APP_API_URL}/is-phone-in-db`,
        headers: {
          "Content-Type": "application/json",
          "app-id": process.env.REACT_APP_ID!,
        },
        data: {
          phone: encrypted,
          isClient: true,
        },
      });
      this.jwt = response.data["token"];
      console.log("error ak");
      return true;
    } catch (e) {
      console.log("error akkaka", e);
      if (e.response) {
        notification.error({
          message: "ERROR",
          description: e.response.data.message,
        });
      }

      return false;
    }
  }

  async getUser(token: string) {
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/me`,
        {},
        {
          headers: {
            "x-access-token": token,
          },
        }
      );
      this.setUserData(response.data);
    } catch (e) {
      console.log("/me error:", e.message);
    }
  }

  // clear the session data
  logOut(): void {
    localStorage.removeItem(USER);
    localStorage.removeItem(TOKEN);
  }

  // get the user data saved in localStorage
  get user(): IUser | null {
    const data = localStorage.getItem(USER);
    if (data != null) {
      return JSON.parse(data);
    }
    return null;
  }

  // save the userData
  setUserData(data: any): void {
    localStorage.setItem(USER, JSON.stringify(data));
  }

  // save the session in localStorage
  private async set(data: SessionData): Promise<void> {
    localStorage.setItem(
      TOKEN,
      JSON.stringify({ ...data, createdAt: new Date() })
    );

    await this.registerToken(data.token);
  }

  async getAccessToken(): Promise<string | null> {
    const data = localStorage.getItem(TOKEN);
    if (data) {
      // get the session data
      const { token, expiresIn, createdAt } = JSON.parse(data);

      const currentDate = new Date();
      const tokenDate = new Date(createdAt);

      const diff = moment(currentDate).diff(tokenDate, "seconds");

      //diference in seconds
      console.log("diff", diff);
      console.log("expiresIn", expiresIn);
      if (expiresIn - diff >= 60) {
        // if the token is inside a valid time
        //console.log('Token aun valido')
        return token;
      }
      // if the the token is expired
      const newToken = await this.refreshToken(token);
      return newToken;
    }
    return null;
  }

  // get a new token from WS API
  private async refreshToken(expiredToken: string): Promise<string> {
    try {
      const response = await axios({
        method: "post",
        url: `${process.env.REACT_APP_WS_URL}/api/v1/refresh-token`,
        headers: {
          jwt: expiredToken,
        },
      });
      const { token, expiresIn } = response.data;
      this.set({ token, expiresIn }); // saves the data in the localStorage
      return token;
    } catch (error) {
      console.log("refreshToke error", error);
      if (error.response && error.response.status) {
        console.log("refreshToke error.response", error.response);
      }
      throw new Error(error.message);
    }
  }

  // save the token into db
  private async registerToken(token: string): Promise<void> {
    await axios({
      method: "post",
      url: `${process.env.REACT_APP_WS_URL}/api/v1/new-refresh-token`,
      headers: {
        "Content-Type": "application/json",
        jwt: token,
      },
    });
  }
}

export default new Auth();

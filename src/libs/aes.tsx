import CryptoJS from "crypto-js";

export default class AES {
  static encrypt(data: any, isJSON: boolean = false): string {
    return CryptoJS.AES.encrypt(
      isJSON ? JSON.stringify(data) : data,
      process.env.REACT_APP_CRYPTO_SECRET!
    ).toString();
  }

  static decrypt(encrypted: string, isJSON: boolean = false): any {
    const decryptedString: string = CryptoJS.AES.decrypt(
      encrypted,
      process.env.REACT_APP_CRYPTO_SECRET!
    ).toString(CryptoJS.enc.Utf8);
    return isJSON ? JSON.parse(decryptedString) : decryptedString;
  }
}

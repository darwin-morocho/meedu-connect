import React from "react";
import styled from "styled-components";
import phone from "phone";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import Loading from "../components/loading";
import auth from "../libs/auth";
import { notification, Button, message, Input } from "antd";
import firebase from "../libs/firebase";

const Container = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100vh;

  .react-tel-input .selected-flag {
    width: 50px;
    padding: 0 0 0 15px;
  }

  .react-tel-input .form-control {
    height: 50px;
    padding-left: 69px;
    font-size: 20px;
  }

  button {
    width: 100%;
  }
`;

enum LoginStep {
  input,
  verify,
}

export default class Login extends React.PureComponent<{
  history: any;
}> {
  recaptcha: any;
  state = {
    phoneNumber: "",
    fetching: false,
    step: LoginStep.input,
    captchaOk: false,
    phoneOk: false,
    pin: "",
  };

  submit = async (e: any) => {
    e.preventDefault();
  };

  async componentDidMount() {
    const accessToken = await auth.getAccessToken();
    if (accessToken !== null) {
      window.location.href = "/home";
    }

    window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier(
      this.recaptcha,
      {
        size: "normal",
        callback: (response: any) => {
          // reCAPTCHA solved, allow signInWithPhoneNumber.
          // ...
          this.setState({ captchaOk: true });
        },
        "expired-callback": () => {
          this.setState({ captchaOk: false });
          // Response expired. Ask user to solve reCAPTCHA again.
          // ...
        },
      }
    );
    window.recaptchaVerifier.render().then((widgetId: any) => {
      window.recaptchaWidgetId = widgetId;
    });
  }

  checkPhone = async (phoneNumber: string) => {
    const appVerifier = window.recaptchaVerifier;
    const result = await firebase
      .auth()
      .signInWithPhoneNumber(phoneNumber, appVerifier);
  };

  render() {
    const { fetching, phoneNumber, step, captchaOk, phoneOk, pin } = this.state;
    return (
      <Container>
        <img src={require("../assets/login.svg")} />
        <div className="ma-left-40" style={{ maxWidth: 350 }}>
          <h1 className="fw-300 t-center bold">Iniciar Sesión</h1>
          {step !== LoginStep.verify && (
            <PhoneInput
              country={"ec"}
              value={phoneNumber}
              onChange={(v) => {
                const isOk = phone(`+${v}`).length > 0;
                this.setState({ phoneNumber: v, phoneOk: isOk });
              }}
            />
          )}

          {step == LoginStep.verify && (
            <>
              <p>Ingrese el PIN enviado por sms al +{phoneNumber}</p>
              <Input
                size="large"
                placeholder="· · · · · ·"
                maxLength={6}
                className="t-center f-30"
                style={{ letterSpacing: 8 }}
                onChange={(e) => {
                  this.setState({ pin: e.target.value });
                }}
              />
              <Button
                type="primary"
                size="large"
                disabled={pin.trim().length !== 6}
                className="ma-top-10"
                onClick={async () => {
                  this.setState({ fetching: true });
                  const isOk = await auth.validatePIN(`+${phoneNumber}`, pin);
                  this.setState({ fetching: false });
                  if (isOk) {
                    window.location.href = "/home";
                  }
                }}
              >
                VERIFICAR CÓDIGO
              </Button>
            </>
          )}

          <div
            style={{ marginTop: 10 }}
            className={step === LoginStep.verify ? "d-none" : ""}
            ref={(ref) => (this.recaptcha = ref)}
          ></div>
          <br />
          {step === LoginStep.input && (
            <Button
              size="large"
              type="primary"
              disabled={!captchaOk || !phoneOk}
              onClick={async () => {
                this.setState({ fetching: true, pin: "" });
                console.log("phone", phoneNumber);
                const sent = await auth.checkPhone(`+${phoneNumber}`);
                if (!sent) {
                  message.error("No se pudo enviar el sms de confirmación.");
                }
                this.setState({
                  step: sent ? LoginStep.verify : LoginStep.input,
                  fetching: false,
                });
              }}
            >
              INGRESAR
            </Button>
          )}

          <br />
          <br />
          <div style={{ textAlign: "center", marginTop: 15, letterSpacing: 1 }}>
            Powered by <b>ITZAM</b>
            <br />
            <small>www.itzam.ec</small>
          </div>
        </div>

        <Loading open={fetching} />
      </Container>
    );
  }
}

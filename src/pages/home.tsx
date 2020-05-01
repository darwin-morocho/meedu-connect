/* eslint-disable no-unused-vars */
import "webrtc-adapter";
import React from "react";
import Lottie from "react-lottie";
import Template from "../components/template";
import { inject, observer } from "mobx-react";

import "../sass/home.scss";
import { Button } from "antd";
import Loading from "../components/loading";
import MeetingContent from "../components/meeting-content";
import LocalUser from "../components/local-user";
import NoJoined from "../components/no-joined";
import { HomeStore } from "../mobx/home-state";

const config = {
  iceServers: [
    { urls: ["stun:stun.l.google.com:19302"] },
    {
      urls: ["turn:95.217.132.49:80?transport=udp"],
      username: "bdb5f88b",
      credential: "64e9eac4",
    },
    {
      urls: ["turn:95.217.132.49:80?transport=tcp"],
      username: "bdb5f88b",
      credential: "64e9eac4",
    },
  ],
};

@inject("homeStore")
@observer
export default class Home extends React.PureComponent<{
  homeStore: HomeStore;
  history: any;
}> {
  componentDidMount() {
    // get code from url
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    if (code) {
      this.props.homeStore.meetCode = code;
    }

    const username = localStorage.getItem("username");
    if (username) {
      this.props.homeStore.username = username;
    }
  }

  join = () => {
    this.props.homeStore.join();
  };

  leave = () => {
    this.props.homeStore.leave();
  };

  render() {
    const {
      connected,
      room,
      loading,
      hasScreenSharing,
      iAmSharingScreen,
    } = this.props.homeStore;

    return (
      <Template>
        {!connected && (
          <div id="username-container">
            {!room && (
              <div>
                <Lottie
                  options={{
                    autoplay: true,
                    animationData: require("../assets/lottie/developer.json"),
                  }}
                  width={200}
                  height={250}
                />
                <div className="d-flex">
                  <input
                    defaultValue={localStorage.getItem("username") || ""}
                    onChange={(e) => {
                      this.props.homeStore.username = e.target.value;
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        this.join();
                      }
                    }}
                    placeholder="Tu nombre de usuario"
                  />
                  <button className="join" onClick={this.join}>
                    CONECTARME
                  </button>
                </div>
              </div>
            )}
            {room && (
              <div className="t-center">
                <Lottie
                  options={{
                    autoplay: true,
                    animationData: require("../assets/lottie/no-internet-animation.json"),
                  }}
                  width={200}
                  height={250}
                />
                <h2 className="f-20 bold">Se perdio la conexión</h2>
                <p>
                  Te uniras automaticamente al meet en un momento.
                  <br />
                  Si el problema persiste revisa tu conexión.
                </p>
                <br />
                <Button type="danger" size="large" onClick={this.leave}>
                  ABANDONAR EL MEET
                </Button>
              </div>
            )}
          </div>
        )}

        {connected && (
          <div id="main">
            {/* START LOCAL */}
            <div id="local" className="d-flex flex-column">
              {/* START HEADER */}
              <div className="section-header d-flex jc-space-between ai-center">
                <div id="status">
                  <div
                    style={{
                      backgroundColor: connected ? "#00C853" : "#F50057",
                    }}
                  ></div>
                  <span className="d-none-480">
                    {connected ? "Conectado " : "Desconectado"}
                  </span>
                </div>

                <div>
                  <Button
                    shape="circle"
                    size="large"
                    icon={
                      <img
                        width="20"
                        src="https://image.flaticon.com/icons/svg/271/271221.svg"
                      />
                    }
                  />
                  <Button
                    type="primary"
                    size="large"
                    shape="round"
                    className="ma-left-20"
                    onClick={
                      room
                        ? () =>
                            this.props.homeStore.shareMeet(
                              this.props.homeStore.meeduConnect.room
                            )
                        : this.props.homeStore.showCreateMeetModal
                    }
                  >
                    {room ? "compartir meet" : "Crear meet"}
                  </Button>
                </div>
              </div>
              {/* END HEADER */}

              {/* START CONNECTIONS VIDEO */}
              <MeetingContent />
              {/* END CONNECTIONS VIDEO */}
              {/* CURRENT USER */}
              <LocalUser
                ref={(ref) => {
                  this.props.homeStore.localUser = ref;
                }}
              />
              {/* END CURRENT USER */}
            </div>
            {/* END LOCAL */}
            <div id="board" className={room ? 'd-none-768' : ""}>
              <NoJoined
                ref={(ref) => {
                  this.props.homeStore.noJoinedRef = ref;
                }}
              />
            </div>
          </div>
        )}
        <Loading open={loading} />
      </Template>
    );
  }
}

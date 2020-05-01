import React from "react";
import { Room } from "../models";
import UserMediaStatusView from "./user-media-status-view";
import Lottie from "react-lottie";
import MeeduConnect from "../libs/video-call";
import { message } from "antd";
import { inject, observer } from "mobx-react";
import { HomeStore } from "../mobx/home-state";

@inject("homeStore")
@observer
export default class Meeting extends React.PureComponent<{
  homeStore?: HomeStore;
}> {
  meetCode = "";

  constructor(props: any) {
    super(props);
    this.meetCode = this.props.homeStore!.meetCode;
  }

  joinToMeet = () => {
    if (!this.props.homeStore!.meeduConnect.connected) {
      message.error("No estas conectado al servicio de meedu connect");
      return;
    }
    if (this.meetCode.trim().length > 0) {
      this.props.homeStore!.meeduConnect.joinToRoom(this.meetCode);
      message.info("Uniendose al Meet");
    } else {
      message.info("Código inválido");
    }
  };

  render() {
    const {
      room,
      videoRefs,
      hasScreenSharing,
      iAmSharingScreen,
    } = this.props.homeStore!;
    return (
      <div
        className={`flex-1 ${
          !room || room.connections.length == 0
            ? "  d-flex ai-center jc-center"
            : ""
        }`}
        style={{ overflowY: "auto" }}
      >
        {(!room || room.connections.length == 0) && (
          <div className="pre-joined">
            <Lottie
              options={{
                autoplay: true,
                animationData: require("../assets/lottie/developer.json"),
              }}
              height={200}
            />
            <h3 className="pa-hor-20 t-center">
              {!room
                ? "ingresa tu código para unirte a un meet"
                : "Aún no hay usuarios conectados"}
            </h3>
            {!room && (
              <div className="input-meet-code d-flex w-100">
                <input
                  defaultValue={this.meetCode}
                  onChange={(e) => {
                    this.meetCode = e.target.value;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      this.joinToMeet();
                    }
                  }}
                  style={{ letterSpacing: 1 }}
                />
                <button className="join f-20" onClick={this.joinToMeet}>
                  INGRESAR
                </button>
              </div>
            )}
          </div>
        )}

        <div
          id="screen-shared"
          className={hasScreenSharing && !iAmSharingScreen ? "" : "d-none"}
        >
          <video
            ref={(ref) => {
              this.props.homeStore!.screenShraingRef = ref;
            }}
            muted
            autoPlay
            playsInline
          />

          <button
            className="circle-button"
            onClick={() => {
              this.props.homeStore!.screenSharedToFullScreen();
            }}
          >
            <img src={require("../assets/full-screen.svg")} alt="" />
          </button>
        </div>

        <div
          id="conections"
          className={
            !hasScreenSharing || iAmSharingScreen
              ? "d-flex flex-wrap"
              : "d-none"
          }
        >
          {room &&
            room.connections.map((item) => (
              <div key={item.socketId} className="remote-video">
                <video
                  id={`video-${item.socketId}`}
                  ref={(ref) => {
                    if (!ref) return;
                    if (!videoRefs.has(item.socketId)) {
                      videoRefs.set(item.socketId, ref);
                    }
                  }}
                  autoPlay
                  muted={false}
                  playsInline
                />
                <UserMediaStatusView {...item} />
                <div className="username">{item.username}</div>
              </div>
            ))}
        </div>
      </div>
    );
  }
}

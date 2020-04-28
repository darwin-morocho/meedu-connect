import React from "react";
import { Room } from "../models";
import UserMediaStatusView from "./user-media-status-view";
import Lottie from "react-lottie";
import MeeduConnect from "../libs/video-call";
import { message } from "antd";

export default class Meeting extends React.PureComponent<{
  room: Room | null;
  meeduConnect: MeeduConnect;
  videoRefs: Map<string, HTMLVideoElement>;
  meetCode: string;
}> {
  meetCode = "";

  constructor(props: any) {
    super(props);
    this.meetCode = this.props.meetCode;
  }

  joinToMeet = () => {
    if (!this.props.meeduConnect.connected) {
      message.error("No estas conectado al servicio de meedu connect");
      return;
    }
    if (this.meetCode.trim().length > 0) {
      this.props.meeduConnect.joinToRoom(this.meetCode);
      message.info("Uniendose al Meet");
    } else {
      message.info("Código inválido");
    }
  };

  render() {
    const { room, videoRefs } = this.props;
    return (
      <div className="flex-1 ma-ver-10" style={{ overflowY: "auto" }}>
        {(!room || room.connections.length == 0) && (
          <div className="ma-top-30">
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
                  style={{ letterSpacing: 1 }}
                />
                <button className="join f-20" onClick={this.joinToMeet}>
                  INGRESAR
                </button>
              </div>
            )}
          </div>
        )}

        <div id="conections" className="d-flex flex-wrap">
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

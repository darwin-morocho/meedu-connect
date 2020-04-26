/* eslint-disable no-unused-vars */
import "webrtc-adapter";
import React from "react";
import io from "socket.io-client";
import auth from "../libs/auth";

import Template from "../components/template";
import meeduConnect, { UserConnection } from "../libs/video-call";
import MenuItem from "antd/lib/menu/MenuItem";
import "../sass/home.scss";
import { Dropdown, Button, Menu, message, Modal, Input } from "antd";
import { MoreOutlined } from "@ant-design/icons";

export default class Home extends React.PureComponent<
  {
    history: any;
  },
  {
    permissionsOK: boolean;
    request: any;
    connecting: boolean;
    connected: boolean;
    joined: boolean;
    connections: string[];
  }
> {
  localVideo: HTMLVideoElement | null = null;
  videoRefs = new Map<string, HTMLVideoElement>();
  state = {
    permissionsOK: false,
    request: null,
    callingId: null,
    connected: false,
    uploads: [],
    messages: [],
    connecting: true,
    joined: false,
    connections: [] as string[],
  };

  async componentDidMount() {
    const token = await auth.getAccessToken();
    if (token) {
      await meeduConnect.init({
        stHost: process.env.REACT_APP_MEEDU_CONNECT_HOST!,
        token,
      });

      if (meeduConnect.permissionGranted) {
        this.setState({ permissionsOK: true });
        this.localVideo!.srcObject = meeduConnect.localStream!;
      }

      meeduConnect.onConnected = (socketId: string) => {
        console.log("socketId:", socketId);
        this.setState({ connected: true });
      };

      meeduConnect.onConnectError = () => {
       // message.error("No se pudo conectar al servicio de meedu connect");
      };

      meeduConnect.onDisconnected = () => {
        console.log("disconnected");
        this.setState({ connected: false });
      };

      meeduConnect.onDisconnectedUser = (socketId: string) => {
        this.videoRefs.delete(socketId);

        console.log("disconnected user jaja:", socketId);
        const { connections } = this.state;
        console.log("before", connections);
        const index = connections.findIndex((item) => item === socketId);
        console.log("connection index", index);
        if (index !== -1) {
          const tmp = [...connections];
          console.log("after", tmp);
          tmp.splice(index, 1);
          this.setState({ connections: tmp });
        }
      };

      meeduConnect.onJoined = (data) => {
        message.info(`user joined  ${data.username}`);
        this.setState({
          joined: true,
          connections: this.state.connections.concat([data.socketId]),
        });
      };

      meeduConnect.onJoinedTo = (data) => {
        console.log("Connected users", data.connectedUsers);
        message.info(`joined  to ${data.roomName}`);
        const connections: string[] = [];
        data.connectedUsers.forEach((item) => {
          connections.push(item.socketId);
        });
        this.setState({ joined: true, connections });
      };

      meeduConnect.onRoomNotFound = (roomName: string) => {
        Modal.error({
          title: "Meet no encontrado",
          content: <div>{roomName}</div>,
          okText: "ACEPTAR",
        });
      };

      meeduConnect.onRemoteStream = (data) => {
        if (this.videoRefs.has(data.socketId)) {
          const ref = this.videoRefs.get(data.socketId);
          ref!.srcObject = data.stream;
          // ref!.play();
        }
      };
    }
  }

  createMeet = async (): Promise<void> => {
    const response = await meeduConnect.createRoom();

    if (response.status == 200) {
      meeduConnect.joinToRoom(response.data);
    } else {
      message.info(response.data);
    }
  };

  joinToMeet = () => {
    if (!meeduConnect.connected) {
      message.error("No estas conectado al servicio de meedu connect");
      return;
    }

    let room = "";

    const modal = Modal.success({
      width: 600,
      title: "Compartir Meet",
      maskClosable: true,
      okCancel: false,

      content: (
        <div>
          <Input
            onChange={(e) => {
              room = e.target.value;
            }}
          />
        </div>
      ),
      centered: true,
      okText: "UNIRSE",
      onOk: () => {
        if (room.trim().length > 0) {
          meeduConnect.joinToRoom(room);
          message.info("Uniendose al room");
        } else {
          message.info("Room inválido");
        }
      },
    });
  };

  shareMeet = async () => {
    if (!meeduConnect.room) {
      message.error("room null");
      return;
    }
    // meeduConnect.room;

    const modal = Modal.success({
      width: 600,
      title: "Compartir Meet",
      maskClosable: true,
      okCancel: false,
      className: "ant-modal-confirm-btns-hide",
      content: (
        <div className="ma-bottom-10">
          <Input
            value={meeduConnect.room}
            readOnly
            addonAfter={
              <Button
                type="link"
                size="small"
                onClick={() => {
                  navigator.clipboard.writeText(meeduConnect.room!);
                  message.info("Copiado");
                  modal.destroy();
                }}
              >
                COPIAR
              </Button>
            }
          />
        </div>
      ),
      centered: true,
    });
  };

  leave = () => {
    meeduConnect.leaveRoom();
    this.videoRefs.clear();
    this.setState({ joined: false, connections: [] });
  };

  render() {
    const { connected, joined, connections } = this.state;
    return (
      <Template>
        <div id="main">
          <div id="chat" className="d-none-768"></div>
          <div id="local">
            <div className="section-header d-flex jc-space-between ai-center">
              <div id="status">
                <div
                  style={{ backgroundColor: connected ? "#00C853" : "#F50057" }}
                ></div>
                <span>{connected ? "Conectado" : "Desconectado"}</span>
              </div>
              <Dropdown
                overlay={
                  <Menu>
                    <Menu.Item
                      onClick={joined ? this.shareMeet : this.createMeet}
                    >
                      {joined ? "compartir meet" : "Crear meet"}
                    </Menu.Item>
                    {!joined && (
                      <Menu.Item onClick={this.joinToMeet}>
                        Unirme a un meet
                      </Menu.Item>
                    )}
                  </Menu>
                }
                placement="bottomRight"
              >
                <Button
                  type="dashed"
                  size="large"
                  shape="circle"
                  icon={<MoreOutlined />}
                />
              </Dropdown>
            </div>

            <div className="d-flex flex-wrap">
              {connections.map((socketId) => (
                <div key={socketId} className="ma-10">
                  <video
                    id={`video-${socketId}`}
                    ref={(ref) => {
                      if (!this.videoRefs.has(socketId)) {
                        this.videoRefs.set(socketId, ref!);
                      }
                    }}
                    autoPlay
                    muted={false}
                    playsInline
                    className="remote-video"
                  />
                </div>
              ))}
            </div>

            <video
              id="local-video"
              ref={(ref) => (this.localVideo = ref)}
              playsInline
              autoPlay
              muted
            />
            <div id="call-actions" className={joined ? "" : "d-none"}>
              <button className="circle-button primary">
                <img src={require("../assets/microphone.svg")} width="40" />
              </button>
              <button
                onClick={this.leave}
                className="circle-button accent large ma-hor-20"
              >
                <img src={require("../assets/end-call.svg")} width="40" />
              </button>

              <button className="circle-button">
                <img
                  src={require("../assets/video-camera.svg")}
                  width="40"
                  style={{ color: "#000" }}
                />
              </button>
            </div>
          </div>
          <div id="board" className="d-none-768"></div>
        </div>
      </Template>
    );
  }
}

/* eslint-disable no-unused-vars */
import "webrtc-adapter";
import React from "react";
import auth from "../libs/auth";
import Lottie from "react-lottie";
import Template from "../components/template";
import MeeduConnect from "../libs/video-call";
import MenuItem from "antd/lib/menu/MenuItem";
import "../sass/home.scss";
import {
  Dropdown,
  Button,
  Menu,
  message,
  Modal,
  Input,
  notification,
} from "antd";
import { CopyOutlined } from "@ant-design/icons";
import Loading from "../components/loading";
import { Room } from "../models";
import UserMediaStatusView from "../components/user-media-status-view";
import MeetingContent from "../components/meeting-content";
import LocalUser from "../components/local-user";

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

export default class Home extends React.PureComponent<
  {
    history: any;
  },
  {
    permissionsOK: boolean;
    loading: boolean;
    connecting: boolean;
    connected: boolean;
    room: Room | null;
    cameraEnabled: boolean;
    microphoneEnabled: boolean;
    username: string;
  }
> {
  private meeduConnect!: MeeduConnect;

  localUser: LocalUser | null = null;

  videoRefs = new Map<string, HTMLVideoElement>();
  state = {
    username: "",
    permissionsOK: false,
    loading: false,
    connected: false,
    connecting: true,
    joined: false,
    room: null as Room | null,
    microphoneEnabled: true,
    cameraEnabled: true,
  };

  meetCode = "";
  wasJoined = false;

  componentDidMount() {
    // get code from url
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    if (code) {
      this.meetCode = code;
    }
  }

  setLocalStream = () => {
    setTimeout(() => {
      if (this.localUser) {
        this.localUser.localVideo!.srcObject = this.meeduConnect.localStream!;
      }
    }, 300);
  };

  init = async () => {
    this.meeduConnect = new MeeduConnect({
      config,
      username: this.state.username,
    });
    this.setState({ loading: true });
    const token = await auth.getAccessToken();
    if (token) {
      await this.meeduConnect.init({
        wsHost: process.env.REACT_APP_MEEDU_CONNECT_HOST!,
        token,
      });

      if (this.meeduConnect.permissionGranted) {
        this.setState({ permissionsOK: true });
      }

      this.meeduConnect.onConnected = (socketId: string) => {
        const { room } = this.state;
        if (!room) {
          // if the user is not connected yet to one room
          console.log("socketId:", socketId);
          this.setState({ connected: true, loading: false });
          this.setLocalStream();
        } else {
          this.meeduConnect.joinToRoom(room._id);
          this.setState({ connected: true });
          this.setLocalStream();
        }
      };

      this.meeduConnect.onConnectError = () => {
        const { loading, connected } = this.state;
        if (loading && !connected) {
          this.setState({ loading: false });
          notification.error({
            message: "ERROR",
            description:
              "No se puedo conectar el servicio de Meedu Connect. Revisa tu conexíon e intenta nuevamente.",
            placement: "bottomRight",
          });
        } else if (connected) {
          this.setState({ connected: false });
          notification.error({
            message: "ERROR",
            description: "No se puedo conectar el servicio de Meedu Connect",
            placement: "bottomRight",
          });
        }

        // message.error("No se pudo conectar al servicio de meedu connect");
      };

      this.meeduConnect.onDisconnected = () => {
        console.log("disconnected");
        this.meeduConnect.leaveRoom();
        this.videoRefs.clear();
        const tmp = this.state.room;
        if (tmp) {
          tmp.connections = [];
          this.setState({ connected: false, room: { ...tmp } });
        } else {
          this.setState({ connected: false });
        }
      };

      this.meeduConnect.onDisconnectedUser = (socketId: string) => {
        const deleted = this.videoRefs.delete(socketId);
        console.log("deleted" + socketId, deleted);

        console.log("disconnected user jaja:", socketId);
        const { room } = this.state;
        if (room) {
          const index = room.connections.findIndex(
            (item) => item.socketId === socketId
          );
          console.log("connection index", index);
          if (index !== -1) {
            const tmp = room;
            console.log("after", tmp);
            tmp.connections.splice(index, 1);
            this.setState({ room: { ...tmp } });
          }
        }
      };

      this.meeduConnect.onJoined = (data) => {
        message.info(`Usuario conectado: ${data.username}`);
        const { room } = this.state;
        if (room) {
          const tmp = room;
          console.log("after", tmp);
          tmp.connections.push(data);
          this.setState({
            room: { ...tmp },
          });
        }
      };

      this.meeduConnect.onJoinedTo = (data) => {
        console.log("Connected users", data.connections);
        message.success(`Conectado a: ${data.name}`);
        this.setState({ room: data });
      };

      this.meeduConnect.onRoomNotFound = (roomId: string) => {
        Modal.error({
          title: "Meet no encontrado",
          content: <div>{roomId}</div>,
          okText: "ACEPTAR",
        });
      };

      this.meeduConnect.onRemoteStream = (data) => {
        setTimeout(() => {
          if (this.videoRefs.has(data.socketId)) {
            const ref = this.videoRefs.get(data.socketId);
            ref!.srcObject = data.stream;
          }
        }, 500);
      };

      this.meeduConnect.onUserMediaStatusChanged = (data) => {
        const { room } = this.state;
        if (room) {
          const index = room.connections.findIndex(
            (item) => item.socketId === data.socketId
          );
          if (index !== -1) {
            room.connections[index].cameraEnabled = data.cameraEnabled;
            room.connections[index].microphoneEnabled = data.microphoneEnabled;
            this.setState({ room: { ...room } });
          }
        }
      };
    }
  };

  showCreateMeetModal = () => {
    let name = "",
      description = "";
    Modal.success({
      width: 600,
      title: "Compartir Meet",
      maskClosable: false,
      okCancel: true,
      okText: "CREAR",
      cancelText: "CANCELAR",
      content: (
        <div className="ma-bottom-10 ma-top-20">
          <Input
            size="large"
            placeholder="Nombre para el Meet"
            onChange={(e) => {
              name = e.target.value;
            }}
          />
          <Input.TextArea
            className="ma-top-10"
            onChange={(e) => {
              description = e.target.value;
            }}
            placeholder="Añade una descripción (opcional)"
          />
        </div>
      ),
      centered: true,
      onOk: () => {
        this.createMeet({ name, description });
      },
    });
  };

  createMeet = async (data: {
    name: string;
    description: string;
  }): Promise<void> => {
    if (data.name.trim().length == 0) {
      message.error("Nombre para el Meet inválido");
      return;
    }
    this.setState({ loading: true });
    const response = await this.meeduConnect.createRoom(data);
    this.setState({ loading: false });
    if (response.status == 200) {
      this.shareMeet(response.data);
    } else {
      message.info(response.data);
    }
  };

  joinToMeet = () => {
    if (!this.meeduConnect.connected) {
      message.error("No estas conectado al servicio de meedu connect");
      return;
    }
    if (this.meetCode.trim().length > 0) {
      this.meeduConnect.joinToRoom(this.meetCode);
      message.info("Uniendose al Meet");
    } else {
      message.info("Código inválido");
    }
  };

  shareMeet = async (room: Room | null) => {
    if (!room) {
      message.error("Meet null");
      return;
    }
    // this.meeduConnect.room;

    const url = `${window.location.href}?code=${room._id}`;

    const modal = Modal.success({
      width: 792,
      title: (
        <p>
          <span className="bold">Meet: </span>
          {room.name}
        </p>
      ),
      maskClosable: true,
      okCancel: false,
      className: "ant-modal-confirm-btns-hide",
      content: (
        <div>
          <div className="d-flex">
            <Input
              className="border-radius-zero"
              value={room._id}
              readOnly
              size="large"
              addonBefore="CÓDIGO:"
            />
            <Button
              type="primary"
              size="large"
              className="pa-hor-20 border-radius-zero"
              onClick={() => {
                navigator.clipboard.writeText(room._id);
                message.info("Copiado");
                modal.destroy();
              }}
            >
              <CopyOutlined /> Copiar
            </Button>
          </div>

          <div className="ma-bottom-20  ma-top-10 d-flex">
            <Input
              className="border-radius-zero"
              value={url}
              readOnly
              size="large"
              addonBefore="URL:"
            />
            <Button
              type="primary"
              size="large"
              className="pa-hor-20 border-radius-zero"
              onClick={() => {
                navigator.clipboard.writeText(url);
                message.info("Copiado");
                modal.destroy();
              }}
            >
              <CopyOutlined /> Copiar
            </Button>
          </div>
        </div>
      ),
      centered: true,
    });
  };

  leave = () => {
    this.meeduConnect.leaveRoom();
    this.videoRefs.clear();
    this.meetCode = "";
    this.setState({ room: null });
  };

  render() {
    const { connected, room, loading, username } = this.state;

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
                  width={400}
                  height={300}
                />
                <div className="d-flex">
                  <input
                    onChange={(e) => {
                      this.setState({
                        username: e.target.value,
                      });
                    }}
                    placeholder="Tu nombre de usuario"
                  />
                  <button
                    className="join"
                    onClick={() => {
                      if (username.trim().length == 0) {
                        notification.error({
                          message: "ERROR",
                          description: "Nombre de usuario inválido",
                          placement: "bottomRight",
                        });
                        return;
                      }
                      this.init();
                    }}
                  >
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
                  width={400}
                  height={300}
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
            <div id="chat" className="d-none-768"></div>

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
                        ? () => this.shareMeet(this.meeduConnect.room)
                        : this.showCreateMeetModal
                    }
                  >
                    {room ? "compartir meet" : "Crear meet"}
                  </Button>
                </div>
              </div>
              {/* END HEADER */}

              {/* START CONNECTIONS VIDEO */}
              <MeetingContent
                room={room}
                meeduConnect={this.meeduConnect}
                videoRefs={this.videoRefs}
                meetCode={this.meetCode}
              />
              {/* END CONNECTIONS VIDEO */}
              <div
                style={{ height: 1, width: "100%", backgroundColor: "#ccc" }}
              />
              {/* CURRENT USER */}
              <LocalUser
                ref={(ref) => {
                  this.localUser = ref;
                }}
                room={room}
                meeduConnect={this.meeduConnect}
                onLeave={this.leave}
              />
              {/* END CURRENT USER */}
            </div>
            {/* END LOCAL */}
            <div id="board" className="d-none-768"></div>
          </div>
        )}
        <Loading open={loading} />
      </Template>
    );
  }
}

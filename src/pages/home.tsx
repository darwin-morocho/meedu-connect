/* eslint-disable no-unused-vars */
import "webrtc-adapter";
import React from "react";
import auth from "../libs/auth";
import Lottie from "react-lottie";
import Template from "../components/template";
import meeduConnect from "../libs/video-call";
import MenuItem from "antd/lib/menu/MenuItem";
import "../sass/home.scss";
import { Dropdown, Button, Menu, message, Modal, Input } from "antd";
import { CopyOutlined } from "@ant-design/icons";
import Loading from "../components/loading";
import { Room } from "../models";

export default class Home extends React.PureComponent<
  {
    history: any;
  },
  {
    permissionsOK: boolean;
    loading: boolean;
    connecting: boolean;
    connected: boolean;
    joined: boolean;
    connections: string[];
    cameraEnabled: boolean;
    microphoneEnabled: boolean;
  }
> {
  localVideo: HTMLVideoElement | null = null;
  videoRefs = new Map<string, HTMLVideoElement>();
  state = {
    permissionsOK: false,
    loading: false,
    connected: false,
    connecting: true,
    joined: false,
    microphoneEnabled: true,
    cameraEnabled: true,
    connections: [] as string[],
  };

  meetCode = "";

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
        message.info(`Usuario conectado: ${data.username}`);
        this.setState({
          joined: true,
          connections: this.state.connections.concat([data.socketId]),
        });
      };

      meeduConnect.onJoinedTo = (data) => {
        console.log("Connected users", data.connections);
        message.success(`Conectado a: ${data.name}`);
        const connections: string[] = [];
        data.connections.forEach((item) => {
          connections.push(item.socketId);
        });
        this.setState({ joined: true, connections });
      };

      meeduConnect.onRoomNotFound = (roomId: string) => {
        Modal.error({
          title: "Meet no encontrado",
          content: <div>{roomId}</div>,
          okText: "ACEPTAR",
        });
      };

      meeduConnect.onRemoteStream = (data) => {
        if (this.videoRefs.has(data.socketId)) {
          const ref = this.videoRefs.get(data.socketId);
          ref!.srcObject = data.stream;
        }
      };
    }
  }

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
    const response = await meeduConnect.createRoom(data);
    this.setState({ loading: false });
    if (response.status == 200) {
      this.shareMeet(response.data);
    } else {
      message.info(response.data);
    }
  };

  joinToMeet = () => {
    if (!meeduConnect.connected) {
      message.error("No estas conectado al servicio de meedu connect");
      return;
    }
    if (this.meetCode.trim().length > 0) {
      meeduConnect.joinToRoom(this.meetCode);
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
    // meeduConnect.room;

    const modal = Modal.success({
      width: 600,
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
        <div className="ma-bottom-20 d-flex">
          <Input className="border-radius-zero" value={room._id} readOnly size="large" addonBefore="ID:" />
          <Button
            type="primary"
            size="large"
            className="pa-hor-20 border-radius-zero"
            onClick={() => {
              navigator.clipboard.writeText(room.name!);
              message.info("Copiado");
              modal.destroy();
            }}
          >
            <CopyOutlined /> Copiar
          </Button>
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

  MicrophoneButton = () => {
    const { microphoneEnabled } = this.state;
    return (
      <button
        className="circle-button"
        onClick={() => {
          meeduConnect.microphone(!microphoneEnabled);
          this.setState({
            microphoneEnabled: !microphoneEnabled,
          });
        }}
      >
        <img
          src={
            microphoneEnabled
              ? require("../assets/microphone.svg")
              : require("../assets/microphone-off.svg")
          }
          width="40"
        />
      </button>
    );
  };

  CameraButton = () => {
    const { cameraEnabled } = this.state;
    return (
      <button
        className="circle-button"
        onClick={() => {
          meeduConnect.camera(!cameraEnabled);
          this.setState({ cameraEnabled: !cameraEnabled });
        }}
      >
        <img
          src={
            cameraEnabled
              ? require("../assets/video-camera.svg")
              : require("../assets/video-camera-off.svg")
          }
          width="40"
          style={{ color: "#000" }}
        />
      </button>
    );
  };

  ScreenShareButton = () => (
    <button
      className="circle-button ma-left-10"
      onClick={() => {
        meeduConnect.screenShare();
      }}
    >
      <img
        src="https://image.flaticon.com/icons/svg/808/808574.svg"
        width="40"
      />
    </button>
  );

  render() {
    const {
      connected,
      joined,
      connections,
      loading,
      cameraEnabled,
      microphoneEnabled,
    } = this.state;
    return (
      <Template>
        <div id="main">
          <div id="chat" className="d-none-768"></div>

          {/* START LOCAL */}
          <div id="local" className="d-flex flex-column">
            {/* START HEADER */}
            <div className="section-header d-flex jc-space-between ai-center">
              <div id="status">
                <div
                  style={{ backgroundColor: connected ? "#00C853" : "#F50057" }}
                ></div>
                <span>{connected ? "Conectado" : "Desconectado"}</span>
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
                    joined
                      ? () => this.shareMeet(meeduConnect.room)
                      : this.showCreateMeetModal
                  }
                >
                  {joined ? "compartir meet" : "Crear meet"}
                </Button>
              </div>
            </div>
            {/* END HEADER */}

            <div className="flex-1"></div>

            <div className="d-flex">
              <div id="local-container">
                {/* LOCAL VIDEO */}
                <video
                  id="local-video"
                  ref={(ref) => (this.localVideo = ref)}
                  playsInline
                  autoPlay
                  muted
                />
                {/* END LOCAL VIDEO */}

                {/* <div id="conections" className="d-flex flex-wrap">
                  {connections.map((socketId) => (
                    <div key={socketId} className="remote-video">
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
                      />
                    </div>
                  ))}
                </div> */}
              </div>

              {!joined && (
                <div
                  id="no-joined"
                  className="flex-1 ma-left-10 pa-hor-10 pa-bottom-10 pa-hor-10-768 d-flex flex-column ai-center jc-end"
                >
                  {/* <Lottie
                    options={{
                      autoplay: true,
                      animationData: require("../assets/lottie/developer.json"),
                    }}
                    height={300}
                  /> */}

                  <div className="w-100 d-flex ma-bottom-20">
                    {this.MicrophoneButton()}
                    <div style={{ width: 15 }} />
                    {this.CameraButton()}
                  </div>
                  <div className="d-flex w-100">
                    <input
                      placeholder="Ingresa aquí tu código"
                      onChange={(e) => {
                        this.meetCode = e.target.value;
                      }}
                      style={{ letterSpacing: 2 }}
                    />
                    <button
                      className="join"
                      style={{ letterSpacing: 1 }}
                      onClick={this.joinToMeet}
                    >
                      UNIRME
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* STSRT ACTIONS */}
            <div
              id="call-actions"
              className={
                joined ? "w-100 d-flex jc-end ai-center pa-hor-10" : "d-none"
              }
            >
              {this.ScreenShareButton()}
              <div style={{ width: 15 }} />
              {this.MicrophoneButton()}
              <div style={{ width: 15 }} />
              {this.CameraButton()}
              <button
                onClick={this.leave}
                className="circle-button accent large ma-left-30"
              >
                <img src={require("../assets/end-call.svg")} width="40" />
              </button>
            </div>
            {/* END ACTIONS */}
          </div>
          {/* END LOCAL */}
          <div id="board" className="d-none-768"></div>
        </div>
        <Loading open={loading} />
      </Template>
    );
  }
}

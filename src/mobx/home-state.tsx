import { observable, action } from "mobx";
import MeeduConnect from "../libs/video-call";
import { Room } from "../models";
import NoJoined from "../components/no-joined";
import auth from "../libs/auth";
import { notification, message, Modal, Input, Button } from "antd";
import { CopyOutlined } from "@ant-design/icons";
import React from "react";
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

export class HomeStore {
  localUser: LocalUser | null = null;
  meeduConnect!: MeeduConnect;
  videoRefs = new Map<string, HTMLVideoElement>();
  username = "";
  meetCode = "";
  wasJoined = false;
  screenShraingRef: HTMLVideoElement | null = null;
  noJoinedRef: NoJoined | null = null;

  @observable cameraEnabled = true;
  @observable microphoneEnabled = true;
  @observable loading = false;
  @observable connecting = false;
  @observable connected = false;
  @observable room: Room | null = null;
  @observable hasScreenSharing = false;
  @observable iAmSharingScreen = false;

  setLocalStream = () => {
    setTimeout(() => {
      if (this.localUser) {
        this.localUser.localVideo!.srcObject = this.meeduConnect.localStream!;
        this.noJoinedRef!.noJoinedVideoRef!.srcObject = this.meeduConnect.localStream!;
      }
    }, 300);
  };

  @action init = async () => {
    this.meeduConnect = new MeeduConnect({
      config,
      username: this.username,
    });
    this.loading = true; // update the view

    const token = await auth.getAccessToken();
    if (token) {
      await this.meeduConnect.init({
        wsHost: process.env.REACT_APP_MEEDU_CONNECT_HOST!,
        token,
      });

      if (this.meeduConnect.permissionGranted) {
        //
      }

      this.meeduConnect.onConnected = (socketId: string) => {
        if (!this.room) {
          // if the user is not connected yet to one room
          console.log("socketId:", socketId);
          this.connected = true;
          this.loading = false;

          this.setLocalStream();
        } else {
          this.meeduConnect.joinToRoom(this.room._id);
          this.connected = true;

          this.setLocalStream();
        }
      };

      this.meeduConnect.onConnectError = () => {
        if (this.loading && !this.connected) {
          this.loading = false;
          notification.error({
            message: "ERROR",
            description:
              "No se puedo conectar el servicio de Meedu Connect. Revisa tu conexíon e intenta nuevamente.",
            placement: "bottomRight",
          });
        } else if (this.connected) {
          this.loading = false;

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

        if (this.room) {
          this.connected = false;
          this.room.connections = [];
        } else {
          this.connected = false;
        }
      };

      this.meeduConnect.onDisconnectedUser = (socketId: string) => {
        const deleted = this.videoRefs.delete(socketId);
        console.log("deleted" + socketId, deleted);

        console.log("disconnected user jaja:", socketId);

        if (this.room) {
          const index = this.room.connections.findIndex(
            (item) => item.socketId === socketId
          );
          console.log("connection index", index);
          if (index !== -1) {
            this.room.connections.splice(index, 1);
          }
        }
      };

      this.meeduConnect.onJoined = (data) => {
        message.info(`Usuario conectado: ${data.username}`);

        if (this.room) {
          this.room.connections.push(data);
        }
      };

      this.meeduConnect.onJoinedTo = (data) => {
        console.log("Connected users", data.connections);
        message.success(`Conectado a: ${data.name}`);
        this.room = data;
      };

      this.meeduConnect.onRoomNotFound = (roomId: string) => {
        Modal.error({
          title: "Meet no encontrado",
          content: <div>{roomId}</div>,
          okText: "ACEPTAR",
        });
      };

      // when we have a remote stream
      this.meeduConnect.onRemoteStream = (data) => {
        setTimeout(() => {
          if (this.videoRefs.has(data.socketId)) {
            const ref = this.videoRefs.get(data.socketId);
            ref!.srcObject = data.stream;
          }
        }, 500);
      };

      // when a user anabled or disabled the camera or micrphone
      this.meeduConnect.onUserMediaStatusChanged = (data) => {
        if (this.room) {
          const index = this.room.connections.findIndex(
            (item) => item.socketId === data.socketId
          );
          if (index !== -1) {
            this.room.connections[index].cameraEnabled = data.cameraEnabled;
            this.room.connections[index].microphoneEnabled =
              data.microphoneEnabled;
          }
        }
      };

      this.meeduConnect.onLocalScreenStream = (stream) => {
        if (this.screenShraingRef && stream) {
          console.log("showing local screen", stream);
          this.screenShraingRef.srcObject = stream;
        } else {
          console.log("local screenShraingRef is null");
        }
      };

      // we have a remote screen sharing
      this.meeduConnect.onScreenSharingStream = (stream) => {
        if (this.screenShraingRef && stream) {
          console.log("showing remote screen", stream);
          this.screenShraingRef.srcObject = stream;
          this.hasScreenSharing = true;
        } else {
          console.log("screenShraingRef is null");
        }
      };

      this.meeduConnect.onScreenSharingChanged = (data: {
        sharing: boolean;
        iAmSharing: boolean;
      }) => {
        console.log("onScreenSharingChanged", data);
        this.hasScreenSharing = data.sharing;
        this.iAmSharingScreen = data.iAmSharing;
      };
    }
  };

  @action createMeet = async (data: {
    name: string;
    description: string;
  }): Promise<void> => {
    if (data.name.trim().length == 0) {
      message.error("Nombre para el Meet inválido");
      return;
    }
    this.loading = true;

    const response = await this.meeduConnect.createRoom(data);
    this.loading = false;
    if (response.status == 200) {
      this.shareMeet(response.data);
    } else {
      message.info(response.data);
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

  join = () => {
    if (this.username.trim().length == 0) {
      notification.error({
        message: "ERROR",
        description: "Nombre de usuario inválido",
        placement: "bottomRight",
      });
      return;
    }
    localStorage.setItem("username", this.username);
    this.init();
  };

  screenSharedToFullScreen() {
    this.screenShraingRef!.requestFullscreen();
  }

  leave = () => {
    this.meeduConnect.leaveRoom();
    this.videoRefs.clear();
    this.meetCode = "";

    // update state
    this.room = null;
    this.hasScreenSharing = false;
    this.iAmSharingScreen = false;
  };
}
const homeStore = new HomeStore();

export default homeStore;

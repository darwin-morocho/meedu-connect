import { observable, action } from "mobx";
import MeeduConnect from "../libs/video-call";
import { Room } from "../models";
import NoJoined from "../components/no-joined";
import auth from "../libs/auth";
import { notification, message, Modal } from "antd";
import React from "react";

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

          //  this.setLocalStream();
        } else {
          this.meeduConnect.joinToRoom(this.room._id);
          this.connected = true;

          //  this.setLocalStream();
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
}
const homeStore = new HomeStore();

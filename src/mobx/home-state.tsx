import { observable, action } from 'mobx';
import MeeduConnect, { SignalingEvents } from '../libs/signaling';
import { Room, IMessage, UserConnection, UserMediaStatus } from '../models';
import NoJoined from '../components/no-joined';
import auth from '../libs/auth';
import { notification, message, Modal, Input, Button } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import React from 'react';
import LocalUser from '../components/local-user';
import Chat from '../components/chat';
import Viewer from 'viewerjs';

const config = {
  iceServers: [
    {
      urls: ['stun:159.65.65.214:3478'],
    },
    {
      urls: ['turn:159.65.65.214:3478?transport=udp'],
      username: 'bccs6991',
      credential: 'ptyk2533',
    },
    {
      urls: ['turn:159.65.65.214:3478?transport=tcp'],
      username: 'bccs6991',
      credential: 'ptyk2533',
    },
  ],
};

export class HomeStore implements SignalingEvents {
  onConnected(socketId: string): void {
    if (!this.room) {
      // if the user is not connected yet to one room
      console.log('socketId:', socketId);
      this.connected = true;
      this.loading = false;

      this.setLocalStream();
      Notification.requestPermission().then((result) => {
        if (result === 'granted') {
          this.notificationsOk = true;
        }
      });
    } else {
      this.meeduConnect.joinToRoom(this.room._id);
      this.connected = true;

      this.setLocalStream();
    }
  }

  onConnectError(): void {
    if (this.loading && !this.connected) {
      this.loading = false;
      notification.error({
        message: 'ERROR',
        description:
          'No se puedo conectar el servicio de Meedu Connect. Revisa tu conexíon e intenta nuevamente.',
        placement: 'bottomRight',
      });
    } else if (this.connected) {
      this.loading = false;

      notification.error({
        message: 'ERROR',
        description: 'No se puedo conectar el servicio de Meedu Connect',
        placement: 'bottomRight',
      });
    }
  }
  onDisconnected(): void {
    console.log('disconnected');
    this.meeduConnect.leaveRoom();
    this.videoRefs.clear();

    if (this.room) {
      this.connected = false;
      this.room.connections = [];
    } else {
      this.connected = false;
    }
  }
  onDisconnectedUser(socketId: string): void {
    const deleted = this.videoRefs.delete(socketId);
    console.log('deleted' + socketId, deleted);

    console.log('disconnected user jaja:', socketId);

    if (this.room) {
      const index = this.room.connections.findIndex((item) => item.socketId === socketId);
      console.log('connection index', index);
      if (index !== -1) {
        this.room.connections.splice(index, 1);
      }
    }
  }

  onRoomNotFound(roomId: string): void {
    Modal.error({
      title: 'Meet no encontrado',
      content: <div>{roomId}</div>,
      okText: 'ACEPTAR',
    });
  }

  onScreenSharingStream(stream: MediaStream): void {
    if (this.screenShraingRef && stream) {
      console.log('showing remote screen', stream);
      this.screenShraingRef.srcObject = stream;
      this.hasScreenSharing = true;
    } else {
      console.log('screenShraingRef is null');
    }
  }
  onLocalScreenStream(stream: MediaStream): void {
    if (this.screenShraingRef && stream) {
      console.log('showing local screen', stream);
      this.screenShraingRef.srcObject = stream;
    } else {
      console.log('local screenShraingRef is null');
    }
  }
  onMessageRecived(data: IMessage): void {
    this.addMessage(data);
  }
  onJoinedTo(data: Room): void {
    message.success(`Conectado a: ${data.name}`);
    this.connectedAudio.play();
    this.room = data;
  }
  onJoined(data: UserConnection): void {
    message.info(`Usuario conectado: ${data.username}`);
    this.connectedAudio.play();
    if (this.room) {
      this.room.connections.push(data);
    }
  }
  onUserMediaStatusChanged(data: UserMediaStatus): void {
    if (this.room) {
      const index = this.room.connections.findIndex((item) => item.socketId === data.socketId);
      if (index !== -1) {
        this.room.connections[index].cameraEnabled = data.cameraEnabled;
        this.room.connections[index].microphoneEnabled = data.microphoneEnabled;
      }
    }
  }
  onRemoteStream(data: { socketId: string; stream: MediaStream }): void {
    setTimeout(() => {
      if (this.videoRefs.has(data.socketId)) {
        const ref = this.videoRefs.get(data.socketId);
        ref!.srcObject = data.stream;
      }
    }, 500);
  }
  onScreenSharingChanged(data: { sharing: boolean; iAmSharing: boolean }): void {
    console.log('onScreenSharingChanged', data);
    this.hasScreenSharing = data.sharing;
    this.iAmSharingScreen = data.iAmSharing;
  }

  connectedAudio = new Audio(require('../assets/ringtones/cell_phone.mp3'));
  messageAudio = new Audio(require('../assets/ringtones/dilin.mp3'));
  localUser: LocalUser | null = null;
  meeduConnect!: MeeduConnect;
  videoRefs = new Map<string, HTMLVideoElement>();
  imageRefs = new Map<number, Element>();
  username = '';
  meetCode = '';
  wasJoined = false;
  screenShraingRef: HTMLVideoElement | null = null;
  noJoinedRef: NoJoined | null = null;
  chatRef: Chat | null = null;
  notificationsOk = false;
  imageRef: HTMLImageElement | null = null;

  @observable messages: IMessage[] = [];
  @observable chatOpened = false;
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
    this.connectedAudio.volume = 0.4;
    this.messageAudio.volume = 0.2;
    this.meeduConnect = new MeeduConnect({
      config,
      username: this.username,
      wsHost: process.env.REACT_APP_MEEDU_CONNECT_HOST!,
    });
    this.loading = true; // update the view

    const token = await auth.getAccessToken();
    if (token) {
      await this.meeduConnect.init();

      if (this.meeduConnect.permissionGranted) {
        //
      }

      this.meeduConnect.events = this;
    }
  };

  @action addMessage = (message: IMessage) => {
    this.messages.push({ ...message, sender: false, createdAt: new Date() });
    if (this.chatRef) {
      this.messageAudio.play();
      if (this.notificationsOk) {
        var n = new Notification('Nuevo mensaje: ' + message.username, {
          body: message.value,
        });
        setTimeout(n.close.bind(n), 4000);
      }
      this.chatRef.forceUpdate();
    }
  };

  viewImage = (id: number) => {
    if (this.imageRefs.has(id)) {
      const index = Array.from(this.imageRefs.keys()).findIndex((key) => key === id);
      console.log('image index', index);
      if (index !== -1) {
        const viewer = new Viewer(document.getElementById('messages')!, {
          inline: false,
          viewed: () => {
            viewer.zoomTo(1);
          },
          hidden: () => {
            console.log('viewer hidden');
            viewer.destroy();
          },
        });
        viewer.view(index);
      }
    } else {
      console.log('image not found', id);
    }
  };

  @action createMeet = async (data: { name: string; description: string }): Promise<void> => {
    if (data.name.trim().length == 0) {
      message.error('Nombre para el Meet inválido');
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
    let name = '',
      description = '';
    Modal.success({
      width: 600,
      title: 'Compartir Meet',
      maskClosable: false,
      okCancel: true,
      okText: 'CREAR',
      cancelText: 'CANCELAR',
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
      message.error('No estas conectado al servicio de meedu connect');
      return;
    }
    if (this.meetCode.trim().length > 0) {
      this.meeduConnect.joinToRoom(this.meetCode);
      message.info('Uniendose al Meet');
    } else {
      message.info('Código inválido');
    }
  };

  @action sendMessage = (message: IMessage) => {
    this.messages.push(message);
    this.meeduConnect.sendMessage(message);
  };

  shareMeet = async (room: Room | null) => {
    if (!room) {
      message.error('Meet null');
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
      className: 'ant-modal-confirm-btns-hide',
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
                message.info('Copiado');
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
                message.info('Copiado');
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
        message: 'ERROR',
        description: 'Nombre de usuario inválido',
        placement: 'bottomRight',
      });
      return;
    }
    localStorage.setItem('username', this.username);
    this.init();
  };

  screenSharedToFullScreen() {
    this.screenShraingRef!.requestFullscreen();
  }

  leave = () => {
    this.meeduConnect.leaveRoom();
    this.videoRefs.clear();
    this.meetCode = '';

    // update state
    this.room = null;
    this.hasScreenSharing = false;
    this.iAmSharingScreen = false;
  };
}
const homeStore = new HomeStore();

export default homeStore;

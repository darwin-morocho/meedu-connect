import io from 'socket.io-client';
import Peer from 'simple-peer';
import MeeduConnectAPI, {
  // eslint-disable-next-line no-unused-vars
  MeeduConnectAPIResponse,
} from '../api/meedu-connect-api';
import { UserConnection, Room, UserMediaStatus, IMessage } from '../models';
import Broadcast from './broadcast';

interface OnIceCandidate {
  socketId: string;
  candidate: RTCIceCandidate;
}

export interface SignalingEvents {
  onConnected(data: any): void;
  onConnectError(): void;
  onDisconnected(): void;
  onDisconnectedUser(data: any): void;
  onRoomNotFound(data: any): void;
  onScreenSharingStream(data: any): void;
  onLocalScreenStream(data: any): void;
  onMessageRecived(data: any): void;
  onJoinedTo(data: Room): void;
  onJoined(data: UserConnection): void;
  onUserMediaStatusChanged(data: UserMediaStatus): void;
  onRemoteStream(data: { socketId: string; stream: MediaStream }): void;
  onScreenSharingChanged(data: { sharing: boolean; iAmSharing: boolean }): void;
}

export default class MeeduConnect {
  private config!: RTCConfiguration;
  private peers = new Map<string, RTCPeerConnection>();

  permissionGranted = false;
  private socket: SocketIOClient.Socket | null = null;
  localStream: MediaStream | undefined = undefined;
  captureStream: MediaStream | undefined = undefined;

  events!: SignalingEvents;
  connected: boolean = false;
  private meeduAPI!: MeeduConnectAPI;
  private currentRoom: Room | null = null;
  cameraEnabled: boolean = true;
  microphoneEnabled: boolean = true;
  private username!: string;

  private broadcast: Broadcast | null = null;
  private isScreenSharing = false;

  // get the current room
  get room(): Room | null {
    return this.currentRoom;
  }

  constructor(data: { config: RTCConfiguration; username: string }) {
    this.config = data.config;
    this.username = data.username;
  }

  async getPeerConnecction(socketId: string): Promise<RTCPeerConnection> {
    if (this.peers.has(socketId)) {
      return this.peers.get(socketId)!;
    }
    const peer = new RTCPeerConnection(this.config);

    peer.onicecandidate = (e) => {
      if (e.candidate) {
        // send the ice candidate to the client
        this.emit('new-ice-candidate', {
          socketId,
          candidate: e.candidate,
        });
      }
    };

    peer.ontrack = (e) => {
      console.log('has remote stream', socketId);
      this.events.onRemoteStream({
        socketId,
        stream: e.streams[0],
      });
    };

    this.peers.set(socketId, peer); // save the peer
    // our local stream can provide different tracks, e.g. audio and
    // video. even though we're just using the video track, we should
    // add all tracks to the webrtc connection
    for (const track of this.localStream!.getTracks()) {
      peer.addTrack(track, this.localStream!);
    }

    return peer;
  }

  // attach the recived ice candidate
  private onIceCandidate = (data: OnIceCandidate) => {
    if (this.peers.has(data.socketId)) {
      this.peers.get(data.socketId)!.addIceCandidate(data.candidate);
    }
  };

  /**
   * get the screen as stream and then share to the others users in the call
   */
  async screenShare() {
    try {
      const mediaDevices = navigator.mediaDevices as any;

      this.captureStream = (await mediaDevices.getDisplayMedia({
        video: {
          mediaSource: 'screen',
          cursor: 'always',
          width: { max: '1920' },
          height: { max: '1080' },
          frameRate: { max: '10' },
        },
        audio: false,
      })) as MediaStream | undefined;
      if (this.captureStream) {
        this.events.onScreenSharingChanged({ sharing: true, iAmSharing: true });
        this.isScreenSharing = true;

        for (let key of Array.from(this.peers.keys())) {
          this.broadcast!.share(key, this.captureStream);
        }

        this.captureStream.getVideoTracks()[0].onended = () => {
          this.events.onScreenSharingChanged({ sharing: false, iAmSharing: false });
          this.isScreenSharing = false;
          this.captureStream = undefined;
          console.log('finished screen sharing');
          if (this.broadcast) {
            this.broadcast.stop();
          }
        };
      }
    } catch (err) {
      console.error('Error: ' + err);
    }
  }

  // initialize the library
  async init(options: { wsHost: string; token: string }): Promise<void> {
    this.meeduAPI = new MeeduConnectAPI(options.wsHost);
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: { width: 480, height: 640 },
    });
    if (mediaStream) {
      // if was successfull
      this.permissionGranted = true;
      this.localStream = mediaStream;
      this.connect(options.wsHost, options.token); // connect to streaming websocket
    } else {
      this.permissionGranted = false;
    }
  }

  /**
   *
   * @param host
   * @param token
   */
  private connect(host: string, token: string) {
    this.socket = io.connect(host, {
      secure: true,
      query: {
        token,
        username: this.username,
      },
      transports: ['websocket'],
      upgrade: false,
    });

    this.broadcast = new Broadcast(this.socket!, this.config);
    this.broadcast.onRemoteStream = (stream) => {
      this.events.onScreenSharingStream(stream); // send the screen capture stream
    };
    this.broadcast.onStopped = () => {
      this.events.onScreenSharingChanged({ sharing: false, iAmSharing: false }); // the remote screen sharing has been stopped
    };

    // connected to the websocket
    this.socket.on('connected', (socketId: string) => {
      console.log('connected');
      this.connected = true;
      this.events.onConnected(socketId);
    });

    // disconnected from the websocket
    this.socket.on('disconnect', () => {
      this.connected = false;
      this.events.onDisconnected();
      this.broadcast!.stop();
    });

    // connection failed
    this.socket.on('connect_failed', (data: any) => {
      console.log('connect_failed:', data);
    });

    this.socket.on('connect_error', (data: any) => {
      console.log('connect_error:', data);
      this.events.onConnectError();
    });

    // joined to room
    this.socket.on('joined-to', (data: Room) => {
      this.currentRoom = data;
      this.events.onJoinedTo(data); // notify to the view
      // creates a peer for each connected user
      data.connections.forEach(async (item) => {
        const peer = await this.getPeerConnecction(item.socketId);
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        // send the offer to the user
        this.emit('offer', { socketId: item.socketId, offer });
      });
    });

    // a new user was joined to the room
    this.socket.on('joined', (data: any) => {
      this.events.onJoined(data);
      if (this.isScreenSharing) {
        this.broadcast!.share(data.socketId, this.captureStream!);
      }
    });

    // incoming offer for a new connected user
    this.socket.on('offer', async (data: any) => {
      const peer = await this.getPeerConnecction(data.socketId);
      await peer.setRemoteDescription(data.offer);
      const answer = await peer.createAnswer(); // create the answer
      await peer.setLocalDescription(answer);
      this.emit('answer', { socketId: data.socketId, answer }); // send the answer to connected user
    });

    // we recived the answer to previous offer sent
    this.socket.on('answer', async (data: any) => {
      console.log('answer', data);
      const peer = await this.getPeerConnecction(data.socketId);
      await peer.setRemoteDescription(data.answer);
    });

    // ice candidate recived
    this.socket.on('ice-canditate', this.onIceCandidate);

    this.socket.on('room-not-found', (roomId: string) => {
      this.events.onRoomNotFound(roomId);
    });

    // an user was disconnected
    this.socket.on('disconnected-user', (socketId: string) => {
      this.events.onDisconnectedUser(socketId); // notify to the view
      if (this.peers.has(socketId)) {
        this.peers.get(socketId)!.close();
        this.peers.delete(socketId);
      }
    });

    this.socket.on('message', (message: IMessage) => {
      this.events.onMessageRecived(message);
    });

    this.socket.on('camera-or-microphone-changed', (data: UserMediaStatus) => {
      this.events.onUserMediaStatusChanged(data);
    });
  }

  /**
   * create a room
   */
  async createRoom(data: { name: string; description?: string }): Promise<MeeduConnectAPIResponse> {
    return await this.meeduAPI.createRoom(data);
  }

  /**
   * just call this method after conecction successfull
   * @param roomId
   */
  joinToRoom(roomId: string): void {
    const data = {
      roomId,
      cameraEnabled: this.cameraEnabled,
      microphoneEnabled: this.microphoneEnabled,
    };
    console.log('join-to data', data);
    this.emit('join-to', data);
  }

  /**
   * close the all connections
   */
  leaveRoom(): void {
    this.emit('leave', null);
    this.currentRoom = null;
    this.peers.forEach((item) => {
      item.close();
    });

    this.peers.clear();

    if (this.captureStream) {
      this.captureStream.getTracks().forEach((track) => track.stop());
      this.captureStream = undefined;
    }
    this.broadcast!.stop();
  }

  /**
   * send data to socket server
   * @param event event name to emit
   * @param data
   */
  private emit(event: string, data: any) {
    this.socket!.emit(event, data);
  }

  /**
   * enable or disable the microphone
   * @param enabled
   */
  microphone(enabled: boolean): void {
    if (this.localStream) {
      this.microphoneEnabled = enabled;
      this.localStream.getAudioTracks()[0].enabled = enabled;
      this.cameraOrMicrophoneChanged();
    }
  }

  /**
   * notify to the other user that the camera or micro changes
   */
  cameraOrMicrophoneChanged() {
    const data = {
      cameraEnabled: this.cameraEnabled,
      microphoneEnabled: this.microphoneEnabled,
    };

    if (this.room) {
      console.log('data', data);
      this.emit('camera-or-microphone-changed', data);
    }
  }

  /**
   * enable or disable the camera
   * @param enabled
   */
  async camera(enabled: boolean): Promise<void> {
    if (this.localStream) {
      this.cameraEnabled = enabled;
      this.localStream.getVideoTracks()[0].enabled = enabled;
      // if (!enabled) {//turn on the camera
      //   this.localStream.getVideoTracks()[0].stop();
      //   this.localStream.getVideoTracks().forEach((track) => {
      //     this.localStream!.removeTrack(track);
      //   });
      // } else {
      //   const stream = await navigator.mediaDevices.getUserMedia({
      //     audio: false,
      //     video: { width: 480, height: 640 },
      //   });
      //   if (stream && this.localStream) {
      //     stream.getVideoTracks().forEach((track) => {
      //       this.localStream!.addTrack(track);
      //     });
      //   }
      // }
      this.cameraOrMicrophoneChanged();
    }
  }

  /**
   * sends a message to the others user
   * @param message must be a string, if you need send a object you must parse with JSON.stringify
   */
  sendMessage(message: string) {
    this.emit('message', message);
  }
}

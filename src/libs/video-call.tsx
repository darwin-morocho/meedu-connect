import io from "socket.io-client";
import Peer from "simple-peer";
import MeeduConnectAPI, {
  // eslint-disable-next-line no-unused-vars
  MeeduConnectAPIResponse,
} from "../api/meedu-connect-api";
import { UserConnection, Room, UserMediaStatus } from "../models";

type On = (data?: any) => void;
type OnJoinedTo = (data: Room) => void;
type OnUserMediaStatusChanged = (data: UserMediaStatus) => void;
type OnScreenSharingChanged = (data: {
  sharing: boolean;
  iAmSharing: boolean;
}) => void;

type OnRemoteStream = (data: { socketId: string; stream: MediaStream }) => void;

type OnJoined = (data: UserConnection) => void;

interface OnIceCandidate {
  socketId: string;
  candidate: RTCIceCandidate;
}

export default class MeeduConnect {
  private config!: RTCConfiguration;
  private connections = new Map<string, RTCPeerConnection>();
  permissionGranted = false;
  private socket: SocketIOClient.Socket | null = null;
  localStream: MediaStream | undefined = undefined;
  captureStream: MediaStream | undefined = undefined;
  onConnected: On | null = null;
  onConnectError: On | null = null;
  onDisconnected: On | null = null;
  onDisconnectedUser: On | null = null;
  onRoomNotFound: On | null = null;
  onJoinedTo: OnJoinedTo | null = null;
  onJoined: OnJoined | null = null;
  onUserMediaStatusChanged: OnUserMediaStatusChanged | null = null;
  connected: boolean = false;
  private meeduAPI!: MeeduConnectAPI;
  private currentRoom: Room | null = null;
  onRemoteStream: OnRemoteStream | null = null;
  cameraEnabled: boolean = true;
  microphoneEnabled: boolean = true;
  private username!: string;
  onScreenSharingStream: On | null = null;
  onLocalScreenStream: On | null = null;
  onScreenSharingChanged: OnScreenSharingChanged | null = null;
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
    if (this.connections.has(socketId)) {
      return this.connections.get(socketId)!;
    }
    const peer = new RTCPeerConnection(this.config);

    peer.onicecandidate = (e) => {
      if (e.candidate) {
        // send the ice candidate to the client
        this.emit("new-ice-candidate", {
          socketId,
          candidate: e.candidate,
        });
      }
    };

    peer.onconnectionstatechange = (e) => {
      if (peer.connectionState === "connected") {
        // Peers connected!
        console.log(`connected with ${socketId}`);
      }
    };

    peer.ontrack = (e) => {
      if (this.onRemoteStream) {
        console.log("has remote stream", socketId);
        this.onRemoteStream({
          socketId,
          stream: e.streams[0],
        });
      }
    };

    this.connections.set(socketId, peer); // save the peer
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
    if (this.connections.has(data.socketId)) {
      this.connections.get(data.socketId)!.addIceCandidate(data.candidate);
    }
  };

  async screenShare() {
    try {
      const mediaDevices = navigator.mediaDevices as any;

      this.captureStream = (await mediaDevices.getDisplayMedia({
        video: {
          mediaSource: "screen",
          cursor: "always",
          width: { max: "1920" },
          height: { max: "1080" },
          frameRate: { max: "10" },
        },
        audio: false,
      })) as MediaStream | undefined;
      if (this.captureStream) {
        if (this.onScreenSharingChanged) {
          this.onScreenSharingChanged({ sharing: true, iAmSharing: true });
        }
        this.isScreenSharing = true;

        for (let key of Array.from(this.connections.keys())) {
          this.broadcast!.share(key, this.captureStream);
        }

        this.captureStream.getVideoTracks()[0].onended = () => {
          if (this.onScreenSharingChanged) {
            this.onScreenSharingChanged({ sharing: false, iAmSharing: false });
          }
          this.isScreenSharing = false;
          this.captureStream = undefined;
          console.log("finished screen sharing");
          if (this.broadcast) {
            this.broadcast.stop();
          }
        };
      }
    } catch (err) {
      console.error("Error: " + err);
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
      query: {
        token,
        username: this.username,
      },
      transports: ["websocket"],
      upgrade: false,
    });

    this.broadcast = new Broadcast(this.socket!, this.config);
    this.broadcast.onRemoteStream = (stream) => {
      if (this.onScreenSharingStream) {
        this.onScreenSharingStream(stream); // send the screen capture stream
      }
    };
    this.broadcast.onStopped = () => {
      if (this.onScreenSharingChanged) {
        this.onScreenSharingChanged({ sharing: false, iAmSharing: false }); // the remote screen sharing has been stopped
      }
    };

    // connected to the websocket
    this.socket.on("connected", (socketId: string) => {
      console.log("connected");
      this.connected = true;
      if (this.onConnected) {
        this.onConnected(socketId);
      }
    });

    // disconnected from the websocket
    this.socket.on("disconnect", () => {
      this.connected = false;
      if (this.onDisconnected) {
        this.onDisconnected();
        this.broadcast!.stop();
      }
    });

    // connection failed
    this.socket.on("connect_failed", (data: any) => {
      console.log("connect_failed:", data);
    });

    this.socket.on("connect_error", (data: any) => {
      console.log("connect_error:", data);
      if (this.onConnectError) {
        this.onConnectError();
      }
    });

    // joined to room
    this.socket.on("joined-to", (data: Room) => {
      this.currentRoom = data;
      if (this.onJoinedTo) {
        this.onJoinedTo(data); // notify to the view
        // creates a peer for each connected user
        data.connections.forEach(async (item) => {
          const peer = await this.getPeerConnecction(item.socketId);
          const offer = await peer.createOffer();
          await peer.setLocalDescription(offer);
          // send the offer to the user
          this.emit("offer", { socketId: item.socketId, offer });
        });
      }
    });

    // a new user was joined to the room
    this.socket.on("joined", (data: any) => {
      if (this.onJoined) {
        this.onJoined(data);
        if (this.isScreenSharing) {
          this.broadcast!.share(data.socketId, this.captureStream!);
        }
      }
    });

    // incoming offer for a new connected user
    this.socket.on("offer", async (data: any) => {
      const peer = await this.getPeerConnecction(data.socketId);
      await peer.setRemoteDescription(data.offer);
      const answer = await peer.createAnswer(); // create the answer
      await peer.setLocalDescription(answer);
      this.emit("answer", { socketId: data.socketId, answer }); // send the answer to connected user
    });

    // we recived the answer to previous offer sent
    this.socket.on("answer", async (data: any) => {
      console.log("answer", data);
      const peer = await this.getPeerConnecction(data.socketId);
      await peer.setRemoteDescription(data.answer);
    });

    // ice candidate recived
    this.socket.on("ice-canditate", this.onIceCandidate);

    this.socket.on("room-not-found", (roomId: string) => {
      if (this.onRoomNotFound) {
        this.onRoomNotFound(roomId);
      }
    });

    // an user was disconnected
    this.socket.on("disconnected-user", (socketId: string) => {
      if (this.onDisconnectedUser) {
        this.onDisconnectedUser(socketId); // notify to the view
      }
      if (this.connections.has(socketId)) {
        this.connections.get(socketId)!.close();
        this.connections.delete(socketId);
      }
    });

    this.socket.on("camera-or-microphone-changed", (data: UserMediaStatus) => {
      if (this.onUserMediaStatusChanged) {
        this.onUserMediaStatusChanged(data);
      }
    });
  }

  /**
   * create a room
   */
  async createRoom(data: {
    name: string;
    description?: string;
  }): Promise<MeeduConnectAPIResponse> {
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
    console.log("join-to data", data);
    this.emit("join-to", data);
  }

  /**
   * close the all connections
   */
  leaveRoom(): void {
    this.emit("leave", null);
    this.currentRoom = null;
    this.connections.forEach((peer: RTCPeerConnection) => {
      peer.close();
    });
    this.connections.clear();
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
      console.log("data", data);
      this.emit("camera-or-microphone-changed", data);
    }
  }

  /**
   * enable or disable the camera
   * @param enabled
   */
  camera(enabled: boolean): void {
    if (this.localStream) {
      this.cameraEnabled = enabled;
      this.localStream.getVideoTracks()[0].enabled = enabled;
      this.cameraOrMicrophoneChanged();
    }
  }
}

type OnStream = (stream: MediaStream) => void;
class Broadcast {
  private config!: RTCConfiguration;
  private socket!: SocketIOClient.Socket;

  private peers = new Map<string, Peer.Instance>();

  onRemoteStream: null | OnStream = null;
  onStopped: null | On = null;
  private iAmSharing = false;
  private wasConnected = false;

  constructor(socket: SocketIOClient.Socket, config: RTCConfiguration) {
    this.socket = socket;
    this.config = config;

    // whe have a remote screen sharing offer
    this.socket.on(
      "remote-screen-offer",
      async (data: { socketId: string; peerData: any }) => {
        // if (this.peer) return; // if we have a current screen sharing
        this.log("remote-screen-offer", data);

        this.iAmSharing = false;

        if (!this.peers.has("local")) {
          const peer = new Peer({ initiator: false, config: this.config });
          peer.on("stream", (stream) => {
            console.log("broadcast got stream");
            if (this.onRemoteStream) {
              this.onRemoteStream(stream);
            }
          });
          peer.on("error", (error) => {
            console.log("remote screen error");
          });
          peer.on("connect", () => {
            console.log("remote screen connected");
            this.wasConnected = true;
          });
          peer.on("close", () => {
            console.log("remote screen closed");
            if (this.wasConnected) {
              this.wasConnected = false;
              this.stop();
              if (this.onStopped) {
                this.onStopped();
              }
            }
          });
          this.peers.set("local", peer);
        }
        const peer = this.peers.get("local")!;

        peer.signal(data.peerData); //
        peer.on("signal", (peerData) => {
          // peerData could be answer (RTCSessionDescription) or ice candidate
          this.log("answer", peerData);
          this.socket.emit("screen-sharing-answer", {
            socketId: data.socketId,
            peerData: peerData,
          });
        });
      }
    );

    //we have a remote screen answer or candidate
    this.socket.on(
      "remote-screen-answer",
      async (data: { socketId: string; peerData: any }) => {
        if (this.peers.has(data.socketId)) {
          // data.peerData could be answer or ice candidate
          const peer = this.peers.get(data.socketId)!;
          peer.signal(data.peerData);
        }
      }
    );

    this.socket.on("screen-sharing-stopped", () => {
      this.stop();
      if (this.onStopped) {
        this.onStopped();
      }
    });
  }

  async share(socketId: string, stream: MediaStream): Promise<boolean> {
    this.iAmSharing = true;
    if (this.peers.has(socketId)) {
      return true;
    }

    const peer = new Peer({
      initiator: true,
      config: this.config,
      trickle: false,
    });
    peer.on("error", (err) => console.log("error", err));
    peer.addStream(stream);
    peer.on("signal", (data) => {
      this.socket.emit("screen-sharing-offer", { socketId, peerData: data });
    });
    this.peers.set(socketId, peer);
    return true;
  }

  // destroy the current peer
  stop() {
    if (this.iAmSharing) {
      this.socket.emit("screen-sharing-stopped");
    }
    this.peers.forEach((value) => {
      value.destroy();
    });
    this.peers.clear();
  }

  private log(event: string = "", data: any) {
    // console.log(`broadcast ${event}:`, data);
  }
}

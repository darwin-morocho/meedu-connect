import io from "socket.io-client";
import MeeduConnectAPI, {
  // eslint-disable-next-line no-unused-vars
  MeeduConnectAPIResponse,
} from "../api/meedu-connect-api";

export interface UserConnection {
  socketId: string;
  username: string;
}

export interface Room {
  _id: string;
  name: string;
  connections: UserConnection[];
}

type On = (data?: any) => void;
type OnJoinedTo = (data: Room) => void;

type OnRemoteStream = (data: { socketId: string; stream: MediaStream }) => void;

type OnJoined = (data: UserConnection) => void;

interface OnIceCandidate {
  socketId: string;
  candidate: RTCIceCandidate;
}

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

export class MeeduConnect {
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
  connected: boolean = false;
  private meeduAPI!: MeeduConnectAPI;
  private currentRoom: string | null = null;
  onRemoteStream: OnRemoteStream | null = null;
  cameraEnabled: boolean = true;
  microphoneEnabled: boolean = true;

  // get the current room
  get roomId(): string | null {
    return this.currentRoom;
  }

  constructor() {}

  async getPeerConnecction(socketId: string): Promise<RTCPeerConnection> {
    if (this.connections.has(socketId)) {
      return this.connections.get(socketId)!;
    }
    const peer = new RTCPeerConnection(config);

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
          cursor: "always",
          aspectRatio: 1.6,
        },
        audio: false,
      })) as MediaStream | undefined;
      if (this.captureStream) {
        this.captureStream.getVideoTracks()[0].onended = () => {
          console.log("finished sharing");
          this.captureStream = undefined;
        };
      }
    } catch (err) {
      console.error("Error: " + err);
    }
  }

  // initialize the library
  async init(options: { stHost: string; token: string }): Promise<void> {
    this.meeduAPI = new MeeduConnectAPI(options.stHost);
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: { width: 480, height: 640 },
    });
    if (mediaStream) {
      // if was successfull
      this.permissionGranted = true;
      this.localStream = mediaStream;
      this.connect(options.stHost, options.token); // connect to streaming websocket
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
        username: `user-${Date.now()}`,
      },
      transports: ["websocket"],
      upgrade: false,
    });

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
      this.currentRoom = data._id;
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
    this.emit("join-to", roomId);
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
      this.localStream.getAudioTracks()[0].enabled = enabled;
    }
  }

  /**
   * enable or disable the camera
   * @param enabled
   */
  camera(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getVideoTracks()[0].enabled = enabled;
    }
  }
}

export default new MeeduConnect();

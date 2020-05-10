import Peer from 'simple-peer';

type OnStream = (stream: MediaStream) => void;
export default class Broadcast {
  private config!: RTCConfiguration;
  private socket!: SocketIOClient.Socket;

  private peers = new Map<string, Peer.Instance>();

  onRemoteStream: null | OnStream = null;
  onStopped: null | Function = null;
  private iAmSharing = false;
  private wasConnected = false;

  constructor(socket: SocketIOClient.Socket, config: RTCConfiguration) {
    this.socket = socket;
    this.config = config;

    // whe have a remote screen sharing offer
    this.socket.on('remote-screen-offer', async (data: { socketId: string; peerData: any }) => {
      // if (this.peer) return; // if we have a current screen sharing
      this.log('remote-screen-offer', data);

      this.iAmSharing = false;

      if (!this.peers.has('local')) {
        const peer = new Peer({ initiator: false, config: this.config });
        peer.on('stream', (stream) => {
          console.log('broadcast got stream');
          if (this.onRemoteStream) {
            this.onRemoteStream(stream);
          }
        });
        peer.on('error', (error) => {
          console.log('remote screen error');
        });
        peer.on('connect', () => {
          console.log('remote screen connected');
          this.wasConnected = true;
        });
        peer.on('close', () => {
          console.log('remote screen closed');
          if (this.wasConnected) {
            this.wasConnected = false;
            this.stop();
            if (this.onStopped) {
              this.onStopped();
            }
          }
        });
        this.peers.set('local', peer);
      }
      const peer = this.peers.get('local')!;

      peer.signal(data.peerData); //
      peer.on('signal', (peerData) => {
        // peerData could be answer (RTCSessionDescription) or ice candidate
        this.log('answer', peerData);
        this.socket.emit('screen-sharing-answer', {
          socketId: data.socketId,
          peerData: peerData,
        });
      });
    });

    //we have a remote screen answer or candidate
    this.socket.on('remote-screen-answer', async (data: { socketId: string; peerData: any }) => {
      if (this.peers.has(data.socketId)) {
        // data.peerData could be answer or ice candidate
        const peer = this.peers.get(data.socketId)!;
        peer.signal(data.peerData);
      }
    });

    this.socket.on('screen-sharing-stopped', () => {
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
    peer.on('error', (err) => console.log('error', err));
    peer.addStream(stream);
    peer.on('signal', (data) => {
      this.socket.emit('screen-sharing-offer', { socketId, peerData: data });
    });
    this.peers.set(socketId, peer);
    return true;
  }

  // destroy the current peer
  stop() {
    if (this.iAmSharing) {
      this.socket.emit('screen-sharing-stopped');
    }
    this.peers.forEach((value) => {
      value.destroy();
    });
    this.peers.clear();
  }

  private log(event: string = '', data: any) {
    // console.log(`broadcast ${event}:`, data);
  }
}

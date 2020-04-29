import React from "react";
import MeeduConnect from "../libs/video-call";
import { Room } from "../models";

export default class LocalUser extends React.PureComponent<{
  meeduConnect: MeeduConnect;
  room: Room | null;
  onLeave: () => void;
  shareScreenEnabled: boolean;
}> {
  state = {
    microphoneEnabled: true,
    cameraEnabled: true,
  };

  localVideo: HTMLVideoElement | null = null;

  MicrophoneButton = () => {
    const { microphoneEnabled } = this.state;
    return (
      <button
        className={`circle-button ${microphoneEnabled ? "primary" : "accent"}`}
        onClick={() => {
          this.props.meeduConnect.microphone(!microphoneEnabled);
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
        />
      </button>
    );
  };

  CameraButton = () => {
    const { cameraEnabled } = this.state;

    return (
      <button
        className={`circle-button ${cameraEnabled ? "primary" : "accent"}`}
        onClick={() => {
          this.props.meeduConnect.camera(!cameraEnabled);
          this.setState({ cameraEnabled: !cameraEnabled });
        }}
      >
        <img
          src={
            cameraEnabled
              ? require("../assets/video-camera.svg")
              : require("../assets/video-camera-off.svg")
          }
        />
      </button>
    );
  };

  ScreenShareButton = () => (
    <button
      className="circle-button ma-left-10"
      onClick={() => {
        this.props.meeduConnect.screenShare();
      }}
    >
      <img
        src="https://image.flaticon.com/icons/svg/808/808574.svg"
        width="40"
      />
    </button>
  );

  render() {
    const { room, onLeave, shareScreenEnabled } = this.props;
    return (
      <div className="d-flex ai-end">
        <div id="local-container" className="d-none-768">
          {/* LOCAL VIDEO */}
          <video
            id="local-video"
            ref={(ref) => (this.localVideo = ref)}
            playsInline
            autoPlay
            muted
          />
          {/* END LOCAL VIDEO */}
        </div>

        {/*START NO CONNECTED ACTIONS */}
        {!room && (
          <div
            id="no-joined"
            className="flex-1 ma-left-10 ma-left-0-480 pa-hor-10 pa-bottom-10 pa-hor-10-768 d-flex flex-column ai-center jc-end"
          >
            <div className="w-100 d-flex ma-bottom-20">
              {this.MicrophoneButton()}
              <div style={{ width: 15 }} />
              {this.CameraButton()}
            </div>
          </div>
        )}
        {/*END NO CONNECTED ACTIONS */}

        {/* STSRT ACTIONS */}
        {room && (
          <div
            id="call-actions"
            className="w-100 pa-hor-10 ma-left-10 ma-bottom-10"
          >
            <h2 className="t-right  ma-bottom-0 lh-110">
              <span className="bold">{room.name}</span>
            </h2>
            <p className="t-right ma-top-0">
              Usuarios conectados ({room.connections.length})
            </p>
            <div className="d-flex jc-end ai-center ma-top-15">
              {shareScreenEnabled && this.ScreenShareButton()}
              <div style={{ width: 15 }} />
              {this.MicrophoneButton()}
              <div style={{ width: 15 }} />
              {this.CameraButton()}
              <button
                onClick={onLeave}
                className="circle-button accent large ma-left-30"
              >
                <img src={require("../assets/end-call.svg")} width="40" />
              </button>
            </div>
          </div>
        )}
        {/* END ACTIONS */}
      </div>
    );
  }
}

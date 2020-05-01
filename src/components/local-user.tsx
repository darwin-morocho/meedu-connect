import React from "react";
import MeeduConnect from "../libs/video-call";
import { Room } from "../models";
import CameraButton from "./CameraButton";
import MicrophoneButton from "./ MicrophoneButton";
import { inject, observer } from "mobx-react";
import { HomeStore } from "../mobx/home-state";

@inject("homeStore")
@observer
export default class LocalUser extends React.PureComponent<{
  homeStore?: HomeStore;
}> {
  state = {
    microphoneEnabled: true,
    cameraEnabled: true,
  };

  localVideo: HTMLVideoElement | null = null;

  ScreenShareButton = () => (
    <button
      className="circle-button ma-left-10"
      onClick={() => {
        this.props.homeStore!.meeduConnect.screenShare();
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
      room,
      leave,
      hasScreenSharing,
      meeduConnect,
    } = this.props.homeStore!;
    return (
      <div className={room ? `d-flex ai-end ` : "d-none"}>
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
        </div>

        {/*START NO CONNECTED ACTIONS */}
        {/* {!room && (
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
        )} */}
        {/*END NO CONNECTED ACTIONS */}

        {/* STSRT ACTIONS */}
        {room && (
          <div
            id="call-actions"
            className="w-100 pa-hor-10 ma-left-10 pa-left-0-480 ma-left-0-480 ma-bottom-10"
          >
            <h2 className="t-right  ma-bottom-0 lh-110">
              <span className="bold">{room.name}</span>
            </h2>
            <p className="t-right ma-top-0">
              Usuarios conectados ({room.connections.length})
            </p>
            <div className="d-flex jc-end ai-center ma-top-15">
              {!hasScreenSharing && this.ScreenShareButton()}
              <div style={{ width: 15 }} />
              <MicrophoneButton />
              <div style={{ width: 15 }} />
              <CameraButton />
              <button
                onClick={leave}
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

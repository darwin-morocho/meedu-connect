import React from "react";
import { Room } from "../models";
import MicrophoneButton from "./ MicrophoneButton";
import CameraButton from "./CameraButton";
import MeeduConnect from "../libs/video-call";

export default class NoJoined extends React.PureComponent<{
  room: Room | null;
  meeduConnect: MeeduConnect;
}> {
  noJoinedVideoRef: HTMLVideoElement | null = null;

  
  render() {
    const { room, meeduConnect } = this.props;
    return (
      <div id="no-joined" className={room ? "d-none" : ""}>
        <video
          ref={(ref) => {
            this.noJoinedVideoRef = ref;
          }}
          muted
          autoPlay
          playsInline
        />

        <div className="buttons d-flex">
          <MicrophoneButton meeduConnect={meeduConnect} />
          <div style={{ width: 25 }} />
          <CameraButton meeduConnect={meeduConnect} />
        </div>
      </div>
    );
  }
}

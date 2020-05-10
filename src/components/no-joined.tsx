import React from "react";
import { Room } from "../models";
import MicrophoneButton from "./ MicrophoneButton";
import CameraButton from "./CameraButton";
import MeeduConnect from "../libs/signaling";
import { inject, observer } from "mobx-react";
import { HomeStore } from "../mobx/home-state";
import { intercept, observe } from "mobx";

@inject("homeStore")
@observer
export default class NoJoined extends React.PureComponent<{
  homeStore?: HomeStore;
}> {
  noJoinedVideoRef: HTMLVideoElement | null = null;

  componentDidMount() {
    // observe(this.props.homeStore!, (change) => {
    //   const store = change.object as HomeStore;
    //   console.log("updated NoJoined", change.object);
    //   if (store.room != this.props.homeStore!.room) {
    //     console.log("room changed state");
    //     return change;
    //   }
    //   return null;
    // });
  }

  render() {
    const { room, meeduConnect } = this.props.homeStore!;
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
          <MicrophoneButton />
          <div style={{ width: 25 }} />
          <CameraButton />
        </div>
      </div>
    );
  }
}

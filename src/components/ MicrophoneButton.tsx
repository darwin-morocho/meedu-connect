import React from "react";
import MeeduConnect from "../libs/video-call";
import { HomeStore } from "../mobx/home-state";
import { inject, observer } from "mobx-react";

@inject("homeStore")
@observer
export default class MicrophoneButton extends React.PureComponent<{
  homeStore?: HomeStore;
}> {
  constructor(props: any) {
    super(props);
  }

  render() {
    const { microphoneEnabled, meeduConnect } = this.props.homeStore!;
    return (
      <button
        className={`circle-button ${microphoneEnabled ? "primary" : "accent"}`}
        onClick={() => {
          meeduConnect.microphone(!microphoneEnabled);
          this.props.homeStore!.microphoneEnabled = !microphoneEnabled;
          //   this.setState({
          //     microphoneEnabled: !microphoneEnabled,
          //   });
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
  }
}

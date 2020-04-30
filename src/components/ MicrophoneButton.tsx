import React from "react";
import MeeduConnect from "../libs/video-call";

export default class MicrophoneButton extends React.PureComponent<
  { meeduConnect: MeeduConnect },
  { microphoneEnabled: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = {
      microphoneEnabled: this.props.meeduConnect.microphoneEnabled,
    };
  }

  render() {
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
  }
}

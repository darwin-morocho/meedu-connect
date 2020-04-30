import React from "react";
import MeeduConnect from "../libs/video-call";

export default class CameraButton extends React.PureComponent<
  {
    meeduConnect: MeeduConnect;
  },
  { cameraEnabled: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = {
      cameraEnabled: this.props.meeduConnect.cameraEnabled,
    };
  }

  render() {
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
  }
}

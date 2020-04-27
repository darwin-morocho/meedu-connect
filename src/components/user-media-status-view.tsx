import React from "react";
import { UserMediaStatus } from "../models";

const UserMediaStatusView = (data: UserMediaStatus) => (
  <div className="absolute top-0 left-0">
    <div className={`media-icon ${data.microphoneEnabled ? "active" : ""}`}>
      <img
        src={
          data.microphoneEnabled
            ? require("../assets/microphone.svg")
            : require("../assets/microphone-off.svg")
        }
        width={20}
      />
    </div>
    <div className={`media-icon ${data.cameraEnabled ? "active" : ""}`}>
      <img
        className="ma-left-15"
        src={
          data.cameraEnabled
            ? require("../assets/video-camera.svg")
            : require("../assets/video-camera-off.svg")
        }
        width={20}
      />
    </div>
  </div>
);

export default UserMediaStatusView;

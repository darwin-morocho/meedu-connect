import React from 'react';
import MeeduConnect from '../libs/signaling';
import { HomeStore } from '../mobx/home-state';
import { inject, observer } from 'mobx-react';
import { Tooltip } from 'antd';

@inject('homeStore')
@observer
export default class CameraButton extends React.PureComponent<{
  homeStore?: HomeStore;
}> {
  constructor(props: any) {
    super(props);
  }

  render() {
    const { cameraEnabled, meeduConnect } = this.props.homeStore!;

    return (
      <Tooltip title={cameraEnabled ? 'Desactivar cámara' : 'Activar cámara'}>
        <button
          className={`circle-button ${cameraEnabled ? 'primary' : 'accent'}`}
          onClick={() => {
            meeduConnect.camera(!cameraEnabled);
            this.props.homeStore!.cameraEnabled = !cameraEnabled;
          }}
        >
          <img
            src={
              cameraEnabled
                ? require('../assets/video-camera.svg')
                : require('../assets/video-camera-off.svg')
            }
          />
        </button>
      </Tooltip>
    );
  }
}

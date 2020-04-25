import React from 'react';
import auth from '../libs/auth';
import { Spin } from 'antd';
export default class Splash extends React.PureComponent<{
  history: any;
}> {
  async componentDidMount() {
    try {
      const token = await auth.getAccessToken();
      if (token) {
        this.props.history.push('/home');
      } else {
        this.props.history.push('/login');
      }
    } catch (e) {
      this.props.history.push('/login');
    }
  }

  render() {
    return (
      <div
        className="d-flex ai-center jc-center"
        style={{ height: '100vh', width: '100%' }}
      >
        <Spin size="large" />
      </div>
    );
  }
}

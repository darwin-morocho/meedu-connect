import React, { PureComponent } from 'react';
import styled from 'styled-components';
import {
  Layout,
  Menu,
  Breadcrumb,
  Button,
  Avatar,
  Popover,
  Divider,
  Tooltip,
  Popconfirm,
} from 'antd';
import { CaretDownOutlined } from '@ant-design/icons';

import auth from '../libs/auth';
const { Header, Content, Footer } = Layout;

const Container = styled.div`
  overflow: hidden;
  display: flex;
  height: 100vh;
  width: 100%;

  @media (max-width: 768px) {
    flex-direction: column;
  }

  #logo {
  }
  #nav {
    height: 60px;
    background-color: #f7f7f7;
    width: 100%;
    button {
      border: none;
      font-family: 'Roboto', sans-serif;
      cursor: pointer;
      background-color: transparent;
      color: #25364e;
      letter-spacing: 1px;
      padding-left: 20px;
      padding-right: 20px;
      height: 70px;
      font-size: 1.3em;
      &:hover {
        background-color: #0e1624;
      }
    }
  }
`;

export default class Template extends PureComponent<{
  children?: React.ReactNode;
}> {
  componentDidMount() {
    if (auth.user === null) {
      window.location.href = '/login';
    }
  }

  onLogOut = async () => {
    await auth.logOut();
    window.location.href = '/login';
  };

  /*
   {user && (
                  <Avatar size="large" style={{ backgroundColor: "#0099cc" }}>
                    {user.name.charAt(0)}
                    {user.lastName.charAt(0)}
                  </Avatar>
                )}
  */

  render() {
    const { children } = this.props;
    const user = auth.user;
    return (
      <Container>
        <div id="menu">
          <div></div>
          <Popconfirm
            placement={window.innerWidth > 768 ? 'right' : 'bottomRight'}
            title="Desea salir de su cuenta?"
            onCancel={() => {}}
            okText="SALIR"
            cancelText="Cancelar"
            onConfirm={() => {
              localStorage.clear();
              window.location.href = '/login';
            }}
          >
            <Tooltip title="Cerrar sesión" placement="right">
              <div className="menu-button">
                <img src="https://image.flaticon.com/icons/svg/1828/1828427.svg" />
              </div>
            </Tooltip>
          </Popconfirm>
        </div>
        <div id="content">{children}</div>
      </Container>
    );
  }
}

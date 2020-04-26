import React, { PureComponent } from "react";
import styled from "styled-components";
import {
  Layout,
  Menu,
  Breadcrumb,
  Button,
  Avatar,
  Popover,
  Divider,
} from "antd";
import { CaretDownOutlined } from "@ant-design/icons";

import auth from "../libs/auth";
const { Header, Content, Footer } = Layout;

const Container = styled.div`
  overflow: hidden;
  height: 100vh;
  #logo {
  }
  #nav {
    height: 70px;
    background-color: #f7f7f7;
    width: 100%;
    button {
      border: none;
      font-family: "Roboto", sans-serif;
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
      window.location.href = "/login";
    }
  }

  onLogOut = async () => {
    await auth.logOut();
    window.location.href = "/login";
  };

  render() {
    const { children } = this.props;
    const user = auth.user;
    return (
      <Container>
        <div id="nav" className="d-flex jc-space-between ai-center pa-hor-20">
          <div
            id="logo"
            className="d-flex ai-center jc-center pointer"
            onClick={() => (window.location.href = "/home")}
          >
            <img src={require("../assets/logo2.svg")} height={50} />
          </div>
          <div className="d-flex ai-center">
            <Divider type="vertical" className="ma-right-20" />
            <Popover
              placement="bottomRight"
              content={
                <div style={{ width: 170 }}>
                  <div className="menu-btn" onClick={this.onLogOut}>
                    Cerrar Sesion
                  </div>
                </div>
              }
            >
              <div className="pointer d-flex ai-center">
                {user && (
                  <Avatar size="large" style={{ backgroundColor: "#0099cc" }}>
                    {user.name.charAt(0)}
                    {user.lastName.charAt(0)}
                  </Avatar>
                )}
                {/* {user && (
                <div className="c-white ma-left-5 d-inline-block lh-100 t-center">
                  {user.name}
                  <br />
                  {user?.lastName}
                </div>
              )} */}
                <CaretDownOutlined className="ma-left-10" />
              </div>
            </Popover>
          </div>
        </div>
        {children}
      </Container>
    );
  }
}

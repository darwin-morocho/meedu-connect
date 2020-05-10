import React from 'react';
import moment from 'moment';
import Linkify from 'react-linkify';
import MeeduConnect from '../libs/signaling';
import { HomeStore } from '../mobx/home-state';
import { inject, observer } from 'mobx-react';

import { Input, Divider, message, List, Empty, notification } from 'antd';
import '../sass/chat.scss';

import { IMessage, IMessageType } from '../models';
import 'moment/locale/es';
import { compressImage, uploadBlob, uploadFile } from '../libs/firebase-upload';
import { ReactComponent } from '*.svg';

moment.locale('es');

@inject('homeStore')
@observer
export default class Chat extends React.Component<{
  homeStore?: HomeStore;
}> {
  state = {
    inputValue: '',
  };

  sendding = false;

  sendText = () => {
    if (this.state.inputValue.trim().length == 0) return;
    this.sendding = true;
    this.send(this.state.inputValue, IMessageType.text);
    this.setState({ inputValue: '' }, () => {
      setTimeout(() => {
        this.sendding = false;
      }, 200);
    });
  };

  send = (value: string, type: IMessageType) => {
    const { username, sendMessage } = this.props.homeStore!;
    const message: IMessage = {
      username,
      type,
      value: value,
      createdAt: new Date(),
      sender: true,
    };
    sendMessage(message);
    if (type !== IMessageType.text) {
      this.forceUpdate();
    }
  };

  onInputFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: IMessageType) => {
    if (e.target.files) {
      const { meetCode } = this.props.homeStore!;
      const file = e.target.files[0];
      if (file && type === IMessageType.image) {
        const blob = await compressImage(file);
        if (blob) {
          notification.info({
            message: 'Enviando imagen...',
            description: 'Por favor espere',
            placement: 'topRight',
          });

          const url = await uploadBlob(meetCode, blob, file);
          if (url) {
            this.send(url, IMessageType.image);
          } else {
            message.error('No se pudo enviar la imagen...');
          }
        }
      } else if (file) {
        const sizeInMB = file.size / (1024 * 1024);
        if (sizeInMB > 5) {
          notification.error({
            message: 'ERROR',
            description: 'Tamaño máximo permitido 5MB',
            placement: 'topRight',
          });
        } else {
          notification.info({
            message: 'Subiendo archivo...',
            description: 'Esto puede llevar varios segundos. Por favor espere.',
            placement: 'topRight',
          });
          const url = await uploadFile(meetCode, file);
          if (url) {
            this.send(url, IMessageType.file);
          } else {
            message.error('No se pudo enviar el archivo...');
          }
        }
      }
    }
  };

  render() {
    const { messages, viewImage, imageRefs, chatOpened } = this.props.homeStore!;
    const { inputValue } = this.state;
    return (
      <div id="chat" className={chatOpened ? 'open' : ''}>
        <div id="messages" className="messages">
          <List
            dataSource={messages}
            locale={{ emptyText: <Empty description="No hay mensajes para  mostrar" /> }}
            renderItem={(item: IMessage, index) => (
              <List.Item
                className={item.sender ? 'sender message' : 'message'}
                style={{ border: 'none' }}
              >
                <div className="ago">{moment(item.createdAt).fromNow()}</div>
                <div
                  className={`value ${item.type === IMessageType.image ? 'image' : ''}`}
                  onClick={() => {
                    if (item.type === IMessageType.image) {
                      viewImage(index);
                    }
                  }}
                >
                  {item.type === IMessageType.image && (
                    <img
                      ref={(ref) => {
                        if (ref) {
                          imageRefs.set(index, ref);
                        }
                      }}
                      src={item.value}
                    />
                  )}
                  {item.type === IMessageType.file && (
                    <div className="d-flex ai-center">
                      <a
                        className={item.sender ? 'c-white' : 'c-black'}
                        href={item.value}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <img
                          src="https://image.flaticon.com/icons/svg/748/748102.svg"
                          width={20}
                          height={20}
                        />
                        <span className="ma-left-10">Archivo adjunto</span>
                      </a>
                    </div>
                  )}
                  {item.type === IMessageType.text && (
                    <Linkify
                      componentDecorator={(href, text, key) => (
                        <a href={href} key={key} target="_blank" rel="noopener noreferrer">
                          {text}
                        </a>
                      )}
                    >
                      {item.value}
                    </Linkify>
                  )}
                </div>
                {!item.sender && <div className="username">{item.username}</div>}
              </List.Item>
            )}
          />
        </div>
        <div className="input-message">
          <Input.TextArea
            value={inputValue}
            autoSize
            placeholder="Ingresa tu mensaje aquí ..."
            onKeyDown={(e) => {
              if (e.key == 'Enter') {
                this.sendText();
              }
            }}
            onChange={(e) => {
              if (this.sendding) return;
              this.setState({ inputValue: e.target.value });
            }}
          />
          <div className="buttons">
            <label htmlFor="pick-image">
              <img src="https://image.flaticon.com/icons/svg/1837/1837526.svg" />
              <input
                id="pick-image"
                type="file"
                className="d-none"
                accept="image/*"
                onChange={(e) => {
                  this.onInputFileChange(e, IMessageType.image);
                }}
              />
            </label>
            <label htmlFor="pick-file">
              <img src="https://image.flaticon.com/icons/svg/748/748102.svg" />
              <input
                id="pick-file"
                type="file"
                className="d-none"
                onChange={(e) => {
                  this.onInputFileChange(e, IMessageType.file);
                }}
              />
            </label>

            <button onClick={this.sendText}>
              <img src="https://image.flaticon.com/icons/svg/2089/2089268.svg" />
            </button>
          </div>
        </div>
      </div>
    );
  }
}

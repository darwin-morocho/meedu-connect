import React from 'react';
import { Modal, Spin } from 'antd';

const Loading: React.FC<{ open: boolean }> = ({ open }) => (
  <Modal visible={open} footer={null} closable={false} centered width={200}>
    <div className="pa-40 t-center">
      <Spin size="large" />
    </div>
  </Modal>
);

export default Loading;

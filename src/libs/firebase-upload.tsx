import firebase from './firebase';

import { message } from 'antd';

function getFileExtension(name: string): string | null {
  const found = name.lastIndexOf('.') + 1;
  return found > 0 ? name.substr(found) : null;
}

// export interface MyUploadTask {
//   id: number;
//   callingId: string;
//   progress: number;
//   task: firebase.storage.UploadTask;
//   filename: string;
//   type: RecordTypes;
// }

// export interface FileUploadTask {
//   id: number;
//   progress: number;
//   task: firebase.storage.UploadTask;
//   filename: string;
//   type: 'image' | 'file';
// }

// export default class FirebaseUpload {
//   static addBlob(data: {
//     userId: number;
//     callingId: string;
//     blob: Blob;
//     type: RecordTypes;
//   }): MyUploadTask {
//     // Create a root reference
//     const storageRef = firebase.storage().ref();
//     const ext = data.type === RecordTypes.video ? '.webm' : '.ogg';
//     const filename = data.callingId + ext;
//     const path = `provider-${data.userId}/${data.callingId}/${filename}`;
//     const id = Date.now();
//     const task: firebase.storage.UploadTask = storageRef
//       .child(path)
//       .put(data.blob);
//     return {
//       id,
//       task,
//       progress: 0,
//       filename,
//       type: data.type,
//       callingId: data.callingId,
//     };
//   }

//   static uploadFile(data: {
//     file: File;
//     userId: number;
//     callingId: string;
//     type: 'image' | 'file';
//   }): FileUploadTask | null {
//     if (!data.file) return null;
//     const fileSize = data.file.size / 1024 / 1024;

//     if (fileSize > 10) {
//       message.error('Tamaño max. 10 MB');
//       return null;
//     }
//     const ext = getFileExtension(data.file.name);

//     // Create a root reference
//     const storageRef = firebase.storage().ref();

//     const filename = `${Date.now()}.${ext}`;
//     const id = Date.now();
//     // Create a reference to file
//     const path = `provider-${data.userId}/${data.callingId}/${filename}`;
//     const ref = storageRef.child(path);
//     const task = ref.put(data.file);
//     return { id, task, progress: 0, filename, type: data.type };
//   }
// }

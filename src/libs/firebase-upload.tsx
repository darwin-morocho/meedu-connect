import firebase from './firebase';

import { message } from 'antd';
import Compressor from 'compressorjs';

function getFileExtension(name: string): string | null {
  const found = name.lastIndexOf('.') + 1;
  return found > 0 ? name.substr(found) : null;
}

export const compressImage = async (file: File): Promise<Blob | null> => {
  return new Promise<Blob | null>((resolve, reject) => {
    new Compressor(file, {
      quality: 0.6,
      success(result) {
        resolve(result);
      },
      error(err) {
        console.log(err.message);
        resolve(null);
      },
    });
  });
};

export const uploadBlob = (meetCode: string, blob: Blob, file: File): Promise<string | null> => {
  console.log('uploading blob');
  return new Promise<string | null>((resolve, reject) => {
    // Create a root reference
    const storageRef = firebase.storage().ref();
    const ext = getFileExtension(file.name);
    const path = `meets/${meetCode}/images/${Date.now()}${ext}`;
    const task: firebase.storage.UploadTask = storageRef.child(path).put(blob);
    task.on(
      'state_changed',
      (snapshot) => {
        // Observe state change events such as progress, pause, and resume
        // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
        var progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log('Upload is ' + progress + '% done');
      },
      (error) => {
        console.log('uploading blob error', error);
      },
      async () => {
        const url = await task.snapshot.ref.getDownloadURL();
        console.log('uploading blob exito', url);
        resolve(url);
      }
    );
  });
};

export const uploadFile = (meetCode: string, file: File): Promise<string | null> => {
  console.log('uploading file');
  return new Promise<string | null>((resolve, reject) => {
    // Create a root reference
    const storageRef = firebase.storage().ref();
    const path = `meets/${meetCode}/files/${Date.now()}/${file.name}`;
    const task: firebase.storage.UploadTask = storageRef.child(path).put(file);
    task.on(
      'state_changed',
      (snapshot) => {
        // Observe state change events such as progress, pause, and resume
        // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
        var progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log('Upload is ' + progress + '% done');
      },
      (error) => {
        console.log('uploading file error', error);
      },
      async () => {
        const url = await task.snapshot.ref.getDownloadURL();
        console.log('uploading file exito', url);
        resolve(url);
      }
    );
  });
};

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

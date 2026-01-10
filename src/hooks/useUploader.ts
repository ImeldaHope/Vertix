import { useState, useCallback } from 'react';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/apiClient';
import { initUpload, completeUpload } from '../api/uploads';

const INPROG_KEY = 'upload_in_progress_v2';
const CHUNK_SIZE = 1024 * 1024 * 2; // 2MB

export default function useUploader() {
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const uploadInChunks = useCallback(async (fileUri: string, filename: string, mime: string, onProgress?: (p: number) => void) => {
    setUploading(true);
    setProgress(0);
    try {
      const info = await FileSystem.getInfoAsync(fileUri);
      const size = info.size || 0;
      const init = await initUpload({ filename, size, mime });
      const uploadId = init.data.uploadId;
      // persist meta for resume
      await AsyncStorage.setItem(INPROG_KEY, JSON.stringify({ uploadId, fileUri, filename, mime, size }));

      let offset = 0;
      while (offset < size) {
        const chunkSize = Math.min(CHUNK_SIZE, size - offset);
        const chunk = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64, position: offset, length: chunkSize }).catch(() => null);
        // create blob from base64
        const body = Buffer.from(chunk || '', 'base64');
        const start = offset;
        const end = offset + chunkSize - 1;
        const url = `${api.defaults.baseURL || ''}/uploads/${uploadId}`;

        // send chunk with fetch and Content-Range
        await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', url);
          const auth = (api.defaults.headers && api.defaults.headers.common && api.defaults.headers.common['Authorization']) || (api.defaults.headers && api.defaults.headers['Authorization']);
          if (auth) xhr.setRequestHeader('Authorization', auth);
          xhr.setRequestHeader('Content-Range', `bytes ${start}-${end}/${size}`);
          xhr.responseType = 'json';
          xhr.onload = () => {
            const p = (end + 1) / size;
            setProgress(p);
            if (onProgress) onProgress(p);
            resolve(null);
          };
          xhr.onerror = (e) => reject(e);
          xhr.send(body);
        });

        offset += chunkSize;
      }

      // complete
      await completeUpload(uploadId);
      await AsyncStorage.removeItem(INPROG_KEY).catch(() => null);
      setUploading(false);
      setProgress(1);
      return { success: true, uploadId };
    } catch (e) {
      console.warn('upload failed', e);
      setUploading(false);
      return { success: false, error: e };
    }
  }, []);

  const resumePending = useCallback(async (onProgress?: (p: number) => void) => {
    try {
      const raw = await AsyncStorage.getItem(INPROG_KEY);
      if (!raw) return null;
      const meta = JSON.parse(raw);
      // naive resume: re-run chunk upload from start; a smarter server would report received ranges
      return await uploadInChunks(meta.fileUri, meta.filename, meta.mime, onProgress);
    } catch (e) {
      return null;
    }
  }, [uploadInChunks]);

  return { progress, uploading, sendFile: uploadInChunks, resumePending };
}

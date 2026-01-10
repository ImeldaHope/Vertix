import api from './apiClient';

export async function initUpload(meta: { filename: string; size: number; mime: string }) {
  return api.post('/uploads/init', meta);
}

export async function completeUpload(uploadId: string) {
  return api.post(`/uploads/${uploadId}/complete`);
}

export async function uploadStatus(uploadId: string) {
  return api.get(`/uploads/${uploadId}/status`);
}

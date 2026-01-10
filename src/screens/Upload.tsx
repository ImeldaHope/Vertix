import React, { useState } from 'react';
import { View, Text, Button, Image, StyleSheet, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import * as FileSystem from 'expo-file-system';
import useUploader from '../hooks/useUploader';

export default function Upload({ navigation }: any) {
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [thumb, setThumb] = useState<string | null>(null);
  const [filename, setFilename] = useState<string>('video.mp4');
  const [mime, setMime] = useState<string>('video/mp4');
  const { progress, uploading, sendFile, resumePending } = useUploader();

  const pick = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Videos });
    if (!res.cancelled) {
      setVideoUri(res.uri);
      const info = await FileSystem.getInfoAsync(res.uri);
      setFilename(res.uri.split('/').pop() || 'video.mp4');
      // generate thumbnail
      try {
        const { uri } = await VideoThumbnails.getThumbnailAsync(res.uri, { time: 1000 });
        setThumb(uri);
      } catch {}
    }
  };

  const start = async () => {
    if (!videoUri) return;
    const info = await FileSystem.getInfoAsync(videoUri);
    const res = await sendFile(videoUri, filename, mime, (p) => {});
    if (res.success) {
      const body = res.response;
      // assume server returns uploadId and status
      navigation.navigate('Creator');
    } else {
      alert('Upload failed');
    }
  };

  const resume = async () => {
    const res = await resumePending();
    if (res && res.success) navigation.navigate('Creator');
    else alert('No pending upload or resume failed');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upload a video</Text>
      <Button title="Pick a video" onPress={pick} />
      {thumb && <Image source={{ uri: thumb }} style={styles.thumb} />}
      {videoUri && (
        <View style={{ marginTop: 12 }}>
          <Text>File: {filename}</Text>
          <Button title={uploading ? 'Uploading...' : 'Start upload'} onPress={start} disabled={uploading} />
          <View style={{ height: 8 }} />
          <Button title="Resume pending upload" onPress={resume} />
          <View style={{ marginTop: 8 }}>
            {uploading ? (
              <View style={{ alignItems: 'center' }}>
                <ActivityIndicator />
                <Text>{Math.round(progress * 100)}%</Text>
              </View>
            ) : null}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  thumb: { width: '100%', height: 240, marginTop: 12, backgroundColor: '#000' }
});

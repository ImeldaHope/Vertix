import React, { useCallback, useRef } from 'react';
import { View, Dimensions, StyleSheet } from 'react-native';
import { FlashList } from 'flash-list';
import VideoPlayer from '../components/VideoPlayer';
import useVideoFeed from '../hooks/useVideoFeed';

const { height } = Dimensions.get('window');

export default function Feed() {
  const { items, loadMore, preloadAround } = useVideoFeed();
  const viewableIndex = useRef<number>(0);

  const renderItem = useCallback(({ item, index }: any) => {
    const isActive = index === viewableIndex.current;
    return (
      <View style={styles.item}>
        <VideoPlayer id={item.id} uri={item.uri} isActive={isActive} />
      </View>
    );
  }, []);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems && viewableItems.length > 0) {
      const idx = viewableItems[0].index;
      viewableIndex.current = idx;
      preloadAround(idx);
    }
  }).current;

  return (
    <FlashList
      data={items}
      renderItem={renderItem}
      keyExtractor={(item: any) => item.id}
      estimatedItemSize={height}
      onEndReached={loadMore}
      viewabilityConfig={{ itemVisiblePercentThreshold: 80 }}
      onViewableItemsChanged={onViewableItemsChanged}
      showsVerticalScrollIndicator={false}
      horizontal={false}
      pagingEnabled
    />
  );
}

const styles = StyleSheet.create({
  item: {
    height,
    width: '100%'
  }
});

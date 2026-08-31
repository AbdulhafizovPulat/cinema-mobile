import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Modal,
  LayoutChangeEvent,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Lock,
  Maximize,
  Minimize,
  Maximize2,
  Sliders,
  Check,
} from 'lucide-react-native';
import { api } from '../services/api';

interface QualityOption {
  id: string;
  label: string;
  sub: string;
}

const QUALITY_OPTIONS: QualityOption[] = [
  { id: 'auto', label: 'Авто (1080p)', sub: 'Адаптивный поток' },
  { id: '1080p', label: '1080p Full HD', sub: 'Высочайшая чёткость' },
  { id: '720p', label: '720p HD', sub: 'Сбалансированное качество' },
  { id: '480p', label: '480p SD', sub: 'Экономия мобильного трафика' },
  { id: '360p', label: '360p Low', sub: 'Низкая скорость сети' },
];


export default function PlayerScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string }>() || {};
  const id = params.id;
  const router = useRouter();
  const videoRef = useRef<Video>(null);

  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [status, setStatus] = useState<AVPlaybackStatus | null>(null);
  const [showControls, setShowControls] = useState(true);

  // Player enhancements
  const [resizeMode, setResizeMode] = useState<ResizeMode>(ResizeMode.CONTAIN);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState<string>('auto');
  const [showQualityModal, setShowQualityModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [progressBarWidth, setProgressBarWidth] = useState(1);

  // Auto-hide controls timer
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startControlsTimer = () => {
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 5000);
  };

  useEffect(() => {
    if (showControls && isPlaying) {
      startControlsTimer();
    }
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [showControls, isPlaying]);

  // Dynamic screen orientation & gesture listener
  useEffect(() => {
    // Unlock screen orientation on player screen mount so device auto-rotation works
    ScreenOrientation.unlockAsync().catch(() => {});

    const subscription = ScreenOrientation.addOrientationChangeListener((event) => {
      const o = event.orientationInfo.orientation;
      if (
        o === ScreenOrientation.Orientation.LANDSCAPE_LEFT ||
        o === ScreenOrientation.Orientation.LANDSCAPE_RIGHT
      ) {
        setIsFullscreen(true);
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
      } else if (
        o === ScreenOrientation.Orientation.PORTRAIT_UP ||
        o === ScreenOrientation.Orientation.PORTRAIT_DOWN
      ) {
        setIsFullscreen(false);
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
      }
    });

    return () => {
      ScreenOrientation.removeOrientationChangeListener(subscription);
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    };
  }, []);

  useEffect(() => {
    const numericId = Number(id);
    if (!id || isNaN(numericId)) {
      setError('Неверный идентификатор фильма');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    api
      .getMovieStream(numericId)
      .then((res) => {
        if (res.videoUrl) {
          setStreamUrl(res.videoUrl);
        } else {
          setError('Ссылка на видео не найдена');
        }
      })
      .catch((err: any) => {
        setError(err.message || 'Ошибка доступа к потоку видео');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const togglePlayPause = async () => {
    if (!videoRef.current) return;
    try {
      if (isPlaying) {
        await videoRef.current.pauseAsync();
      } else {
        await videoRef.current.playAsync();
      }
      setIsPlaying(!isPlaying);
      setShowControls(true);
    } catch (err) {
      console.warn('Play/Pause error:', err);
    }
  };

  const seekRelative = async (seconds: number) => {
    if (!videoRef.current || !status || !status.isLoaded || typeof status.positionMillis !== 'number') return;
    const currentPos = status.positionMillis || 0;
    const duration = status.durationMillis || 0;

    let targetMillis = currentPos + seconds * 1000;
    if (duration > 0) {
      targetMillis = Math.max(0, Math.min(targetMillis, duration));
    } else {
      targetMillis = Math.max(0, targetMillis);
    }

    if (typeof targetMillis !== 'number' || isNaN(targetMillis) || !isFinite(targetMillis)) return;

    try {
      await videoRef.current.setPositionAsync(targetMillis);
      showToast(`${seconds > 0 ? '+' : ''}${seconds} сек`);
      setShowControls(true);
    } catch (err) {
      console.warn('Seek relative error:', err);
    }
  };

  const handleSeekTouch = async (evt: any) => {
    if (!videoRef.current || !status || !status.isLoaded || !status.durationMillis) return;

    let touchX = evt?.nativeEvent?.locationX;
    if (typeof touchX !== 'number' || isNaN(touchX)) {
      touchX = evt?.nativeEvent?.offsetX ?? evt?.nativeEvent?.layerX ?? 0;
    }

    const width = progressBarWidth > 0 ? progressBarWidth : 1;
    let percent = touchX / width;

    if (typeof percent !== 'number' || isNaN(percent) || !isFinite(percent)) return;
    percent = Math.max(0, Math.min(percent, 1));

    const targetMillis = Math.floor(percent * status.durationMillis);

    if (typeof targetMillis !== 'number' || isNaN(targetMillis) || !isFinite(targetMillis) || targetMillis < 0) return;

    try {
      await videoRef.current.setPositionAsync(targetMillis);
      setShowControls(true);
    } catch (err) {
      console.warn('Seek touch error:', err);
    }
  };

  const toggleResizeMode = () => {
    const nextMode = resizeMode === ResizeMode.CONTAIN ? ResizeMode.COVER : ResizeMode.CONTAIN;
    setResizeMode(nextMode);
    showToast(nextMode === ResizeMode.COVER ? 'Заполнить экран' : 'Вместить весь кадр');
  };

  const toggleFullscreen = async () => {
    try {
      if (!videoRef.current) return;
      if (isFullscreen) {
        try {
          await videoRef.current.dismissFullscreenPlayer();
        } catch {}
        try {
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        } catch {}
        setIsFullscreen(false);
      } else {
        try {
          await videoRef.current.presentFullscreenPlayer();
        } catch {}
        try {
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        } catch {}
        setIsFullscreen(true);
      }
    } catch (e) {
      console.warn('Fullscreen toggle error', e);
    }
  };

  const handleSelectQuality = (opt: QualityOption) => {
    setSelectedQuality(opt.id);
    setShowQualityModal(false);
    showToast(`Качество: ${opt.label}`);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  if (loading) {
    return (
      <View
        style={[
          styles.centerContainer,
          {
            paddingTop: Math.max(insets.top, 20),
            paddingBottom: Math.max(insets.bottom, 20),
            paddingLeft: Math.max(insets.left, 20),
            paddingRight: Math.max(insets.right, 20),
          },
        ]}
      >
        <StatusBar hidden />
        <ActivityIndicator size="large" color="#E50914" />
        <Text style={styles.statusText}>Проверка прав доступа к фильму...</Text>
      </View>
    );
  }

  if (error || !streamUrl) {
    return (
      <View
        style={[
          styles.centerContainer,
          {
            paddingTop: Math.max(insets.top, 20),
            paddingBottom: Math.max(insets.bottom, 20),
            paddingLeft: Math.max(insets.left, 20),
            paddingRight: Math.max(insets.right, 20),
          },
        ]}
      >
        <StatusBar hidden />
        <View style={styles.errorCard}>
          <Lock size={48} color="#E50914" />
          <Text style={styles.errorTitle}>Доступ ограничен</Text>
          <Text style={styles.errorSub}>{error || 'Требуется подписка или покупка фильма'}</Text>

          <TouchableOpacity style={styles.buyBtn} onPress={() => router.push('/(tabs)/subscribe')}>
            <Text style={styles.buyBtnText}>Оформить подписку</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
            <Text style={styles.backLinkText}>Вернуться назад</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const isLoaded = status && status.isLoaded;
  const positionMillis = isLoaded ? status.positionMillis || 0 : 0;
  const durationMillis = isLoaded ? status.durationMillis || 0 : 0;
  const progressPercent = durationMillis > 0 ? Math.max(0, Math.min((positionMillis / durationMillis) * 100, 100)) : 0;

  const currentQualityLabel = QUALITY_OPTIONS.find((q) => q.id === selectedQuality)?.label || 'HD';

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      <TouchableOpacity
        activeOpacity={1}
        style={styles.touchOverlay}
        onPress={() => setShowControls((prev) => !prev)}
      >
        <View style={styles.videoWrapper}>
          <Video
            ref={videoRef}
            source={{ uri: streamUrl }}
            style={styles.video}
            resizeMode={resizeMode}
            shouldPlay
            useNativeControls={false}
            onFullscreenUpdate={(event) => {
              if (event.fullscreenUpdate === 1 || event.fullscreenUpdate === 2) {
                setIsFullscreen(true);
                ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
              } else if (event.fullscreenUpdate === 3 || event.fullscreenUpdate === 0) {
                setIsFullscreen(false);
                ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
              }
            }}
            onPlaybackStatusUpdate={(s) => {
              setStatus(s);
              if (s.isLoaded) {
                setIsPlaying(s.isPlaying);
              }
            }}
          />
        </View>

        {/* Toast Popup Notification */}
        {toastMessage && (
          <View style={[styles.toastContainer, { top: Math.max(insets.top + 16, 60) }]}>
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        )}

        {/* Video Player Controls Overlay */}
        {showControls && (
          <View
            style={[
              styles.controlsContainer,
              {
                paddingTop: Math.max(insets.top, 16),
                paddingBottom: Math.max(insets.bottom, 16),
                paddingLeft: Math.max(insets.left, 16),
                paddingRight: Math.max(insets.right, 16),
              },
            ]}
          >
            {/* Top Bar */}
            <View style={styles.topBar}>
              <TouchableOpacity
                style={styles.controlIconBtn}
                onPress={async () => {
                  try {
                    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
                  } catch {}
                  router.back();
                }}
                activeOpacity={0.8}
              >
                <ArrowLeft size={22} color="#FFFFFF" />
              </TouchableOpacity>

              <Text style={styles.streamTitle} numberOfLines={1}>
                Воспроизведение
              </Text>

              {/* Action Buttons Top Right */}
              <View style={styles.topRightControls}>
                {/* Aspect ratio / Scale button */}
                <TouchableOpacity
                  style={styles.controlBadgeBtn}
                  onPress={toggleResizeMode}
                  activeOpacity={0.8}
                >
                  <Maximize2 size={16} color="#FFFFFF" />
                  <Text style={styles.badgeText}>
                    {resizeMode === ResizeMode.CONTAIN ? 'Вместить' : 'Кадр'}
                  </Text>
                </TouchableOpacity>

                {/* Quality button */}
                <TouchableOpacity
                  style={styles.controlBadgeBtn}
                  onPress={() => setShowQualityModal(true)}
                  activeOpacity={0.8}
                >
                  <Sliders size={16} color="#FFFFFF" />
                  <Text style={styles.badgeText}>{currentQualityLabel.split(' ')[0]}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Middle Controls (Rewind -10s, Play/Pause, Fast-Forward +10s) */}
            <View style={styles.middleControls}>
              {/* Rewind -10s button */}
              <TouchableOpacity
                style={styles.seekCircleBtn}
                onPress={() => seekRelative(-10)}
                activeOpacity={0.8}
              >
                <RotateCcw size={24} color="#FFFFFF" />
                <Text style={styles.seekBadgeText}>-10s</Text>
              </TouchableOpacity>

              {/* Big Play / Pause Button */}
              <TouchableOpacity
                style={styles.playBigBtn}
                onPress={togglePlayPause}
                activeOpacity={0.85}
              >
                {isPlaying ? (
                  <Pause size={34} color="#FFFFFF" />
                ) : (
                  <Play size={34} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: 4 }} />
                )}
              </TouchableOpacity>

              {/* Fast Forward +10s button */}
              <TouchableOpacity
                style={styles.seekCircleBtn}
                onPress={() => seekRelative(10)}
                activeOpacity={0.8}
              >
                <RotateCw size={24} color="#FFFFFF" />
                <Text style={styles.seekBadgeText}>+10s</Text>
              </TouchableOpacity>
            </View>

            {/* Bottom Section: Progress Bar & Time & Fullscreen Toggle */}
            <View style={styles.bottomBarContainer}>
              {/* Interactive Timeline Progress Bar */}
              <TouchableOpacity
                activeOpacity={1}
                style={styles.progressBarTouchArea}
                onPress={handleSeekTouch}
                onLayout={(e: LayoutChangeEvent) => {
                  const w = e.nativeEvent.layout.width;
                  if (w > 0) setProgressBarWidth(w);
                }}
              >
                <View style={styles.progressBarBackground}>
                  <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
                  <View style={[styles.progressKnob, { left: `${progressPercent}%` }]} />
                </View>
              </TouchableOpacity>

              {/* Time Row & Fullscreen Button */}
              <View style={styles.bottomInfoRow}>
                <View style={styles.timeBadgeContainer}>
                  <Text style={styles.timeText}>
                    {formatTime(positionMillis)} / {formatTime(durationMillis)}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.fullscreenBtn}
                  onPress={toggleFullscreen}
                  activeOpacity={0.8}
                >
                  {isFullscreen ? (
                    <Minimize size={20} color="#FFFFFF" />
                  ) : (
                    <Maximize size={20} color="#FFFFFF" />
                  )}
                  <Text style={styles.fullscreenText}>
                    {isFullscreen ? 'Свернуть' : 'На весь экран'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </TouchableOpacity>

      {/* Quality Options Modal */}
      <Modal
        visible={showQualityModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQualityModal(false)}
      >
        <TouchableOpacity
          style={[
            styles.modalOverlay,
            {
              paddingTop: Math.max(insets.top, 20),
              paddingBottom: Math.max(insets.bottom, 20),
              paddingLeft: Math.max(insets.left, 20),
              paddingRight: Math.max(insets.right, 20),
            },
          ]}
          activeOpacity={1}
          onPress={() => setShowQualityModal(false)}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Sliders size={20} color="#E50914" />
              <Text style={styles.modalTitle}>Выбор качества видео</Text>
            </View>

            {QUALITY_OPTIONS.map((opt) => {
              const isSelected = selectedQuality === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.qualityOptionRow, isSelected && styles.selectedOptionRow]}
                  onPress={() => handleSelectQuality(opt)}
                  activeOpacity={0.8}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optionLabel, isSelected && styles.selectedOptionText]}>
                      {opt.label}
                    </Text>
                    <Text style={styles.optionSub}>{opt.sub}</Text>
                  </View>

                  {isSelected && <Check size={20} color="#E50914" />}
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowQualityModal(false)}
            >
              <Text style={styles.modalCloseText}>Закрыть</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

/**
 * Formats time in milliseconds to readable format:
 * - If duration >= 1 hour: H:MM:SS
 * - If duration < 1 hour: M:SS
 */
function formatTime(millis: number): string {
  if (typeof millis !== 'number' || isNaN(millis) || !isFinite(millis) || millis < 0) return '0:00';
  const totalSeconds = Math.floor(millis / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (num: number) => (num < 10 ? `0${num}` : `${num}`);

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${minutes}:${pad(seconds)}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  touchOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#000000',
  },
  videoWrapper: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#09090D',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  statusText: {
    color: '#8A8A9E',
    fontSize: 14,
    marginTop: 12,
  },
  errorCard: {
    backgroundColor: '#161622',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#262638',
    width: '100%',
    maxWidth: 320,
  },
  errorTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 12,
  },
  errorSub: {
    color: '#8A8A9E',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  buyBtn: {
    backgroundColor: '#E50914',
    width: '100%',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  buyBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  backLink: {
    paddingVertical: 8,
  },
  backLinkText: {
    color: '#8A8A9E',
    fontSize: 13,
  },
  toastContainer: {
    position: 'absolute',
    top: 70,
    alignSelf: 'center',
    backgroundColor: 'rgba(229, 9, 20, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 10,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  controlsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'space-between',
    padding: 16,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  streamTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  topRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  controlBadgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  middleControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 36,
  },
  seekCircleBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  seekBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
  },
  playBigBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E50914',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E50914',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 10,
  },
  bottomBarContainer: {
    marginBottom: 10,
    gap: 10,
  },
  progressBarTouchArea: {
    paddingVertical: 10,
    justifyContent: 'center',
  },
  progressBarBackground: {
    height: 5,
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    position: 'relative',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#E50914',
    borderRadius: 3,
  },
  progressKnob: {
    position: 'absolute',
    top: -5,
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    marginLeft: -7.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  bottomInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeBadgeContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  timeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  fullscreenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  fullscreenText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#161622',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#262638',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#262638',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  qualityOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: '#09090D',
  },
  selectedOptionRow: {
    backgroundColor: 'rgba(229, 9, 20, 0.15)',
    borderWidth: 1,
    borderColor: '#E50914',
  },
  optionLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  selectedOptionText: {
    color: '#E50914',
  },
  optionSub: {
    color: '#8A8A9E',
    fontSize: 11,
    marginTop: 2,
  },
  modalCloseBtn: {
    marginTop: 12,
    backgroundColor: '#262638',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCloseText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, StyleSheet, Dimensions, ActivityIndicator, Text } from 'react-native';
import YoutubePlayer from "react-native-youtube-iframe";
import Video from 'react-native-video';
import apiClient from '../api/apiClient';

const { width } = Dimensions.get('window');

const VideoPlayerScreen = ({ route }) => {
    const { materialId, userId, videoUrl, title } = route.params;
    const playerRef = useRef(); // YouTube için ref şart
    const [playing, setPlaying] = useState(true);
    const [loading, setLoading] = useState(true);
    const [initialPosition, setInitialPosition] = useState(0);
    const [duration, setDuration] = useState(0);

    const getYoutubeId = (url) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };
    const youtubeId = getYoutubeId(videoUrl);

    // 1. Kaldığı yeri veritabanından getir
    useEffect(() => {
        const fetchProgress = async () => {
            try {
                // Rota kontrolü: Backend'de /api/academic ise burada sadece /academic yazılmalı
                const res = await apiClient.get(`/academic/get-progress/${userId}/${materialId}`);
                if (res.data.position) setInitialPosition(res.data.position);
            } catch (e) { console.log("İlerleme yüklenemedi"); }
            setLoading(false);
        };
        fetchProgress();
    }, []);

    // 2. YouTube için İlerleme Takibi (Zamanlayıcı)
    useEffect(() => {
        let interval;
        if (playing && youtubeId) {
            interval = setInterval(async () => {
                if (playerRef.current) {
                    const elapsed = await playerRef.current.getCurrentTime();
                    const total = await playerRef.current.getDuration();
                    if (elapsed > 0) saveProgress(elapsed, total);
                }
            }, 5000); // 5 saniyede bir kaydet
        }
        return () => clearInterval(interval);
    }, [playing, youtubeId]);

    const saveProgress = async (currentTime, totalDuration) => {
        try {
            // API yolu kontrolü! Eğer index.js'de app.use('/api', ...) varsa burası '/academic/...' olmalı
            await apiClient.post('/academic/save-progress', {
                user_id: userId,
                material_id: materialId,
                position: Math.floor(currentTime),
                duration: Math.floor(totalDuration)
            });
            console.log("Kaydedilen saniye:", Math.floor(currentTime));
        } catch (e) { console.log("Kayıt hatası:", e.message); }
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#007bff" /></View>;

    return (
        <View style={styles.container}>
            <Text style={styles.videoTitle}>{title}</Text>
            {youtubeId ? (
                <YoutubePlayer
                    ref={playerRef}
                    height={width * 0.56}
                    play={playing}
                    videoId={youtubeId}
                    initialPlayerParams={{ start: initialPosition }}
                    onChangeState={(state) => {
                        if (state === "playing") setPlaying(true);
                        else setPlaying(false);
                    }}
                />
            ) : (
                <Video
                    source={{ uri: videoUrl }}
                    style={styles.localVideo}
                    controls={true}
                    onProgress={(data) => {
                        if (Math.floor(data.currentTime) % 5 === 0) {
                            saveProgress(data.currentTime, data.seekableDuration);
                        }
                    }}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
    videoTitle: { color: '#fff', fontSize: 16, textAlign: 'center', marginBottom: 20 },
    localVideo: { width: width, height: width * 0.56 }
});

export default VideoPlayerScreen;
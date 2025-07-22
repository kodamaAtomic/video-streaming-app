import React, { useEffect, useState } from 'react';

const VideoPlayer = ({ videoId }) => {
    const [videoSrc, setVideoSrc] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchVideo = async () => {
            try {
                const response = await fetch(`/api/videos/${videoId}`);
                const data = await response.json();
                setVideoSrc(data.videoUrl);
                setIsLoading(false);
            } catch (error) {
                console.error('Error fetching video:', error);
                setIsLoading(false);
            }
        };

        fetchVideo();
    }, [videoId]);

    if (isLoading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="video-player">
            <video controls>
                <source src={videoSrc} type="video/mp4" />
                Your browser does not support the video tag.
            </video>
        </div>
    );
};

export default VideoPlayer;
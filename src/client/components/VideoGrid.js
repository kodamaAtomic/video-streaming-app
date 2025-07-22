import React, { useEffect, useState } from 'react';

const VideoGrid = () => {
    const [videos, setVideos] = useState([]);

    useEffect(() => {
        const fetchVideos = async () => {
            const response = await fetch('/api/videos');
            const data = await response.json();
            setVideos(data);
        };

        fetchVideos();
    }, []);

    return (
        <div className="video-grid">
            {videos.map(video => (
                <div key={video.id} className="video-item">
                    <img src={video.thumbnail} alt={video.title} />
                    <h3>{video.title}</h3>
                    <a href={`/video/${video.id}`} className="play-button">Play</a>
                </div>
            ))}
        </div>
    );
};

export default VideoGrid;
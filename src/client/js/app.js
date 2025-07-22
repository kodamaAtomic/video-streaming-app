const videoGrid = document.getElementById('video-grid');
const videoPlayer = document.getElementById('video-player');
const videoSource = document.getElementById('video-source');

async function fetchVideos() {
    const response = await fetch('/api/videos');
    const videos = await response.json();
    displayVideos(videos);
}

function displayVideos(videos) {
    videoGrid.innerHTML = '';
    videos.forEach(video => {
        const videoElement = document.createElement('video');
        videoElement.src = video.url;
        videoElement.controls = true;
        videoElement.addEventListener('click', () => playVideo(video.url));
        
        const thumbnailElement = document.createElement('img');
        thumbnailElement.src = video.thumbnailUrl;
        thumbnailElement.alt = video.title;
        thumbnailElement.classList.add('thumbnail');
        thumbnailElement.addEventListener('click', () => playVideo(video.url));

        const videoContainer = document.createElement('div');
        videoContainer.classList.add('video-container');
        videoContainer.appendChild(thumbnailElement);
        videoContainer.appendChild(videoElement);
        
        videoGrid.appendChild(videoContainer);
    });
}

function playVideo(url) {
    videoSource.src = url;
    videoPlayer.load();
    videoPlayer.play();
}

document.addEventListener('DOMContentLoaded', fetchVideos);
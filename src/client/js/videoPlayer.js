const videoPlayer = document.getElementById('videoPlayer');
const videoList = document.getElementById('videoList');

function loadVideos() {
    fetch('/api/videos')
        .then(response => response.json())
        .then(videos => {
            videos.forEach(video => {
                const videoItem = document.createElement('div');
                videoItem.classList.add('video-item');
                videoItem.innerHTML = `
                    <img src="${video.thumbnail}" alt="${video.title}" onclick="playVideo('${video.id}')">
                    <p>${video.title}</p>
                `;
                videoList.appendChild(videoItem);
            });
        })
        .catch(error => console.error('Error loading videos:', error));
}

function playVideo(videoId) {
    fetch(`/api/videos/${videoId}`)
        .then(response => response.json())
        .then(video => {
            videoPlayer.src = video.url;
            videoPlayer.play();
        })
        .catch(error => console.error('Error playing video:', error));
}

document.addEventListener('DOMContentLoaded', loadVideos);
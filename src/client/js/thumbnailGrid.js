const thumbnailGrid = document.getElementById('thumbnail-grid');

async function fetchThumbnails() {
    try {
        const response = await fetch('/api/thumbnails');
        const thumbnails = await response.json();
        displayThumbnails(thumbnails);
    } catch (error) {
        console.error('Error fetching thumbnails:', error);
    }
}

function displayThumbnails(thumbnails) {
    thumbnailGrid.innerHTML = '';
    thumbnails.forEach(thumbnail => {
        const thumbnailElement = document.createElement('div');
        thumbnailElement.className = 'thumbnail';
        thumbnailElement.innerHTML = `
            <img src="${thumbnail.url}" alt="${thumbnail.title}" />
            <p>${thumbnail.title}</p>
        `;
        thumbnailElement.addEventListener('click', () => {
            playVideo(thumbnail.videoId);
        });
        thumbnailGrid.appendChild(thumbnailElement);
    });
}

function playVideo(videoId) {
    const videoPlayer = document.getElementById('video-player');
    videoPlayer.src = `/api/videos/${videoId}`;
    videoPlayer.play();
}

document.addEventListener('DOMContentLoaded', fetchThumbnails);
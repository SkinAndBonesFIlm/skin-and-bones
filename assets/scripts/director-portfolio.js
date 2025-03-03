// Scroll capture (desktop)
let portfolioScrollPos = 0;
let portfolioScrollDelta = 0;
let portfolioPrevScrollDelta = 0;
let portfolioThreshold = 75;
window.addEventListener('wheel', (event) => {
	portfolioScrollPos += event.deltaY;
	portfolioScrollDelta = Math.floor((portfolioScrollPos / portfolioThreshold)) * portfolioThreshold;

	const portfolio = document.querySelector('.director-portfolio-work');
	const workItem = document.querySelector('.director-portfolio-work-item');
	const workItemHeight = workItem.getBoundingClientRect().height;
	if (window.innerWidth > 1030 && !menuOpen) {
		let difference = Math.abs(portfolioPrevScrollDelta - portfolioScrollDelta);
		if (difference > 50) {
			if (event.deltaY > 0) {
				portfolio.scrollTop += (workItemHeight + 24);
			} else {
				portfolio.scrollTop -= (workItemHeight + 24);
			}
			portfolio.scrollTop = roundToNearestMultiple(portfolio.scrollTop, (workItemHeight + 24));
		}
		portfolioPrevScrollDelta = portfolioScrollDelta;
	}
});
window.addEventListener('resize', () => {
	const portfolio = document.querySelector('.director-portfolio-work');
	portfolio.scrollTop = 0;
})

// Helper function for time formatting
function formatTime(seconds) {
	const minutes = Math.floor(seconds / 60);
	const secs = seconds % 60;
	return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// Lightbox
function openLightbox(videoURL, client, project) {
	const nav = document.querySelector('.nav');
	nav.dataset.lightbox = 1;

	const lightbox = document.querySelector('.director-portfolio-lightbox');
	lightbox.dataset.active = 1;

	const videoSource = document.querySelector('.director-portfolio-lightbox-media-video source');
	videoSource.src = videoURL;
	const video = document.querySelector('.director-portfolio-lightbox-media-video');
	video.load();
	playVideo();

	const captionClient = document.querySelector('#client');
	captionClient.innerText = client;
	const captionProject = document.querySelector('#project');
	captionProject.innerText = project;

	const currentTime = document.querySelector('.director-portfolio-lightbox-controls-time-current');
	currentTime.innerText = '00:00';

	const progress = document.querySelector('.director-portfolio-lightbox-media-playbar-meter-progress');
	progress.style.width = '0%';
}
function closeLightbox() {
	const nav = document.querySelector('.nav');
	nav.dataset.lightbox = 0;

	const lightbox = document.querySelector('.director-portfolio-lightbox');
	lightbox.dataset.active = 0;
	const videoSource = document.querySelector('.director-portfolio-lightbox-media-video source');
	videoSource.src = "";
	const video = document.querySelector('.director-portfolio-lightbox-media-video');
	video.load();
}
function pauseVideo() {
	const playButton = document.querySelector('.director-portfolio-lightbox-controls-play');
	const pauseButton = document.querySelector('.director-portfolio-lightbox-controls-pause');
	playButton.dataset.active = 0;
	pauseButton.dataset.active = 1;

	const video = document.querySelector('.director-portfolio-lightbox-media-video');
	video.pause();
}
function playVideo() {
	const playButton = document.querySelector('.director-portfolio-lightbox-controls-play');
	const pauseButton = document.querySelector('.director-portfolio-lightbox-controls-pause');
	playButton.dataset.active = 1;
	pauseButton.dataset.active = 0;

	const video = document.querySelector('.director-portfolio-lightbox-media-video');
	video.play();
}
function toggleVideo() {
	const video = document.querySelector('.director-portfolio-lightbox-media-video');
	let fullscreen = checkFullscreen();
	if (fullscreen) {
		return
	}
	if (video.paused) {
		playVideo();
	} else {
		pauseVideo();
	}
}

// Scrub video
let videoProgress = 0;
function setProgress(e) {
	pauseVideo();

	e.preventDefault();
	// Mouse vs touch event
	let point;
	if (e.touches) {
		point = e.touches[0];
	} else {
		point = e;
	}

	const playbar = document.querySelector('.director-portfolio-lightbox-media-playbar');
	const progress = document.querySelector('.director-portfolio-lightbox-media-playbar-meter-progress');
	const rect = playbar.getBoundingClientRect();
	let xPercent = (point.clientX - rect.left) / rect.width;
	if (xPercent <= 0) {
		xPercent = 0;
	} else if (xPercent >= 1) {
		xPercent = 1;
	}
	progress.style.width = `${xPercent * 100}%`;
	videoProgress = xPercent;
	setNewVideoTime();

	function update(e) {
		// Mouse vs touch event
		let point;
		if (e.touches) {
			point = e.touches[0];
		} else {
			point = e;
		}

		const playbar = document.querySelector('.director-portfolio-lightbox-media-playbar');
		const progress = document.querySelector('.director-portfolio-lightbox-media-playbar-meter-progress');
		const rect = playbar.getBoundingClientRect();
		let xPercent = (point.clientX - rect.left) / rect.width;
		if (xPercent <= 0) {
			xPercent = 0;
		} else if (xPercent >= 1) {
			xPercent = 1;
		}
		progress.style.width = `${xPercent * 100}%`;
		videoProgress = xPercent;
		setNewVideoTime();
	}
	function release() {
		playVideo();

		window.removeEventListener('mousemove', update);
		window.removeEventListener('touchmove', update);
		window.removeEventListener('mouseup', release);
		window.removeEventListener('touchend', release);
	}

	window.addEventListener('mousemove', update);
	window.addEventListener('touchmove', update);
	window.addEventListener('mouseup', release);
	window.addEventListener('touchend', release);
}
function setNewVideoTime() {
	const video = document.querySelector('.director-portfolio-lightbox-media-video');
	video.currentTime = Math.round(video.duration*videoProgress);
}
const video = document.querySelector('.director-portfolio-lightbox-media-video');
video.addEventListener('timeupdate', () => {
	const progress = document.querySelector('.director-portfolio-lightbox-media-playbar-meter-progress');
	progress.style.width = `${100 * (video.currentTime / video.duration)}%`;
	const currentTime = document.querySelector('.director-portfolio-lightbox-controls-time-current');
	currentTime.innerText = formatTime(Math.floor(video.currentTime));
})
video.addEventListener('loadeddata', () => {
	const totalTime = document.querySelector('.director-portfolio-lightbox-controls-time-total');
	totalTime.innerText = formatTime(Math.floor(video.duration));
})

// Range converter helper function
function convertRange(value, oldRangeMin, oldRangeMax, newRangeMin, newRangeMax) {
	return (
		((value - oldRangeMin) * (newRangeMax - newRangeMin)) /
		(oldRangeMax - oldRangeMin) +
		newRangeMin
	);
}

// Lightbox volume
let volume = 12;
function setVolume(e) {
	e.preventDefault();
	// Mouse vs touch event
	let point;
	if (e.touches) {
		point = e.touches[0];
	} else {
		point = e;
	}

	const levels = document.querySelector('.director-portfolio-lightbox-volume-levels');
	const rect = levels.getBoundingClientRect();
	const yPercent = 1 - ((point.clientY - rect.top) / rect.height);
	const adjustedValue = convertRange(yPercent, 0, 1, 0, 12);
	volume = Math.round(adjustedValue);
	if (volume <= 0) {
		volume = 0;
	} else if (volume >= 12) {
		volume = 12;
	}
	updateVolume();

	function update(e) {
		// Mouse vs touch event
		let point;
		if (e.touches) {
			point = e.touches[0];
		} else {
			point = e;
		}

		const yPercent = 1 - ((point.clientY - rect.top) / rect.height);
		const adjustedValue = convertRange(yPercent, 0, 1, 0, 12);
		volume = Math.round(adjustedValue);
		if (volume <= 0) {
			volume = 0;
		} else if (volume >= 12) {
			volume = 12;
		}
		updateVolume();
	}
	function release() {
		window.removeEventListener('mousemove', update);
		window.removeEventListener('touchmove', update);
		window.removeEventListener('mouseup', release);
		window.removeEventListener('touchend', release);
	}

	window.addEventListener('mousemove', update);
	window.addEventListener('touchmove', update);
	window.addEventListener('mouseup', release);
	window.addEventListener('touchend', release);
}
function updateVolume() {
	let i = 0;
	for (let bar of document.querySelectorAll('.director-portfolio-lightbox-volume-levels div')) {
		if (i + 1 <= volume) {
			bar.dataset.active = 1;
		} else {
			bar.dataset.active = 0;
		}
		i++;
	}
	const video = document.querySelector('.director-portfolio-lightbox-media-video');
	video.volume = volume/12;
}
function volumeUp() {
	volume++;
	if (volume > 12) {
		volume = 12;
	}
	updateVolume();
}
function volumeDown() {
	volume--;
	if (volume < 0) {
		volume = 0;
	}
	updateVolume();
}

// Fullscreen
function toggleFullscreen() {
	const video = document.querySelector('.director-portfolio-lightbox-media-video');
	if (video.webkitEnterFullScreen) {
        video.webkitEnterFullScreen();
    } else {
		video.requestFullscreen();
	}
}
function checkFullscreen() {
	return document.fullscreenElement === video;
}
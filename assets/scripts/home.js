// Scroll capture (desktop)
let scrollPos = 0;
let scrollDelta = 0;
let prevScrollDelta = 0;
let threshold = 50;
document.addEventListener('wheel', (event) => {
	scrollPos += event.deltaY;
	scrollDelta = Math.floor((scrollPos / threshold)) * threshold;
	if (window.innerWidth > 1030) {
		if (!menuOpen) {
			if (prevScrollDelta != scrollDelta) {
				if (event.deltaY > 0) {
					scrollDown();
				} else {
					scrollUp();
				}
			}
		}
		prevScrollDelta = scrollDelta;
	}
});

// Detect scroll directions
function scrollDown() {
	let direction = false; // alternate scroll directions
	for (const column of document.querySelectorAll('.home-column')) {
		direction = !direction;
		if (direction) {
			scrollColumnDown(column);
		} else {
			scrollColumnUp(column);
		}
	}
}
function scrollUp() {
	let direction = true; // alternate scroll directions
	for (const column of document.querySelectorAll('.home-column')) {
		direction = !direction;
		if (direction) {
			scrollColumnDown(column);
		} else {
			scrollColumnUp(column);
		}
	}
}

// Scroll individual column
function scrollColumnUp(column) {
	const divs = column.querySelectorAll('.home-cell-text div');
	let overflowStore;
	for (let i = 0; i < divs.length; i++) {
		let currentSpan = divs[i];
		let currentSpanContent = currentSpan.innerHTML;
		if (i == 0) {
			overflowStore = currentSpanContent;
		} else {
			divs[i - 1].innerHTML = currentSpanContent;
		}
	}
	divs[divs.length - 1].innerHTML = overflowStore;
}
function scrollColumnDown(column) {
	const divs = column.querySelectorAll('.home-cell-text div');
	let overflowStore;
	for (let i = divs.length - 1; i >= 0; i--) {
		let currentSpan = divs[i];
		let currentSpanContent = currentSpan.innerHTML;
		if (i == divs.length - 1) {
			overflowStore = currentSpanContent;
		} else {
			divs[i + 1].innerHTML = currentSpanContent;
		}
	}
	divs[0].innerHTML = overflowStore;
}

// Random entry picker helper function
function getRandomEntries(arr) {
	let copy = [...arr]; // Create a copy to avoid modifying the original
	let result = [];

	for (let i = 0; i < arr.length; i++) {
		let index = Math.floor(Math.random() * copy.length);
		result.push(copy.splice(index, 1)[0]); // Remove and store item
	}

	return result;
}

// Pick videos
function pickVideos() {
	let randomVideos = getRandomEntries(homeVideos);

	let i = 0;
	for (let video of document.querySelectorAll('video')) {
		videoSource = video.querySelector('source');
		video.poster = randomVideos[i][0];
		video.style.backgroundImage = `url('${randomVideos[i][0]}')`;
		video.setAttribute("playsinline", "");
		video.setAttribute("muted", "");

		// Set video URL
		video.parentElement.href = '/directors/' + randomVideos[i][2];

		// Some directors only have an image, so show the poster and skip the video
		if (randomVideos[i][1] == '') {
			i++;
			continue
		}
		videoSource.src = randomVideos[i][1];

		if (window.innerWidth > 1030 && video.classList.contains('desktop-video')) {
			if (video.readyState === 4) {
				video.play();
			} else {
				video.load();
				video.play();
			}
		} else if (window.innerWidth <= 1030 && video.classList.contains('mobile-video')) {
			if (video.readyState === 4) {
				video.play();
			} else {
				video.load();
				video.play();
			}
		}

		i++;
	}
}
pickVideos();

window.addEventListener('resize', () => {
	for (let video of document.querySelectorAll('video')) {
		if (!video.querySelector('source').getAttribute('src')) {
			continue
		}
		if (window.innerWidth > 1030 && video.classList.contains('desktop-video')) {
			if (video.readyState === 4) {
				video.play();
			} else {
				video.load();
				video.play();
			}
		} else if (window.innerWidth <= 1030 && video.classList.contains('mobile-video')) {
			if (video.readyState === 4) {
				video.play();
			} else {
				video.load();
				video.play();
			}
		}
	}
});

// Mobile text animation
let groups = ['group1', 'group2', 'group3', 'group4', 'group5', 'group6', 'group7', 'group8'];
function animateMobile() {
	for (let group of groups) {
		let elements = document.querySelectorAll(`[data-mobile="${group}"] div`);
		let temp = '';
		for (let i = 0; i < elements.length; i++) {
			if (i == 0) {
				temp = elements[i].innerText;
			}
			if (i == elements.length - 1) {
				elements[i].innerText = temp;
			} else {
				elements[i].innerText = elements[i + 1].innerText;
			}
		}
	}
}
setInterval(animateMobile, 200);
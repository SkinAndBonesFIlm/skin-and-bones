const container = document.querySelector('.directors');

// Handle mouseleave event
container.addEventListener('mouseleave', () => {
	unhighlightDirectors();
})
let leaveDelay;

// Shuffle helper function
function shuffle(array) {
	let currentIndex = array.length;

	// While there remain elements to shuffle...
	while (currentIndex != 0) {

		// Pick a remaining element...
		let randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex--;

		// And swap it with the current element.
		[array[currentIndex], array[randomIndex]] = [
			array[randomIndex], array[currentIndex]];
	}
}


// Build portfolio links
let mediaItems = [];
for (let key of Object.keys(directorsMedia)) {
	const media = directorsMedia[key];
	const slug = `/directors/${key}/`;
	let i = 0;
	for (let entry of media) {
		// Build link element
		let link = document.createElement('a');
		link.href = slug;
		link.classList.add('directors-link');
		link.dataset.director = key;
		if (entry['thumbnail'] != '') {
			link.dataset.thumbnail = `${key}/${entry['thumbnail']}`; // loaded later by thumbnailObserver
		}

		// Add to array for sorting later
		if (mediaItems[i] != undefined) {
			mediaItems[i].push(link);
		} else {
			mediaItems[i] = [link];
		}

		// Event listeners
		link.addEventListener('mouseenter', () => {
			clearTimeout(leaveDelay);
			highlightDirector(key);
		})
		link.addEventListener('mouseleave', () => {
			leaveDelay = setTimeout(() => {
				unhighlightDirectors();
			}, 100)
		})
		i++;
	}
}

// Add all links to DOM in order
for (let links of mediaItems) {
	shuffle(links);
	for (let link of links) {
		container.appendChild(link);
	}
}

// Only load thumbnails once they’re on screen, so the first screen loads first
function loadThumbnail(link) {
	if (link.dataset.thumbnail) {
		link.style.backgroundImage = `url('${link.dataset.thumbnail}')`;
		delete link.dataset.thumbnail;
	}
}
const thumbnailObserver = new IntersectionObserver((entries) => {
	for (let entry of entries) {
		if (entry.isIntersecting) {
			loadThumbnail(entry.target);
			thumbnailObserver.unobserve(entry.target);
		}
	}
}, { rootMargin: '200px' });
for (let link of document.querySelectorAll('.directors-link')) {
	thumbnailObserver.observe(link);
}

// Once the page has loaded, quietly load the rest so scrolling doesn’t show empty cells
window.addEventListener('load', () => {
	setTimeout(() => {
		for (let link of document.querySelectorAll('.directors-link')) {
			loadThumbnail(link);
			thumbnailObserver.unobserve(link);
		}
	}, 1000);
});

// Scroll capture (desktop)
let directorsScrollPos = 0;
let directorsScrollDelta = 0;
let directorsPrevScrollDelta = 0;
let directorsThreshold = 75;
window.addEventListener('wheel', (event) => {
	directorsScrollPos += event.deltaY;
	directorsScrollDelta = Math.floor((directorsScrollPos / directorsThreshold)) * directorsThreshold;

	if (window.innerWidth > 1030 && !menuOpen) {
		let difference = Math.abs(directorsPrevScrollDelta - directorsScrollDelta);
		if (difference > 50) {
			if (event.deltaY > 0) {
				scrollUp();
			} else {
				scrollDown();
			}
		}
		directorsPrevScrollDelta = directorsScrollDelta;
	}
});

// Handle scrolling for infinite scrolling
function scrollUp() {
	const directors = document.querySelector('.directors');
	let allLinks = document.querySelectorAll('.directors-link');
	let columns = 6;
	if (window.innerWidth < 1300) {
		columns = 4;
	} else if (window.innerWidth < 1500) {
		columns = 5;
	}
	for (let i=0; i<columns; i++) {
		directors.appendChild(allLinks[i]);
	}
}
function scrollDown() {
	const directors = document.querySelector('.directors');
	let allLinks = document.querySelectorAll('.directors-link');
	allLinks = [...allLinks].reverse();
	let columns = 6;
	if (window.innerWidth < 1300) {
		columns = 4;
	} else if (window.innerWidth < 1500) {
		columns = 5;
	}
	for (let i=0; i<columns; i++) {
		directors.prepend(allLinks[i]);
	}
}

// Hover highlighting current director
function highlightDirector(director) {
	if (window.innerWidth <= 1030) {
		unhighlightDirectors();
		return
	}

	// Thumbnail links
	for (let directorLink of document.querySelectorAll(`.directors-link`)) {
		if (directorLink.dataset.director == director) {
			directorLink.dataset.active = 1;
		} else {
			directorLink.dataset.active = 0;
		}
	}

	// Nav links
	for (let navLink of document.querySelectorAll('.nav-directors a')) {
		if (navLink.dataset.director == director) {
			navLink.dataset.active = 1;
		} else {
			navLink.dataset.active = 0;
		}
	}
}
function unhighlightDirectors() {
	// Thumbnail links
	for (let directorLink of document.querySelectorAll(`.directors-link`)) {
		directorLink.dataset.active = 1;
	}

	// Nav links
	for (let navLink of document.querySelectorAll('.nav-directors a')) {
		navLink.dataset.active = 1;
	}
}

// Add event listeners to all nav links
for (let navLink of document.querySelectorAll('.nav-directors a')) {
	navLink.addEventListener('mouseenter', () => {
		highlightDirector(navLink.dataset.director);
	})
	navLink.addEventListener('mouseleave', () => {
		unhighlightDirectors();
	})
}
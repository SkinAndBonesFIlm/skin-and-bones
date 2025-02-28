// Scroll capture (desktop)
let aboutScrollPos = 0;
let aboutScrollDelta = 0;
let aboutPrevScrollDelta = 0;
let aboutThreshold = 75;
window.addEventListener('wheel', (event) => {
	aboutScrollPos += event.deltaY;
	aboutScrollDelta = Math.floor((aboutScrollPos / aboutThreshold)) * aboutThreshold;

	const about = document.querySelector('.about-text');
	if (window.innerWidth > 1030 && !menuOpen) {
		let difference = Math.abs(aboutPrevScrollDelta - aboutScrollDelta);
		if (difference > 50) {
			if (event.deltaY > 0) {
				about.scrollTop += 22.5;
			} else {
				about.scrollTop -= 22.5;
			}
			about.scrollTop = roundToNearestMultiple(about.scrollTop, 22.5);
		}
		aboutPrevScrollDelta = aboutScrollDelta;
	}
});

// Images
let currentImage = 0;
function nextImage() {
	currentImage++;
	if (currentImage >= aboutImages.length) {
		currentImage = 0;
	}

	let nextImage = currentImage + 1;
	if (nextImage >= aboutImages.length) {
		nextImage = 0;
	}

	const imageBig = document.querySelector('.about-media-big');
	imageBig.src = aboutImages[currentImage]['file'];

	const imageSmall = document.querySelector('.about-media-small');
	imageSmall.src = aboutImages[nextImage]['file'];

	const caption = document.querySelector('.about-media-caption-text');
	caption.innerText = aboutImages[currentImage]['text'];
}

// Awards list
function toggleAwards() {
	const awardsTitle = document.querySelector('.about-text-awards-title');
	const awards = document.querySelector('.about-text-awards');
	if (parseInt(awardsTitle.dataset.active) == 0) {
		awardsTitle.dataset.active = 1;
		awards.dataset.active = 1;
	} else {
		awardsTitle.dataset.active = 0;
		awards.dataset.active = 0;
	}
}

// Force award links to open in new tab
for (let awardLink of document.querySelectorAll('.about-text-awards a')) {
	awardLink.addEventListener('click', (e) => {
		e.preventDefault();
		window.open(awardLink.href, '_blank').focus();
	})
}
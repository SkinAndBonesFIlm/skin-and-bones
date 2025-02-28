// Close news or contact if clicked outside of
document.addEventListener('click', function(event) {
	const container = document.querySelector('.container');
	const news = document.querySelector('.news');
	const contact = document.querySelector('.contact');
	if (menuOpen && window.innerWidth > 1030) {
		if (container.dataset.view == "news") {
			if (!news.contains(event.target)) {
				container.dataset.view = 'default';
				menuOpen = false;
			}
		}
		if (container.dataset.view == "contact") {
			if (!contact.contains(event.target)) {
				container.dataset.view = 'default';
				menuOpen = false;
			}
		}
	}
});

// Contact and news menus
let menuOpen = false;
function toggleContact() {
	const container = document.querySelector('.container');
	if (container.dataset.view != 'contact') {
		container.dataset.view = 'contact';
		setTimeout(() => {menuOpen = true;}, 50);
	} else {
		container.dataset.view = 'default';
		menuOpen = false;
	}
}
function toggleNews() {
	const container = document.querySelector('.container');
	if (container.dataset.view != 'news') {
		container.dataset.view = 'news';
		setTimeout(() => {menuOpen = true;}, 50);
	} else {
		container.dataset.view = 'default';
		menuOpen = false;
	}
}
function toggleMenu() {
	const container = document.querySelector('.container');
	if (container.dataset.view != 'menu') {
		container.dataset.view = 'menu';
		menuOpen = true;
	} else {
		container.dataset.view = 'default';
		menuOpen = false;
	}
}

// Helper function for matching to nearest multiple
function roundToNearestMultiple(num, multiple) {
	return Math.round(num / multiple) * multiple;
}

// Scroll capture for news (desktop)
let newsScrollPos = 0;
let newsScrollDelta = 0;
let newsPrevScrollDelta = 0;
let newsThreshold = 50;
window.addEventListener('wheel', (event) => {
	newsScrollPos += event.deltaY;
	newsScrollDelta = Math.floor((newsScrollPos / newsThreshold)) * newsThreshold;

	const container = document.querySelector('.container');
	const news = document.querySelector('.news');
	if (window.innerWidth > 1030) {
		if (container.dataset.view == 'news') {
			if (newsPrevScrollDelta != newsScrollDelta) {
				if (event.deltaY > 0) {
					news.scrollTop += 14.4;
				} else {
					news.scrollTop -= 14.4;
				}
				news.scrollTop = roundToNearestMultiple(news.scrollTop, 14.4);
			}
		}
		newsPrevScrollDelta = newsScrollDelta;
	}
});

// Force news links to open in new tab
for (let newsLink of document.querySelectorAll('.news a')) {
	newsLink.addEventListener('click', (e) => {
		e.preventDefault();
		window.open(newsLink.href, '_blank').focus();
	})
}

// Force social links to open in new tab
for (let socialLink of document.querySelectorAll('.contact-block-social a')) {
	socialLink.addEventListener('click', (e) => {
		e.preventDefault();
		window.open(socialLink.href, '_blank').focus();
	})
}
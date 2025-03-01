const fs = require('fs'); // file management
const path = require('path'); // file paths
const axios = require('axios'); // download images
const sharp = require('sharp'); // image compression
const { marked } = require("marked"); // convert markdown to js
const { DOMParser } = require('xmldom'); // parse Simian XML data

// Site content
const content = require('./content.json');
const directors = content['directors'];

// Sort directors
directors.sort((a, b) => a.sorting.localeCompare(b.sorting));

// Current year
const year = new Date().getFullYear();

// Meta tags
const meta = `
	<meta name="author" content="SKIN & BONES">
	<meta name="keywords" content="Film Company, Production Partner, Storytellers, Female Owned, Shot Callers">
	<meta name="description" content="Skin and Bones is an award-winning director representation and production company that makes great work.">
	<meta property="og:url" content="https://smallsites.gdwithgd.com/">
	<meta name="og:title" property="og:title" content="SKIN & BONES">
	<meta property="og:description" content="Skin and Bones is an award-winning director representation and production company that makes great work.">
	<meta property="og:image" content="/assets/meta/opengraph.jpg">
`;

// Contact
let contactInfo = ''
for (let info of content['contact']) {
	contactInfo += `
		<div class="contact-block">
			<div class="contact-block-line"></div>
			<div>${info['name']}</div>
			<div>${info['phone']}</div>
			<div><a href="mailto:${info['email']}">${info['email']}</a></div>
		</div>
	`;
}

const contact = `
	<div class="contact">
		${contactInfo}
		<div class="contact-block contact-block-address">
			${marked(content['address'])}
		</div>
		<div class="contact-block contact-block-social">
			${marked(content['social'])}
		</div>
		<button class="contact-close" onclick="toggleContact();">[CLOSE]</button>
	</div>
`;

// Generate news
const newsData = content['news'];
let news = '';
newsData.sort((a, b) => a.sorting - b.sorting);
for (let newsItem of newsData) {
	if (!newsItem['active']) {
		continue
	}
	news += `
		<section class="news-block">
			<h3>${newsItem['title']}</h3>
			<p>${newsItem['date']}</p>
			<br>
			<p>
				${marked(newsItem['body'])}
			</p>
		</section>
	`;
}

// Function to download an image
async function downloadImage(url, filename, folder) {

	// Ensure directory exists
	if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });

	// Skip if compressed image already exists
	const filePath = path.join(folder, "thumbnail-"+filename);
	if (fs.existsSync(filePath)) {
		return
	}

	const response = await axios({ url, responseType: 'arraybuffer' });
	fs.writeFileSync(filePath, response.data);
	// console.log(`Downloaded: ${filename}`);

	// Compress file and overwrite original
	const compressedPath = path.join(folder, "thumbnail-"+filename);
	await sharp(filePath)
		.resize(800) // Resize width to 800px (adjust as needed)
		.toFormat('webp', { quality: 80 }) // Convert to WebP with 80% quality
		.toFile(compressedPath);
}

// Get client and project name using regular expression
const extractParts = (str) => {
	str = str.trim();
    const match = str.match(/^(.*)\s['"](.+?)['"]$/);
    return match ? [match[1], match[2]] : str;
};

// Get file name from URL
const getFilename = (url) => {
    const match = url.match(/\/([^\/?#]+)$/);
    return match ? match[1] : null;
};

// Fetch all content from Simian and generate JS object to track data
let directorsMedia = {};
async function generatePages() {
	const tasks = [];

	for (let director of directors) {
		if (!director['active']) {
			continue
		}

		tasks.push(
            new Promise(resolve => {

				const slug = director['slug'];
				const path = `./directors/${slug}/`;
				
				// Make folder for director
				if (!fs.existsSync(path)) fs.mkdirSync(path, { recursive: true });
		
				// Fetch XML data from Simian
				const RSS_URL = `https://skinandbonesfilm.gosimian.com/api/simian/mrss/${director['simian-id']}`;
				fetch(RSS_URL)
					.then(response => response.text())
					.then(str => new DOMParser().parseFromString(str, "text/xml"))
					.then(data => {
						// Navigate through media
						const items = Array.from(data.getElementsByTagName('item'));
						let media = [];
						for (let item of items) {
							
							const title = item.getElementsByTagName('title')[0]?.textContent || 'No title';
							const video = item.getElementsByTagNameNS('http://search.yahoo.com/mrss/', 'content')[0]?.getAttribute('url') || 'No video URL';
							const thumbnail = item.getElementsByTagNameNS('http://search.yahoo.com/mrss/', 'thumbnail')[0]?.getAttribute('url') || 'No thumbnail URL';
		
							const itemInfo = extractParts(title);
							let thumbnailFile = getFilename(thumbnail);
		
							// Download and compress media item
							downloadImage(thumbnail, thumbnailFile, path);
		
							// Add media item to director’s key in tracking object 
							if (typeof(itemInfo) == 'string') {
								media.push({
									"client": itemInfo,
									"project": '',
									"video-url": video.replace(/^http:/, "https:"),
									"thumbnail": `thumbnail-${thumbnailFile}`
								});
							} else {
								media.push({
									"client": itemInfo[0],
									"project": itemInfo[1],
									"video-url": video,
									"thumbnail": `thumbnail-${thumbnailFile}`
								});
							}
						}

						directorsMedia[slug] = media;
						
						// Generate individual page
						generateDirectorPortfolioPage(slug);
					
						resolve();
					})
            })
        );
	}

	await Promise.all(tasks); // Wait for all tasks to finish

	// Convert object to JS file
	fs.writeFile(`./assets/scripts/directors-media.js`, "const directorsMedia = " + JSON.stringify(directorsMedia), err => {
		if (err) {
			console.error(err);
		}
	});

	// Generate navs
	let navDirectors = '';
	let navMobile = '';
	let directorsMobile = '';
	let i=0;
	for (let entry of directors) {
		if (!entry['active']) {
			continue
		}
		let br = '';
		if (i < directors.length) {
			br = '<br>';
		}
		navDirectors += `<a href="/directors/${entry['slug']}" data-director="${entry['slug']}">${entry['name']}</a>${br}`;
		navMobile += `<a class="nav-mobile-links-director" href="/directors/${entry['slug']}">${entry['name']}</a>${br}`;
		directorsMobile += `${br}<a href="/directors/${entry['slug']}">${entry['name']}</a>`;
		i++;
	}

	// Generate main directors page
	let directorsHTML = `
		<!DOCTYPE html>
		<html lang="en">

		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>SKIN & BONES | DIRECTORS</title>
			<link rel="stylesheet" href="/assets/styles/style.css">
			<link rel="stylesheet" href="/assets/styles/directors.css">
			<link rel="icon" type="png" href="/assets/meta/favicon.png">

			${meta}
		</head>

		<body>
			
			<div class="container directors-container" data-view="default">
				<nav class="nav" data-page="directors">
					<p class="nav-logo"><a href="/">SKIN & BONES</a></p>
					<div class="nav-directors">
						${navDirectors}
					</div>
					<div class="nav-links">
						<a data-underline="1" class="nav-link-desktop" href="/directors/">DIRECTORS</a>
						<a class="nav-link-desktop" href="/about/">ABOUT</a>
						<button class="nav-link-desktop" onclick="toggleContact();">CONTACT</button>
						<button class="nav-open" onclick="toggleMenu();">MENU</button>
						<button class="nav-plus" onclick="toggleNews();"><svg width="13" height="13" viewBox="0 0 13 13"><path d="M6.05862 12.8008L6.05859 0.800782"/><path d="M12.0586 6.80075L0.0585942 6.80078"/></svg></button>
					</div>
					<div class="nav-mobile">
						<div class="nav-mobile-header">
							<p class="nav-logo"><a href="/">SKIN & BONES</a></p>
							<div class="nav-mobile-header-spacer"></div>
							<button class="nav-close" onclick="toggleMenu();">[CLOSE MENU]</button>
							<button class="nav-plus" onclick="toggleNews();"><svg width="13" height="13" viewBox="0 0 13 13"><path d="M6.05862 12.8008L6.05859 0.800782"/><path d="M12.0586 6.80075L0.0585942 6.80078"/></svg></button>
						</div>

						<div class="nav-mobile-links">
							<a data-underline="1" href="/directors/">DIRECTORS</a><br>
							<br>
							${navMobile}
							<br>
							<br>
							<a href="/about/">ABOUT</a>
							<br>
							<br>
							<button onclick="toggleContact();">CONTACT</button>
						</div>
					</div>
				</nav>

				<div class="directors-mobile">
					<p>DIRECTORS</p>
					${directorsMobile}
				</div>

				<main class="directors">
				</main>

				<div class="news">
					<div class="news-header-desktop">
						<h2 class="news-title">NEWS & ANNOUNCEMENTS</h2>
						<button class="news-close" onclick="toggleNews();"><svg width="13" height="13" viewBox="0 0 13 13"><path d="M12.0586 6.80075L0.0585942 6.80078"/></svg></button>
					</div>

					<div class="news-header-mobile">
						<div class="news-header-mobile-top">
							<a href="/">SKIN & BONES</a>
							<div class="news-header-mobile-top-spacer"></div>
							<button class="nav-link-open" onclick="toggleMenu();">MENU</button>
							<button class="news-mobile-close" onclick="toggleNews();"><svg width="13" height="13" viewBox="0 0 13 13"><path d="M12.0586 6.80075L0.0585942 6.80078"/></svg></button>
						</div>
						<h2 class="news-header-mobile-title">NEWS &<br>ANNOUNCEMENTS</h2>
					</div>

					${news}
				</div>

				${contact}
			</div>
			<script src="/assets/scripts/directors-media.js"></script>
			<script src="/assets/scripts/directors.js"></script>
			<script src="/assets/scripts/nav.js"></script>
		</body>

		</html>
	`;

	fs.writeFile(`./directors/index.html`, directorsHTML, err => {
		if (err) {
			console.error(err);
		}
	});

	// Generate about page
	generateAboutPage();

	// Generate home page
	generateHomePage();
}

// Generate individual pages for all directors
function generateDirectorPortfolioPage(director) {
	// Generate nav and fetch correct data
	let directorData = {};
	let navMobile = '';
	let i=0;
	for (let entry of directors) {
		if (!entry['active']) {
			continue
		}
		let br = '';
		if (i < directors.length-1) {
			br = '<br>';
		}
		if (entry['slug'] == director) {
			directorData = entry;
			navMobile += `<a data-underline="1" class="nav-mobile-links-director" href="/directors/${entry['slug']}">${entry['name']}</a>${br}`;
		} else {
			navMobile += `<a class="nav-mobile-links-director" href="/directors/${entry['slug']}">${entry['name']}</a>${br}`;
		}
		i++;
	}

	// Generate awards
	let awards = ''
	let awardsDesktop = '';
	let awardsMobile = '';
	for (let award of directorData['awards']) {
		awards += `<li>${award}</li>`;
	}
	if (awards.length > 0) {
		awardsDesktop = `
			<div class="director-portfolio-info-awards director-portfolio-info-awards-desktop">
				<h2 class="director-portfolio-info-awards-title">Awards</h2>
				<ul class="director-portfolio-info-awards-list">
					${awards}
				</ul>
			</div>
		`;
		awardsMobile = `
			<div class="director-portfolio-info-awards">
				<h2 class="director-portfolio-info-awards-title">Awards</h2>
				<ul class="director-portfolio-info-awards-list">
				${awards}
				</ul>
			</div>
		`;
	}

	// Generate portfolio items
	let portfolio = '';
	for (let media of directorsMedia[director]) {
		// console.log(media);
		portfolio += `
			<figure class="director-portfolio-work-item" onclick="openLightbox('${media['video-url']}', '${media['client'].replace(/'/g, "\\'")}', '${media['project'].replace(/'/g, "\\'")}');">
				<div class="director-portfolio-work-item-thumbnail" style="background-image: url('${media['thumbnail']}');">
					<div class="director-portfolio-work-item-thumbnail-hover">PLAY</div>
				</div>
				<figcaption class="director-portfolio-work-item-caption">
					<div class="director-portfolio-work-item-caption-line"></div>
					<h3 class="director-portfolio-work-item-caption-title">${media['client']}</h3>
					<p class="director-portfolio-work-item-caption-text">${media['project']}</p>
				</figcaption>
			</figure>
		`;
	}

	let directorPortfolioHTML = `
		<!DOCTYPE html>
		<html lang="en">

		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>SKIN & BONES | ${directorData['name'].toUpperCase()}</title>
			<link rel="stylesheet" href="/assets/styles/style.css">
			<link rel="stylesheet" href="/assets/styles/director-portfolio.css">
			<link rel="icon" type="png" href="/assets/meta/favicon.png">

			${meta}
		</head>

		<body>

			<div class="container director-portfolio-container" data-view="default">
				<nav class="nav">
					<p class="nav-logo"><a href="/">SKIN & BONES</a></p>
					<div class="nav-links">
						<a data-underline="1" class="nav-link-desktop" href="/directors/">DIRECTORS</a>
						<a class="nav-link-desktop" href="/about/">ABOUT</a>
						<button class="nav-link-desktop" onclick="toggleContact();">CONTACT</button>
						<button class="nav-open" onclick="toggleMenu();">MENU</button>
						<button class="nav-plus" onclick="toggleNews();"><svg width="13" height="13" viewBox="0 0 13 13"><path d="M6.05862 12.8008L6.05859 0.800782"/><path d="M12.0586 6.80075L0.0585942 6.80078"/></svg></button>
					</div>
					<div class="nav-mobile">
						<div class="nav-mobile-header">
							<p class="nav-logo"><a href="/">SKIN & BONES</a></p>
							<div class="nav-mobile-header-spacer"></div>
							<button class="nav-close" onclick="toggleMenu();">[CLOSE MENU]</button>
							<button class="nav-plus" onclick="toggleNews();"><svg width="13" height="13" viewBox="0 0 13 13"><path d="M6.05862 12.8008L6.05859 0.800782"/><path d="M12.0586 6.80075L0.0585942 6.80078"/></svg></button>
						</div>

						<div class="nav-mobile-links">
							<a data-underline="1" href="/directors/">DIRECTORS</a><br>
							<br>
							${navMobile}
							<br>
							<br>
							<a href="/about/">ABOUT</a>
							<br>
							<br>
							<button onclick="toggleContact();">CONTACT</button>
						</div>
					</div>
				</nav>

				<main class="director-portfolio">
					<section class="director-portfolio-info">
						<h1 class="director-portfolio-info-title">${directorData['name']}</h1>
						${directorData['bio']}
						${awardsDesktop}
					</section>

					<section class="director-portfolio-work">
						${portfolio}
					</section>

					<div class="director-portfolio-info-mobile">
						${awardsMobile}

						<a href="/directors/" class="director-portfolio-info-all">SEE ALL DIRECTORS <span>⟶</span></a>
					</div>

					<footer class="footer">
						© ${year} All rights reserved
					</footer>
				</main>

				<div class="director-portfolio-lightbox" data-active="0">
					<div class="director-portfolio-lightbox-media">
						<video autoplay playsinline class="director-portfolio-lightbox-media-video" onclick="toggleVideo();">
							<source>
						</video>
						<div class="director-portfolio-lightbox-media-playbar" onmousedown="setProgress(event);" ontouchstart="setProgress(event);">
							<div class="director-portfolio-lightbox-media-playbar-meter">
								<div class="director-portfolio-lightbox-media-playbar-meter-progress"></div>
							</div>
						</div>
					</div>
					<div class="director-portfolio-lightbox-right">
						<div class="director-portfolio-lightbox-controls-fullscreen director-portfolio-lightbox-controls-fullscreen-mobile" onclick="toggleFullscreen();">
							<div class="director-portfolio-lightbox-controls-fullscreen-circle"></div>
							<div>FULL SCREEN</div>
						</div>
						<button class="director-portfolio-lightbox-close" onclick="closeLightbox();">[CLOSE]</button>
						<div class="director-portfolio-lightbox-volume">
							<div class="director-portfolio-lightbox-volume-levels" onmousedown="setVolume(event);" ontouchstart="setVolume(event);">
								<div data-active="1"></div>
								<div data-active="1"></div>
								<div data-active="1"></div>
								<div data-active="1"></div>
								<div data-active="1"></div>
								<div data-active="1"></div>
								<div data-active="1"></div>
								<div data-active="1"></div>
								<div data-active="1"></div>
								<div data-active="1"></div>
								<div data-active="1"></div>
								<div data-active="1"></div>
							</div>
							<div class="director-portfolio-lightbox-volume-controls">
								<button class="director-portfolio-lightbox-volume-controls-up" onclick="volumeUp();">
									<svg width="13" height="13" viewBox="0 0 13 13"><path d="M6.05862 12.8008L6.05859 0.800782"/><path d="M12.0586 6.80075L0.0585942 6.80078"/></svg>
								</button>
								<button class="director-portfolio-lightbox-volume-controls-down" onclick="volumeDown();">
									<svg width="13" height="13" viewBox="0 0 13 13"><path d="M12.0586 6.80075L0.0585942 6.80078"/></svg>
								</button>
							</div>
						</div>
					</div>
					<div class="director-portfolio-lightbox-bottom">
						<div class="director-portfolio-lightbox-info">
							<div class="director-portfolio-lightbox-info-block">
								<div class="director-portfolio-lightbox-info-block-line"></div>
								<div class="director-portfolio-lightbox-info-block-title">DIRECTOR</div>
								<div class="director-portfolio-lightbox-info-block-text">${directorData['name']}</div>
							</div>
							<div class="director-portfolio-lightbox-info-block">
								<div class="director-portfolio-lightbox-info-block-line"></div>
								<div class="director-portfolio-lightbox-info-block-title" id="client"></div>
								<div class="director-portfolio-lightbox-info-block-text" id="project"></div>
							</div>
						</div>
						<div class="director-portfolio-lightbox-controls">
							<div class="director-portfolio-lightbox-controls-fullscreen director-portfolio-lightbox-controls-fullscreen-desktop" onclick="toggleFullscreen();">
								<div class="director-portfolio-lightbox-controls-fullscreen-circle"></div>
								<div>FULL SCREEN</div>
							</div>
							<div class="director-portfolio-lightbox-controls-play" data-active="1" onclick="playVideo();">
								<svg width="15" height="11" viewBox="0 0 15 11"><path d="M14.4197 5.34601L0.517615 10.3385L0.517615 0.353517L14.4197 5.34601Z"/></svg>
							</div>
							<div class="director-portfolio-lightbox-controls-pause" data-active="0" onclick="pauseVideo();">
								<svg width="9" height="12" viewBox="0 0 9 12"><line x1="1.95801" y1="0.794922" x2="1.95801" y2="11.1108" stroke-width="2"/><line x1="7.94189" y1="0.794922" x2="7.94189" y2="11.1108" stroke-width="2"/></svg>
							</div>
							<div class="director-portfolio-lightbox-controls-time">
								[<span class="director-portfolio-lightbox-controls-time-current">00:00</span> – <span class="director-portfolio-lightbox-controls-time-total">00:00</span>]
							</div>
						</div>
					</div>
				</div>

				<div class="news">
					<div class="news-header-desktop">
						<h2 class="news-title">NEWS & ANNOUNCEMENTS</h2>
						<button class="news-close" onclick="toggleNews();"><svg width="13" height="13" viewBox="0 0 13 13"><path d="M12.0586 6.80075L0.0585942 6.80078"/></svg></button>
					</div>

					<div class="news-header-mobile">
						<div class="news-header-mobile-top">
							<a href="/">SKIN & BONES</a>
							<div class="news-header-mobile-top-spacer"></div>
							<button class="nav-link-open" onclick="toggleMenu();">MENU</button>
							<button class="news-mobile-close" onclick="toggleNews();"><svg width="13" height="13" viewBox="0 0 13 13"><path d="M12.0586 6.80075L0.0585942 6.80078"/></svg></button>
						</div>
						<h2 class="news-header-mobile-title">NEWS &<br>ANNOUNCEMENTS</h2>
					</div>

					${news}
				</div>

				${contact}
			</div>

			<script src="/assets/scripts/director-portfolio.js"></script>
			<script src="/assets/scripts/nav.js"></script>
		</body>

		</html>
	`;

	fs.writeFile(`./directors/${director}/index.html`, directorPortfolioHTML, err => {
		if (err) {
			console.error(err);
		}
	});
}

function generateAboutPage() {
	// Generate nav
	let navMobile = '';
	let i=0;
	for (let entry of directors) {
		if (!entry['active']) {
			continue
		}
		let br = '';
		if (i < directors.length-1) {
			br = '<br>';
		}
		navMobile += `<a class="nav-mobile-links-director" href="/directors/${entry['slug']}">${entry['name']}</a>${br}`;
		i++;
	}

	// Generate images
	let aboutImages = '';
	let imageData = content['about-images'];
	imageData.sort((a, b) => a.sorting - b.sorting);
	for (let image of imageData) {
		aboutImages += `
			{
				"file": "${image['file']}",
				"text": "${image['caption']}"
			},
		`;
	}

	let aboutHTML = `
		<!DOCTYPE html>
		<html lang="en">

		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>SKIN & BONES | ABOUT</title>
			<link rel="stylesheet" href="/assets/styles/style.css">
			<link rel="stylesheet" href="/assets/styles/about.css">
			<link rel="icon" type="png" href="/assets/meta/favicon.png">

			${meta}
		</head>

		<body>

			<div class="container about-container" data-view="default">
				<nav class="nav">
					<p class="nav-logo"><a href="/">SKIN & BONES</a></p>
					<div class="nav-links">
						<a class="nav-link-desktop" href="/directors/">DIRECTORS</a>
						<a data-underline="1" class="nav-link-desktop" href="/about/">ABOUT</a>
						<button class="nav-link-desktop" onclick="toggleContact();">CONTACT</button>
						<button class="nav-open" onclick="toggleMenu();">MENU</button>
						<button class="nav-plus" onclick="toggleNews();"><svg width="13" height="13" viewBox="0 0 13 13"><path d="M6.05862 12.8008L6.05859 0.800782"/><path d="M12.0586 6.80075L0.0585942 6.80078"/></svg></button>
					</div>
					<div class="nav-mobile">
						<div class="nav-mobile-header">
							<p class="nav-logo"><a href="/">SKIN & BONES</a></p>
							<div class="nav-mobile-header-spacer"></div>
							<button class="nav-close" onclick="toggleMenu();">[CLOSE MENU]</button>
							<button class="nav-plus" onclick="toggleNews();"><svg width="13" height="13" viewBox="0 0 13 13"><path d="M6.05862 12.8008L6.05859 0.800782"/><path d="M12.0586 6.80075L0.0585942 6.80078"/></svg></button>
						</div>

						<div class="nav-mobile-links">
							<a href="/directors/">DIRECTORS</a><br>
							<br>
							${navMobile}
							<br>
							<br>
							<a href="/about/" data-underline="1">ABOUT</a>
							<br>
							<br>
							<button onclick="toggleContact();">CONTACT</button>
						</div>
					</div>
				</nav>

				<main class="about">
					<div class="about-media">
						<div class="about-media-images">
							<img class="about-media-big" src="${content['about-images'][0]['file']}">
							<img class="about-media-small" src="${content['about-images'][1]['file']}" onclick="nextImage();">
						</div>
						<div class="about-media-caption">
							<div class="about-media-caption-line"></div>
							<div class="about-media-caption-text">${content['about-images'][0]['caption']}</div>
						</div>
					</div>
					<div class="about-text">
						<div class="about-text-main">
							<p>
								${content['about-bio']}
							</p>
						</div>
						<button class="about-text-awards-title" data-active="0" onclick="toggleAwards();">
							<span>LIST OF AWARDS</span>
							<svg class="about-text-awards-title-open" width="13" height="13" viewBox="0 0 13 13"><path d="M6.05862 12.8008L6.05859 0.800782"/><path d="M12.0586 6.80075L0.0585942 6.80078"/></svg>
							<svg class="about-text-awards-title-close" width="13" height="13" viewBox="0 0 13 13"><path d="M12.0586 6.80075L0.0585942 6.80078"/></svg>
						</button>
						<div class="about-text-awards" data-active="0">
							${marked(content['about-awards'])}
						</div>

						<div class="about-text-footer-desktop">
							<div class="about-text-footer-desktop-credit">
								Website design by <a href="https://rebeccawilkinson.me/" target="_blank">Rebecca Wilkinson</a><br>
								Website development by <a href="https://noreplica.com/" target="_blank">No Replica</a><br>
							</div>
							<div>© ${year} All rights reserved</div>
						</div>
					</div>

					<div class="about-text-footer-mobile">
						<div class="about-text-footer-mobile-credit">
							Website design by <a href="https://rebeccawilkinson.me/" target="_blank">Rebecca Wilkinson</a><br>
							Website development by <a href="https://noreplica.com/" target="_blank">No Replica</a><br>
						</div>
						<div>© ${year} All rights reserved</div>
					</div>
				</main>

				<div class="news">
					<div class="news-header-desktop">
						<h2 class="news-title">NEWS & ANNOUNCEMENTS</h2>
						<button class="news-close" onclick="toggleNews();"><svg width="13" height="13" viewBox="0 0 13 13"><path d="M12.0586 6.80075L0.0585942 6.80078"/></svg></button>
					</div>

					<div class="news-header-mobile">
						<div class="news-header-mobile-top">
							<a href="/">SKIN & BONES</a>
							<div class="news-header-mobile-top-spacer"></div>
							<button class="nav-link-open" onclick="toggleMenu();">MENU</button>
							<button class="news-mobile-close" onclick="toggleNews();"><svg width="13" height="13" viewBox="0 0 13 13"><path d="M12.0586 6.80075L0.0585942 6.80078"/></svg></button>
						</div>
						<h2 class="news-header-mobile-title">NEWS &<br>ANNOUNCEMENTS</h2>
					</div>

					${news}
				</div>

				${contact}
			</div>

			<script>
				let aboutImages = [
					${aboutImages}
				];
			</script>

			<script src="/assets/scripts/about.js"></script>
			<script src="/assets/scripts/nav.js"></script>
		</body>

		</html>
	`;

	fs.writeFile(`./about/index.html`, aboutHTML, err => {
		if (err) {
			console.error(err);
		}
	});
}

function generateHomePage() {
	// Generate nav and homeVideos variable
	let navMobile = '';
	let homeVideos = '';
	let i=0;
	for (let entry of directors) {
		if (!entry['active']) {
			continue
		}

		homeVideos += `["${entry['home-image']}", "${entry['home-video']}", "${entry['slug']}"], `;

		let br = '';
		if (i < directors.length-1) {
			br = '<br>';
		}
		navMobile += `<a class="nav-mobile-links-director" href="/directors/${entry['slug']}">${entry['name']}</a>${br}`;
		i++;
	}

	let homeHTML = `
		<!DOCTYPE html>
		<html lang="en">

		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>SKIN & BONES</title>
			<link rel="stylesheet" href="/assets/styles/style.css">
			<link rel="stylesheet" href="/assets/styles/home.css">
			<link rel="icon" type="png" href="/assets/meta/favicon.png">

			${meta}

			<!-- Netlify identity widget -->
			<script src="https://identity.netlify.com/v1/netlify-identity-widget.js"></script>
		</head>

		<body>

			<div class="container" data-view="default">
				<nav class="nav">
					<p class="nav-logo"><a href="/">SKIN & BONES</a></p>
					<div class="nav-links">
						<a class="nav-link-desktop" href="/directors/">DIRECTORS</a>
						<a class="nav-link-desktop" href="/about/">ABOUT</a>
						<button class="nav-link-desktop" onclick="toggleContact();">CONTACT</button>
						<button class="nav-open" onclick="toggleMenu();">MENU</button>
						<button class="nav-plus" onclick="toggleNews();"><svg width="13" height="13" viewBox="0 0 13 13"><path d="M6.05862 12.8008L6.05859 0.800782"/><path d="M12.0586 6.80075L0.0585942 6.80078"/></svg></button>
					</div>
					<div class="nav-mobile">
						<div class="nav-mobile-header">
							<p class="nav-logo"><a href="/">SKIN & BONES</a></p>
							<div class="nav-mobile-header-spacer"></div>
							<button class="nav-close" onclick="toggleMenu();">[CLOSE MENU]</button>
							<button class="nav-plus" onclick="toggleNews();"><svg width="13" height="13" viewBox="0 0 13 13"><path d="M6.05862 12.8008L6.05859 0.800782"/><path d="M12.0586 6.80075L0.0585942 6.80078"/></svg></button>
						</div>

						<div class="nav-mobile-links">
							<a href="/directors/">DIRECTORS</a><br>
							<br>
							${navMobile}
							<br>
							<br>
							<a href="/about/">ABOUT</a>
							<br>
							<br>
							<button onclick="toggleContact();">CONTACT</button>
						</div>
					</div>
				</nav>

				<main class="home">
					<div class="home-column">
						<div class="home-cell-text">
							<div>FILM COMPANY</div>
							<div>FILM COMPANY</div>
							<div></div>
							<div>FILM COMPANY</div>
							<div>FILM COMPANY</div>
							<div></div>
							<div>FILM COMPANY</div>
						</div>
						<div class="home-cell-text">
							<div></div>
							<div></div>
							<div>FILM COMPANY</div>
							<div>FILM COMPANY</div>
							<div></div>
							<div></div>
							<div>FILM COMPANY</div>
						</div>
						<div class="home-cell-text">
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
						</div>
						<div class="home-cell-text">
							<div></div>
							<div>FILM COMPANY</div>
							<div></div>
							<div>FILM COMPANY</div>
							<div>FILM COMPANY</div>
							<div></div>
							<div>FILM COMPANY</div>
						</div>
						<div class="home-cell-text">
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
						</div>
						<div class="home-cell-text">
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
						</div>
						<div class="home-cell-text">
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
						</div>
					</div>

					<div class="home-column">
						<div class="home-cell-text">
							<div>WHO WE ARE</div>
							<div></div>
							<div>Skin and Bones is an award-winning</div>
							<div>director representation and</div>
							<div>production company that makes</div>
							<div>great work.</div>
							<div></div>
						</div>
						<div class="home-cell-text">
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
						</div>
						<a class="home-cell-video" id="home-video-small-1" href="/directors/">
							<video autoplay muted playsinline loop disableremoteplayback class="desktop-video">
								<source>
							</video>
						</a>
						<div class="home-cell-text">
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
						</div>
						<div class="home-cell-text">
							<div></div>
							<div>HOW WE DO IT</div>
							<div></div>
							<div>We balance intense-passion with</div>
							<div>sensible-chill and it seems to be</div>
							<div>working pretty well so far.</div>
							<div></div>
						</div>
						<div class="home-cell-text">
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
						</div>
						<div class="home-cell-text">
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
						</div>
					</div>

					<div class="home-column">
						<div class="home-cell-text">
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
						</div>
						<div class="home-cell-text">
							<div></div>
							<div></div>
							<div></div>
							<div>WHAT WE DO</div>
							<div></div>
							<div>We make work for brands, business</div>
							<div>and anyone with a story to tell.</div>
						</div>
						<div class="home-cell-text">
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
						</div>
						<div class="home-cell-text">
							<div></div>
							<div></div>
							<div></div>
							<div>WHY WE DO IT</div>
							<div></div>
							<div>We love it. Even when we don’t,</div>
							<div>we still do.</div>
						</div>
						<div class="home-cell-text">
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
						</div>
						<div class="home-cell-text">
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
						</div>
						<div class="home-cell-text">
							<div></div>
							<div></div>
							<div></div>
							<div>WHO ARE YOU</div>
							<div></div>
							<div>And why are you still</div>
							<div>reading this?</div>
						</div>
					</div>

					<div class="home-column">
						<a class="home-cell-video-large" id="home-video-large" href="/directors/">
							<video autoplay muted playsinline loop disableremoteplayback class="desktop-video">
								<source>
							</video>
						</a>
						<div class="home-cell-empty">
						</div>
						<div class="home-cell-text">
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
						</div>
						<div class="home-cell-text">
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
						</div>
						<a class="home-cell-video" id="home-video-small-2" href="/directors/">
							<video autoplay muted playsinline loop disableremoteplayback class="desktop-video">
								<source>
							</video>
						</a>
						<div class="home-cell-text">
							<div></div>
							<div></div>
							<div>WHO WE DO IT WITH</div>
							<div></div>
							<div>Some of the best in the business</div>
							<div></div>
							<div></div>
						</div>
						<div class="home-cell-text">
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
						</div>
					</div>

					<div class="home-column">
						<div class="home-cell-empty">
						</div>
						<div class="home-cell-empty">
						</div>
						<div class="home-cell-text">
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
						</div>
						<div class="home-cell-text">
							<div></div>
							<div></div>
							<div>WHERE WE ARE</div>
							<div></div>
							<div>In the heart of one of Toronto’s</div>
							<div>most vibrant districts. We fit</div>
							<div>right in.</div>
						</div>
						<div class="home-cell-text">
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
						</div>
						<div class="home-cell-text">
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div>WHEN WE DO IT</div>
							<div></div>
							<div>Whenever we’re needed.</div>
						</div>
						<div class="home-cell-text">
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
						</div>
					</div>

					<div class="home-column">
						<div class="home-cell-text">
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
						</div>
						<div class="home-cell-text">
							<div>PRODUCTION PARTNER</div>
							<div>PRODUCTION PARTNER</div>
							<div></div>
							<div>PRODUCTION PARTNER</div>
							<div></div>
							<div></div>
							<div>PRODUCTION PARTNER</div>
						</div>
						<div class="home-cell-text">
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
						</div>
						<div class="home-cell-text">
							<div></div>
							<div>FILM COMPANY</div>
							<div></div>
							<div>FILM COMPANY</div>
							<div>FILM COMPANY</div>
							<div></div>
							<div>FILM COMPANY</div>
						</div>
						<div class="home-cell-text">
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
						</div>
						<div class="home-cell-text">
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div></div>
						</div>
						<div class="home-cell-text">
							<div></div>
							<div></div>
							<div>SHOT CALLERS</div>
							<div></div>
							<div>SHOT CALLERS</div>
							<div>SHOT CALLERS</div>
							<div>SHOT CALLERS</div>
						</div>
					</div>
				</main>

				<div class="home-mobile">
					<a class="home-mobile-video-large" id="home-mobile-video-large" href="/directors/">
						<video autoplay muted playsinline loop disableremoteplayback class="mobile-video">
							<source>
						</video>
					</a>
					<div class="home-mobile-span">
						<div class="home-mobile-text" data-mobile="group1">
							<div></div>
							<div>FILM COMPANY</div>
							<div></div>
							<div>FILM COMPANY</div>
							<div>FILM COMPANY</div>
						</div>
					</div>
					<div class="home-mobile-span">
						<div class="home-mobile-text" data-mobile="group1">
							<div></div>
							<div>FILM COMPANY</div>
							<div>FILM COMPANY</div>
							<div></div>
							<div></div>
						</div>
					</div>
					<div class="home-mobile-2col-left">
						<div class="home-mobile-text" data-mobile="group1">
							<div>FILM COMPANY</div>
							<div></div>
							<div></div>
							<div>FILM COMPANY</div>
							<div></div>
						</div>
						<a class="home-mobile-video-small" id="home-mobile-video-small-1" href="/directors/">
							<video autoplay muted playsinline loop disableremoteplayback class="mobile-video">
								<source>
							</video>
						</a>
					</div>
					<div class="home-mobile-text home-mobile-span">
						<div>WHO WE ARE</div>
						<div></div>
						<div>Skin and Bones is an award-winning</div>
						<div>director representation and production</div>
						<div>company that makes great work.</div>
					</div>
					<div class="home-mobile-2col">
						<div></div>
						<div class="home-mobile-text" data-mobile="group2">
							<div></div>
							<div>PRODUCTION PARTNER</div>
							<div></div>
							<div>PRODUCTION PARTNER</div>
							<div>PRODUCTION PARTNER</div>
						</div>
					</div>
					<div class="home-mobile-2col-right">
						<a class="home-mobile-video-small" id="home-mobile-video-small-2" href="/directors/">
							<video autoplay muted playsinline loop disableremoteplayback class="mobile-video">
								<source>
							</video>
						</a>
						<div class="home-mobile-text" data-mobile="group2">
							<div></div>
							<div>PRODUCTION PARTNER</div>
							<div>PRODUCTION PARTNER</div>
							<div></div>
							<div>PRODUCTION PARTNER</div>
						</div>
					</div>
					<div class="home-mobile-text home-mobile-span">
						<div>WHAT WE DO</div>
						<div></div>
						<div>We make work for brands, business and</div>
						<div>anyone with a story to tell.</div>
						<div></div>
					</div>
					<div class="home-mobile-2col">
						<div class="home-mobile-text" data-mobile="group3">
							<div>SHOT CALLERS</div>
							<div></div>
							<div></div>
							<div>SHOT CALLERS</div>
							<div>SHOT CALLERS</div>
						</div>
						<div></div>
					</div>
					<div class="home-mobile-2col-left">
						<div class="home-mobile-text" data-mobile="group3">
							<div></div>
							<div>SHOT CALLERS</div>
							<div>SHOT CALLERS</div>
							<div>SHOT CALLERS</div>
							<div></div>
						</div>
						<a class="home-mobile-video-small" id="home-mobile-video-small-3" href="/directors/">
							<video autoplay muted playsinline loop disableremoteplayback class="mobile-video">
								<source>
							</video>
						</a>
					</div>
					<div class="home-mobile-text home-mobile-span">
						<div>WHY WE DO IT</div>
						<div></div>
						<div>We love it. Even when we don’t,</div>
						<div>we still do.</div>
						<div></div>
					</div>
					<div class="home-mobile-2col">
						<div></div>
						<div class="home-mobile-text" data-mobile="group4">
							<div></div>
							<div>STORYTELLERS</div>
							<div>STORYTELLERS</div>
							<div></div>
							<div>STORYTELLERS</div>
						</div>
					</div>
					<div class="home-mobile-2col-right">
						<a class="home-mobile-video-small" id="home-mobile-video-small-4" href="/directors/">
							<video autoplay muted playsinline loop disableremoteplayback class="mobile-video">
								<source>
							</video>
						</a>
						<div class="home-mobile-text" data-mobile="group4">
							<div>STORYTELLERS</div>
							<div></div>
							<div>STORYTELLERS</div>
							<div>STORYTELLERS</div>
							<div></div>
						</div>
					</div>
					<div class="home-mobile-text home-mobile-span">
						<div>WHERE WE ARE</div>
						<div></div>
						<div>In the heart of one of Toronto’s most</div>
						<div>vibrant districts. We fit right in.</div>
						<div></div>
					</div>
					<div class="home-mobile-2col">
						<div class="home-mobile-text" data-mobile="group5">
							<div>HIGH CONCEPT</div>
							<div></div>
							<div>HIGH CONCEPT</div>
							<div>HIGH CONCEPT</div>
							<div>HIGH CONCEPT</div>
						</div>
						<div></div>
					</div>
					<div class="home-mobile-2col-left">
						<div class="home-mobile-text" data-mobile="group5">
							<div>HIGH CONCEPT</div>
							<div>HIGH CONCEPT</div>
							<div>HIGH CONCEPT</div>
							<div>HIGH CONCEPT</div>
							<div>HIGH CONCEPT</div>
						</div>
						<a class="home-mobile-video-small" id="home-mobile-video-small-5" href="/directors/">
							<video autoplay muted playsinline loop disableremoteplayback class="mobile-video">
								<source>
							</video>
						</a>
					</div>
					<div class="home-mobile-text home-mobile-span">
						<div>WHEN WE DO IT</div>
						<div></div>
						<div>Whenever we’re needed.</div>
						<div></div>
						<div></div>
					</div>
					<div class="home-mobile-2col">
						<div></div>
						<div class="home-mobile-text" data-mobile="group6">
							<div></div>
							<div>CREATORS</div>
							<div></div>
							<div></div>
							<div>CREATORS</div>
						</div>
					</div>
					<div class="home-mobile-2col-right">
						<a class="home-mobile-video-small" id="home-mobile-video-small-6" href="/directors/">
							<video autoplay muted playsinline loop disableremoteplayback class="mobile-video">
								<source>
							</video>
						</a>
						<div class="home-mobile-text" data-mobile="group6">
							<div></div>
							<div></div>
							<div>CREATORS</div>
							<div>CREATORS</div>
							<div>CREATORS</div>
						</div>
					</div>
					<div class="home-mobile-text home-mobile-span">
						<div>HOW WE DO IT</div>
						<div></div>
						<div>We balance intense-passion with sensible</div>
						<div>chill and it seems to be working pretty</div>
						<div>well so far.</div>
					</div>
					<div class="home-mobile-2col">
						<div class="home-mobile-text" data-mobile="group7">
							<div>HEAVY LIFTERS</div>
							<div></div>
							<div>HEAVY LIFTERS</div>
							<div>HEAVY LIFTERS</div>
							<div>HEAVY LIFTERS</div>
						</div>
						<div></div>
					</div>
					<div class="home-mobile-2col-left">
						<div class="home-mobile-text" data-mobile="group7">
							<div></div>
							<div>HEAVY LIFTERS</div>
							<div>HEAVY LIFTERS</div>
							<div>HEAVY LIFTERS</div>
							<div>HEAVY LIFTERS</div>
						</div>
						<a class="home-mobile-video-small" id="home-mobile-video-small-7" href="/directors/">
							<video autoplay muted playsinline loop disableremoteplayback class="mobile-video">
								<source>
							</video>
						</a>
					</div>
					<div class="home-mobile-text home-mobile-span">
						<div>WHO WE DO IT WITH</div>
						<div></div>
						<div>Some of the best in the business.</div>
						<div></div>
						<div></div>
					</div>
					<div class="home-mobile-2col">
						<div></div>
						<div class="home-mobile-text" data-mobile="group8">
							<div></div>
							<div>FILM COMPANY</div>
							<div></div>
							<div>FILM COMPANY</div>
							<div></div>
						</div>
					</div>
					<div class="home-mobile-2col-right">
						<a class="home-mobile-video-small" id="home-mobile-video-small-8" href="/directors/">
							<video autoplay muted playsinline loop disableremoteplayback class="mobile-video">
								<source>
							</video>
						</a>
						<div class="home-mobile-text" data-mobile="group8">
							<div></div>
							<div></div>
							<div></div>
							<div></div>
							<div>FILM COMPANY</div>
						</div>
					</div>
					<div class="home-mobile-text home-mobile-span">
						<div>WHO ARE YOU</div>
						<div></div>
						<div>And why are you still reading this?</div>
						<div></div>
						<div></div>
					</div>
				</div>

				<div class="news">
					<div class="news-header-desktop">
						<h2 class="news-title">NEWS & ANNOUNCEMENTS</h2>
						<button class="news-close" onclick="toggleNews();"><svg width="13" height="13" viewBox="0 0 13 13"><path d="M12.0586 6.80075L0.0585942 6.80078"/></svg></button>
					</div>

					<div class="news-header-mobile">
						<div class="news-header-mobile-top">
							<a href="/">SKIN & BONES</a>
							<div class="news-header-mobile-top-spacer"></div>
							<button class="nav-link-open" onclick="toggleMenu();">MENU</button>
							<button class="news-mobile-close" onclick="toggleNews();"><svg width="13" height="13" viewBox="0 0 13 13"><path d="M12.0586 6.80075L0.0585942 6.80078"/></svg></button>
						</div>
						<h2 class="news-header-mobile-title">NEWS &<br>ANNOUNCEMENTS</h2>
					</div>

					${news}
				</div>

				${contact}
			</div>

			<script>
				const homeVideos = [${homeVideos}];
			</script>

			<script src="/assets/scripts/home.js"></script>
			<script src="/assets/scripts/nav.js"></script>

			<script>
				if (window.netlifyIdentity) {
					window.netlifyIdentity.on("init", (user) => {
					if (!user) {
						window.netlifyIdentity.on("login", () => {
						document.location.href = "/admin/";
						});
					}
					});
				}
			</script>
		</body>

		</html>
	`;

	fs.writeFile(`./index.html`, homeHTML, err => {
		if (err) {
			console.error(err);
		}
	});
}

generatePages();
const sampleImages = [
  './assets/ux-display/0y8vLSS9pqIkvnb7.png',
  './assets/ux-samples/SdwD0OzyTssplcgW.png',
  './assets/ux-samples/UsONhL2AKCENq1SP.png',
  './assets/ux-samples/fjtXe8MoewuV5aS4.gif',
  './assets/ux-samples/hTsrbz46woXtF1yo.gif',
  './assets/ux-samples/lv41crwJb0tu8eVn.png',
  './assets/ux-samples/rYfjqQYPBzxrxJJz.png',
];
const sampleLabels = sampleImages.map((_, index) => `UX sample ${index + 1}`);

const imageEl = document.querySelector('#sample-image');
const thumbs = Array.from(document.querySelectorAll('.sample-thumb'));

function renderSample(index) {
  imageEl.src = sampleImages[index];
  imageEl.alt = `${sampleLabels[index]} from Jocelyn Remington's portfolio`;

  thumbs.forEach((thumb, thumbIndex) => {
    thumb.classList.toggle('is-active', thumbIndex === index);
    thumb.setAttribute('aria-pressed', thumbIndex === index ? 'true' : 'false');
  });
}

thumbs.forEach((thumb, index) => {
  thumb.addEventListener('click', () => renderSample(index));
});

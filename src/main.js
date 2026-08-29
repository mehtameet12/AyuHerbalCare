import './styles/main.css';

import { initNav } from './scripts/nav.js';
import { initReveal } from './scripts/reveal.js';
import { initForm } from './scripts/form.js';
import { initCarousel } from './scripts/carousel.js';

initNav();
initReveal();
initForm();
initCarousel();

// Keeps the copyright year correct without a redeploy.
const year = document.getElementById('year');
if (year) year.textContent = String(new Date().getFullYear());

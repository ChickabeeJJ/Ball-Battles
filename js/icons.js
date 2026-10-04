// Inline SVG icons (no emoji: they render differently on every OS).
(function () {
  const BB = (window.BB = window.BB || {});
  const svg = (d, vb) => `<svg class="ico" viewBox="${vb || '0 0 24 24'}" aria-hidden="true">${d}</svg>`;
  BB.ICON = {
    trophy: svg('<path fill="currentColor" d="M7 3h10v2h3v3a4 4 0 0 1-4 4h-.3A5 5 0 0 1 13 14.9V17h3v2H8v-2h3v-2.1A5 5 0 0 1 8.3 12H8a4 4 0 0 1-4-4V5h3V3zm0 4H6v1a2 2 0 0 0 1.2 1.8A5 5 0 0 1 7 8.5V7zm10 0v1.5c0 .5-.1.9-.2 1.3A2 2 0 0 0 18 8V7h-1zM6 20h12v2H6z"/>'),
    swords: svg('<path fill="currentColor" d="M3 3l7.4 7.4-1.4 1.4L4.6 7.4 3 3zm18 0l-3.6 7.4-6.7 6.7 1.4 1.4-1.4 1.4-2.1-2.1-2.8 2.8-1.4-1.4 2.8-2.8-2.1-2.1 1.4-1.4 1.4 1.4 6.7-6.7L21 3zM14.6 13.6l5.8 5.8-1.4 1.4-5.8-5.8 1.4-1.4z"/>'),
    scroll: svg('<path fill="currentColor" d="M6 3h11a3 3 0 0 1 3 3v1h-3v11a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3v-1h3V6a3 3 0 0 1 1-2.2V3zm2 2a1 1 0 0 0-1 1v12h7a1 1 0 0 0 1-1V6a3 3 0 0 1 .2-1H8zm1 3h5v2H9V8zm0 4h5v2H9v-2z"/>'),
    play: svg('<path fill="currentColor" d="M7 4l13 8-13 8z"/>'),
    restart: svg('<path fill="currentColor" d="M12 4a8 8 0 1 1-7.7 10h2.1A6 6 0 1 0 12 6v3L7 5l5-4v3z"/>'),
    gear: svg('<path fill="currentColor" d="M19.4 13a7.6 7.6 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.4 7.4 0 0 0-1.7-1L15 3h-4l-.4 2.6a7.4 7.4 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.6 7.6 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1a7.4 7.4 0 0 0 1.7 1L11 21h4l.4-2.6a7.4 7.4 0 0 0 1.7-1l2.5 1 2-3.5zM13 15.5A3.5 3.5 0 1 1 13 8.5a3.5 3.5 0 0 1 0 7z"/>'),
    home: svg('<path fill="currentColor" d="M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3z"/>'),
    star: svg('<path fill="currentColor" d="M12 2l3 6.6 7.2.8-5.4 4.9 1.5 7.1L12 17.8 5.7 21.4l1.5-7.1L1.8 9.4 9 8.6z"/>'),
    video: svg('<path fill="currentColor" d="M3 6h12a2 2 0 0 1 2 2v1.5l4-2.5v10l-4-2.5V16a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"/>'),
  };
})();

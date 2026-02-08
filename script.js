// script.js
        let currentQueue = [];
        let originalQueue = [];
        let currentIndex = -1;
        let isPlaying = false;
        let isShuffle = false;
        let repeatMode = 0; 

        const audio = document.getElementById('audio-engine');
        const playBtn = document.getElementById('btn-play-pause');
        const mainPlayBtn = document.getElementById('main-play-btn');
        const playPauseIcon = document.getElementById('play-pause-icon');
        const mainPlayIcon = document.getElementById('main-play-icon');
        const progressFill = document.getElementById('progress-fill');
        const volumeFill = document.getElementById('volume-fill');
        const songListContainer = document.getElementById('song-list-container');

        function init() {
            parseSongsFromHTML();
            setupEventListeners();
            audio.volume = 0.8;
            volumeFill.style.width = '80%';
        }

        function parseSongsFromHTML() {
            const songElements = songListContainer.querySelectorAll('.song-row');
            currentQueue = [];
            
            songElements.forEach((el, index) => {
                const songData = {
                    id: el.dataset.id,
                    title: el.dataset.title,
                    artist: el.dataset.artist,
                    album: el.dataset.album,
                    duration: el.dataset.duration,
                    cover: el.dataset.cover,
                    src: el.dataset.src
                };
                currentQueue.push(songData);

                el.innerHTML = `
                    <span class="font-bold opacity-30">${index + 1}</span>
                    <div class="flex items-center gap-4 truncate">
                        <img src="${songData.cover}" onerror="this.src='https://via.placeholder.com/40?text=Art'" class="w-10 h-10 rounded-xl shadow-md object-cover flex-shrink-0">
                        <div class="flex flex-col truncate">
                            <span class="text-white font-semibold truncate text-sm md:text-base">${songData.title}</span>
                            <span class="text-xs text-slate-500 truncate">${songData.artist}</span>
                        </div>
                    </div>
                    <span class="hidden md:block truncate text-slate-400 text-sm">${songData.album}</span>
                    <span class="flex justify-end pr-2 text-xs font-bold text-slate-500">${songData.duration}</span>
                `;

                el.onclick = () => playSong(index);
            });

            originalQueue = [...currentQueue];
            document.getElementById('song-count-badge').innerText = `${currentQueue.length} tracks`;
        }

        async function playSong(index) {
            if (index < 0 || index >= currentQueue.length) return;
            
            currentIndex = index;
            const song = currentQueue[currentIndex];
            
            updateUI(song);
            updateActiveRow();
            
            audio.pause();
            audio.src = song.src;
            audio.load();
            
            try {
                await audio.play();
                isPlaying = true;
                updatePlayIcons();
            } catch (error) {
                console.warn("Playback failed. Please ensure your folder structure is correct and you use a local server.", error);
                isPlaying = false;
                updatePlayIcons();
            }
        }

        function updateActiveRow() {
            const rows = songListContainer.querySelectorAll('.song-row');
            rows.forEach((row, i) => {
                row.classList.toggle('active', i === currentIndex);
            });
        }

        function togglePlay() {
            if (currentIndex === -1) {
                playSong(0);
                return;
            }

            if (isPlaying) {
                audio.pause();
                isPlaying = false;
            } else {
                audio.play().catch(e => console.error("Play error:", e));
                isPlaying = true;
            }
            updatePlayIcons();
        }

        function updatePlayIcons() {
            const pausePath = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
            const playPath = '<path d="M8 5v14l11-7z"/>';
            const currentPath = isPlaying ? pausePath : playPath;
            playPauseIcon.innerHTML = currentPath;
            mainPlayIcon.innerHTML = currentPath;
        }

        function updateUI(song) {
            document.getElementById('player-song-title').innerText = song.title;
            document.getElementById('player-artist-name').innerText = song.artist;
            const art = document.getElementById('player-album-art');
            art.src = song.cover;
            art.onerror = () => { art.src = 'https://via.placeholder.com/64?text=Art'; };
        }

        function nextSong() {
            let nextIdx = currentIndex + 1;
            if (nextIdx >= currentQueue.length) {
                nextIdx = (repeatMode === 1) ? 0 : -1;
            }
            if (nextIdx !== -1) playSong(nextIdx);
        }

        function prevSong() {
            let prevIdx = currentIndex - 1;
            if (prevIdx < 0) {
                prevIdx = (repeatMode === 1) ? currentQueue.length - 1 : 0;
            }
            if (prevIdx !== -1) playSong(prevIdx);
        }

        function shuffleQueue() {
            if (isShuffle) {
                for (let i = currentQueue.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [currentQueue[i], currentQueue[j]] = [currentQueue[j], currentQueue[i]];
                }
            } else {
                currentQueue = [...originalQueue];
            }
            updateActiveRow();
        }

        function setupEventListeners() {
            playBtn.onclick = togglePlay;
            mainPlayBtn.onclick = togglePlay;
            document.getElementById('btn-next').onclick = nextSong;
            document.getElementById('btn-prev').onclick = prevSong;

            document.getElementById('btn-shuffle').onclick = (e) => {
                isShuffle = !isShuffle;
                e.currentTarget.classList.toggle('active', isShuffle);
                shuffleQueue();
            };

            document.getElementById('btn-repeat').onclick = (e) => {
                repeatMode = (repeatMode + 1) % 3;
                e.currentTarget.classList.toggle('active', repeatMode > 0);
                e.currentTarget.style.color = repeatMode === 2 ? '#818cf8' : ''; 
            };

            audio.ontimeupdate = () => {
                if (audio.duration) {
                    const pct = (audio.currentTime / audio.duration) * 100;
                    progressFill.style.width = pct + '%';
                    document.getElementById('current-time').innerText = format(audio.currentTime);
                    document.getElementById('duration').innerText = format(audio.duration);
                }
            };

            audio.onended = () => {
                if (repeatMode === 2) {
                    audio.currentTime = 0;
                    audio.play();
                } else {
                    nextSong();
                }
            };

            document.getElementById('progress-container').onclick = (e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pos = (e.clientX - rect.left) / rect.width;
                if (audio.duration) audio.currentTime = pos * audio.duration;
            };

            document.getElementById('volume-container').onclick = (e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const vol = (e.clientX - rect.left) / rect.width;
                audio.volume = Math.max(0, Math.min(1, vol));
                volumeFill.style.width = (vol * 100) + '%';
            };
        }

        function format(s) {
            if (isNaN(s)) return "0:00";
            const m = Math.floor(s / 60);
            const sec = Math.floor(s % 60);
            return `${m}:${sec < 10 ? '0' : ''}${sec}`;
        }

        window.onload = init;
    